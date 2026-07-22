import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'
import { decryptSecret, encryptSecret } from '@magiclens/encryption'
import { writeAuditLog } from '@magiclens/audit'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { notifyUsers } from '../common/notify'
import { PrismaService } from '../prisma/prisma.service'

class CreateVpnDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  provider?: string

  @IsOptional()
  @IsString()
  serverHost?: string

  @IsOptional()
  @IsString()
  protocol?: string

  @IsOptional()
  @IsString()
  config?: string
}

class PatchVpnDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  provider?: string

  @IsOptional()
  @IsString()
  serverHost?: string

  @IsOptional()
  @IsString()
  protocol?: string

  @IsOptional()
  @IsString()
  config?: string
}

class AssignVpnUserDto {
  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsEmail()
  email?: string
}

class AssignVpnTeamDto {
  @IsString()
  teamId!: string
}

@ApiTags('vpn-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vpn-profiles')
export class VpnProfilesController {
  constructor(
    @Inject(OrgContextService) private readonly orgContext: OrgContextService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  private async teamIdsFor(userId: string): Promise<string[]> {
    return (
      await this.prisma.client.teamMember.findMany({ where: { userId }, select: { teamId: true } })
    ).map((t) => t.teamId)
  }

  private async canAccessVpn(
    user: AuthUser,
    vpnProfileId: string,
    membership: Awaited<ReturnType<OrgContextService['requireMembership']>>
  ): Promise<boolean> {
    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN'
    if (isAdmin) return true
    const direct = await this.prisma.client.userVpnProfile.findFirst({
      where: { vpnProfileId, userId: user.id }
    })
    if (direct) return true
    const teamIds = await this.teamIdsFor(user.id)
    if (teamIds.length === 0) return false
    const team = await this.prisma.client.teamVpnProfile.findFirst({
      where: { vpnProfileId, teamId: { in: teamIds } }
    })
    return !!team
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN'
    const teamIds = await this.teamIdsFor(user.id)
    const rows = await this.prisma.client.vpnProfile.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
        ...(isAdmin
          ? {}
          : {
              OR: [
                { users: { some: { userId: user.id } } },
                { teams: { some: { teamId: { in: teamIds } } } }
              ]
            })
      },
      include: {
        users: { include: { user: { select: { id: true, name: true, email: true } } } },
        teams: { include: { team: { select: { id: true, name: true } } } }
      },
      orderBy: { name: 'asc' }
    })
    return rows.map((row) => {
      const { encryptedConfig, encryptedDataKey, ...safe } = row
      return {
        ...safe,
        hasConfig: !!(encryptedConfig && encryptedDataKey)
      }
    })
  }

  @Get(':id/config')
  async getConfig(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    const allowed = await this.canAccessVpn(user, id, membership)
    if (!allowed) throw new ForbiddenException('VPN profile is not assigned to you')

    const vpn = await this.prisma.client.vpnProfile.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null, status: 'ACTIVE' }
    })
    if (!vpn) throw new NotFoundException('VPN profile not found')
    if (!vpn.encryptedConfig || !vpn.encryptedDataKey) {
      throw new NotFoundException('VPN profile has no config content')
    }

    const config = decryptSecret(
      vpn.encryptedConfig,
      vpn.encryptedDataKey,
      this.config.getOrThrow('ENCRYPTION_MASTER_KEY')
    )

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'vpn.config.download',
      result: 'success',
      resourceType: 'vpn',
      resourceName: vpn.name
    })

    return {
      id: vpn.id,
      name: vpn.name,
      provider: vpn.provider,
      description: vpn.description,
      serverHost: vpn.serverHost,
      protocol: vpn.protocol,
      config,
      updatedAt: vpn.updatedAt
    }
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateVpnDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    let encryptedConfig: string | undefined
    let encryptedDataKey: string | undefined
    if (body.config) {
      const enc = encryptSecret(body.config, this.config.getOrThrow('ENCRYPTION_MASTER_KEY'))
      encryptedConfig = enc.encryptedContent
      encryptedDataKey = enc.encryptedDataKey
    }
    const created = await this.prisma.client.vpnProfile.create({
      data: {
        organizationId: membership.organizationId,
        name: body.name,
        description: body.description,
        provider: body.provider ?? 'generic',
        serverHost: body.serverHost,
        protocol: body.protocol,
        encryptedConfig,
        encryptedDataKey,
        createdByUserId: user.id
      }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'vpn.create',
      result: 'success',
      resourceType: 'vpn',
      resourceName: created.name
    })
    const { encryptedConfig: _c, encryptedDataKey: _k, ...safe } = created
    return { ...safe, hasConfig: !!body.config }
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PatchVpnDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const existing = await this.prisma.client.vpnProfile.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!existing) throw new NotFoundException('VPN profile not found')

    let encryptedConfig = existing.encryptedConfig
    let encryptedDataKey = existing.encryptedDataKey
    if (body.config) {
      const enc = encryptSecret(body.config, this.config.getOrThrow('ENCRYPTION_MASTER_KEY'))
      encryptedConfig = enc.encryptedContent
      encryptedDataKey = enc.encryptedDataKey
    }

    return this.prisma.client.vpnProfile.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        provider: body.provider,
        serverHost: body.serverHost,
        protocol: body.protocol,
        encryptedConfig,
        encryptedDataKey
      }
    }).then((updated) => {
      const { encryptedConfig: _c, encryptedDataKey: _k, ...safe } = updated
      return { ...safe, hasConfig: !!(updated.encryptedConfig && updated.encryptedDataKey) }
    })
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.vpnProfile.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: { deletedAt: new Date(), status: 'DISABLED' }
    })
    return { ok: true }
  }

  @Post(':id/users')
  async assignUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AssignVpnUserDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const vpn = await this.prisma.client.vpnProfile.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!vpn) throw new NotFoundException('VPN profile not found')

    let targetUserId = body.userId
    if (!targetUserId && body.email) {
      const normalized = body.email.trim().toLowerCase()
      const found = await this.prisma.client.user.findFirst({
        where: { normalizedEmail: normalized }
      })
      if (!found) throw new NotFoundException('User not found for email')
      const orgMember = await this.prisma.client.organizationMember.findFirst({
        where: {
          organizationId: membership.organizationId,
          userId: found.id,
          status: 'ACTIVE'
        }
      })
      if (!orgMember) throw new NotFoundException('User is not an organization member')
      targetUserId = found.id
    }
    if (!targetUserId) throw new NotFoundException('userId or email required')

    const assignment = await this.prisma.client.userVpnProfile.upsert({
      where: { userId_vpnProfileId: { userId: targetUserId, vpnProfileId: id } },
      create: { userId: targetUserId, vpnProfileId: id },
      update: {}
    })

    await notifyUsers(this.prisma.client, {
      userIds: [targetUserId],
      organizationId: membership.organizationId,
      type: 'vpn.assigned',
      title: 'VPN profile assigned',
      body: `${vpn.name} was assigned to your account`,
      resourceType: 'vpn',
      resourceId: vpn.id
    })

    return assignment
  }

  @Post(':id/teams')
  async assignTeam(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AssignVpnTeamDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const vpn = await this.prisma.client.vpnProfile.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!vpn) throw new NotFoundException('VPN profile not found')

    const team = await this.prisma.client.team.findFirst({
      where: { id: body.teamId, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!team) throw new NotFoundException('Team not found')

    const assignment = await this.prisma.client.teamVpnProfile.upsert({
      where: { teamId_vpnProfileId: { teamId: body.teamId, vpnProfileId: id } },
      create: { teamId: body.teamId, vpnProfileId: id },
      update: {}
    })

    const members = await this.prisma.client.teamMember.findMany({
      where: { teamId: body.teamId },
      select: { userId: true }
    })
    await notifyUsers(this.prisma.client, {
      userIds: members.map((m) => m.userId),
      organizationId: membership.organizationId,
      type: 'vpn.assigned',
      title: 'VPN profile shared with your team',
      body: `${vpn.name} was assigned to team ${team.name}`,
      resourceType: 'vpn',
      resourceId: vpn.id
    })

    return assignment
  }

  @Delete(':id/teams/:teamId')
  async unassignTeam(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('teamId') teamId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.teamVpnProfile.deleteMany({ where: { vpnProfileId: id, teamId } })
    return { ok: true }
  }

  @Delete(':id/users/:userId')
  async unassignUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.userVpnProfile.deleteMany({ where: { vpnProfileId: id, userId } })
    return { ok: true }
  }
}
