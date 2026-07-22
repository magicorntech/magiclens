import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { writeAuditLog } from '@magiclens/audit'
import { normalizeEmail } from '@magiclens/auth'
import { TeamRole } from '@magiclens/database'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'

class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string
}

class PatchTeamDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string
}

class AddMemberDto {
  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole

  @IsOptional()
  @IsString()
  policyId?: string
}

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.team.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { kubeconfigs: true } }
      },
      orderBy: { name: 'asc' }
    })
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateTeamDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const team = await this.prisma.client.team.create({
      data: {
        organizationId: membership.organizationId,
        name: body.name,
        description: body.description,
        createdByUserId: user.id,
        members: { create: { userId: user.id, role: 'ADMIN' } }
      }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'team.create',
      result: 'success',
      resourceType: 'team',
      resourceName: team.name
    })
    return team
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    const team = await this.prisma.client.team.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        kubeconfigs: { include: { kubeconfig: true } },
        vpnProfiles: { include: { vpnProfile: true } },
        packages: { include: { package: true } },
        policies: { include: { policy: true } }
      }
    })
    if (!team) throw new NotFoundException('Team not found')
    return team
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PatchTeamDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.team.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: { name: body.name, description: body.description }
    }).then(async () =>
      this.prisma.client.team.findUniqueOrThrow({ where: { id } })
    )
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.team.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: { deletedAt: new Date() }
    })
    return { ok: true }
  }

  @Post(':id/members')
  async addMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AddMemberDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const team = await this.prisma.client.team.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!team) throw new NotFoundException('Team not found')

    let targetUserId = body.userId
    if (!targetUserId && body.email) {
      const normalized = normalizeEmail(body.email)
      const found = await this.prisma.client.user.findUnique({ where: { normalizedEmail: normalized } })
      if (!found) throw new NotFoundException('No user registered with this email')
      const orgMember = await this.prisma.client.organizationMember.findFirst({
        where: {
          organizationId: membership.organizationId,
          userId: found.id,
          status: 'ACTIVE'
        }
      })
      if (!orgMember) {
        throw new BadRequestException('User must be an organization member first (invite them)')
      }
      targetUserId = found.id
    }
    if (!targetUserId) throw new BadRequestException('userId or email is required')

    const member = await this.prisma.client.teamMember.upsert({
      where: { teamId_userId: { teamId: id, userId: targetUserId } },
      create: { teamId: id, userId: targetUserId, role: body.role ?? 'MEMBER' },
      update: { role: body.role ?? 'MEMBER' }
    })

    if (body.policyId) {
      const policy = await this.prisma.client.permissionPolicy.findFirst({
        where: { id: body.policyId, organizationId: membership.organizationId }
      })
      if (policy) {
        await this.prisma.client.userPermissionPolicy.upsert({
          where: {
            userId_permissionPolicyId: { userId: targetUserId, permissionPolicyId: policy.id }
          },
          create: { userId: targetUserId, permissionPolicyId: policy.id },
          update: {}
        })
      }
    }

    return member
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.teamMember.deleteMany({ where: { teamId: id, userId } })
    return { ok: true }
  }
}
