import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Inject
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { generateTemporaryPassword, hashPassword, normalizeEmail } from '@magiclens/auth'
import { writeAuditLog } from '@magiclens/audit'
import { AuthProvider, OrganizationRole, PolicyEffect, ScopeType, UserStatus } from '@magiclens/database'
import { canAssignRole, canPromoteToAdmin } from '@magiclens/permissions'
import type { OrganizationRole as OrgRole } from '@magiclens/shared-types'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'

const ACCESS_HIDE_PREFIX = '[Hide] '
const ACCESS_HIDE_DESC = 'magiclens:access:hide'

class PatchUserDto {
  @IsOptional()
  @IsString()
  name?: string
}

class RoleDto {
  @IsEnum(OrganizationRole)
  role!: OrganizationRole
}

class TeamAssignDto {
  @IsString()
  teamId!: string
}

class CreateUserDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole
}

class AccessProfileDto {
  @IsIn(['full', 'readonly', 'custom'])
  mode!: 'full' | 'readonly' | 'custom'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenResourceKinds?: string[]

  /** When mode=custom: false → READ_ONLY role, true → MEMBER */
  @IsOptional()
  @IsBoolean()
  writeAccess?: boolean
}

class AssignPolicyDto {
  @IsString()
  policyId!: string
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject(OrgContextService) private readonly orgContext: OrgContextService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QueueService) private readonly queues: QueueService
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.organizationMember.findMany({
      where: {
        organizationId: membership.organizationId,
        status: { not: 'REMOVED' },
        ...(q
          ? {
              user: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } }
                ]
              }
            }
          : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            avatarUrl: true,
            lastLoginAt: true,
            mustChangePassword: true
          }
        }
      }
    })
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateUserDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const role = body.role ?? OrganizationRole.MEMBER
    if (role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot create OWNER via this endpoint')
    }
    const actorRole = membership.role as OrgRole
    if ((role === OrganizationRole.ADMIN) && !canPromoteToAdmin(actorRole)) {
      throw new ForbiddenException('Cannot promote to ADMIN/OWNER')
    }
    if (!canAssignRole(actorRole, role as OrgRole)) {
      throw new ForbiddenException('Privilege escalation denied')
    }

    const normalized = normalizeEmail(body.email)
    const tempPassword = generateTemporaryPassword()
    const passwordHash = hashPassword(tempPassword)

    const result = await this.prisma.client.$transaction(async (tx) => {
      let target = await tx.user.findUnique({ where: { normalizedEmail: normalized } })
      if (!target) {
        target = await tx.user.create({
          data: {
            name: body.name?.trim() || body.email.split('@')[0]!,
            email: body.email.trim(),
            normalizedEmail: normalized,
            provider: AuthProvider.LOCAL,
            providerId: `local:${normalized}`,
            passwordHash,
            mustChangePassword: true,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date()
          }
        })
      } else {
        const existingMember = await tx.organizationMember.findFirst({
          where: {
            organizationId: membership.organizationId,
            userId: target.id,
            status: 'ACTIVE'
          }
        })
        if (existingMember) {
          throw new ConflictException('User is already an organization member')
        }
        await tx.user.update({
          where: { id: target.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            status: UserStatus.ACTIVE
          }
        })
      }

      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId: target.id
          }
        },
        create: {
          organizationId: membership.organizationId,
          userId: target.id,
          role,
          status: 'ACTIVE',
          invitedByUserId: user.id,
          joinedAt: new Date()
        },
        update: {
          role,
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      })

      return target
    })

    await this.queues.enqueueCredentialsEmail({
      type: 'credentials',
      to: result.email,
      name: result.name,
      organizationName: membership.organization.name,
      temporaryPassword: tempPassword,
      mustChangePassword: true
    })

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.create',
      result: 'success',
      resourceType: 'user',
      resourceName: result.email
    })

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role,
      ...(process.env.NODE_ENV === 'development' ? { temporaryPassword: tempPassword } : {})
    }
  }

  @Post(':id/reset-password')
  async resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const target = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id },
      include: { user: true }
    })
    if (!target) throw new ForbiddenException('User is not a member')

    const tempPassword = generateTemporaryPassword()
    await this.prisma.client.user.update({
      where: { id },
      data: {
        passwordHash: hashPassword(tempPassword),
        mustChangePassword: true
      }
    })
    await this.prisma.client.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() }
    })

    await this.queues.enqueueCredentialsEmail({
      type: 'credentials',
      to: target.user.email,
      name: target.user.name,
      organizationName: membership.organization.name,
      temporaryPassword: tempPassword,
      mustChangePassword: true
    })

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.password.reset',
      result: 'success',
      resourceType: 'user',
      resourceName: target.user.email
    })

    return {
      ok: true,
      ...(process.env.NODE_ENV === 'development' ? { temporaryPassword: tempPassword } : {})
    }
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            avatarUrl: true,
            lastLoginAt: true,
            createdAt: true,
            mustChangePassword: true
          }
        }
      }
    })
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PatchUserDto) {
    await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.user.update({
      where: { id },
      data: { name: body.name },
      select: { id: true, name: true, email: true, status: true }
    })
  }

  @Post(':id/enable')
  async enable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const updated = await this.prisma.client.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.enable',
      result: 'success',
      resourceType: 'user',
      resourceName: updated.email
    })
    return { id: updated.id, status: updated.status }
  }

  @Post(':id/disable')
  async disable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    if (id === user.id) throw new ForbiddenException('Cannot disable yourself')
    const updated = await this.prisma.client.user.update({
      where: { id },
      data: { status: UserStatus.DISABLED }
    })
    await this.prisma.client.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.disable',
      result: 'success',
      resourceType: 'user',
      resourceName: updated.email
    })
    return { id: updated.id, status: updated.status }
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    if (id === user.id) throw new ForbiddenException('Cannot remove yourself')

    const target = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id }
    })
    if (!target) return { ok: true }

    if (target.role === OrganizationRole.OWNER) {
      const owners = await this.prisma.client.organizationMember.count({
        where: {
          organizationId: membership.organizationId,
          role: OrganizationRole.OWNER,
          status: 'ACTIVE'
        }
      })
      if (owners <= 1) {
        throw new ForbiddenException('Cannot remove the last active owner')
      }
    }

    await this.prisma.client.organizationMember.update({
      where: { id: target.id },
      data: { status: 'REMOVED' }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.remove',
      result: 'success',
      resourceType: 'user',
      resourceName: id
    })
    return { ok: true }
  }

  @Post(':id/roles')
  async assignRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: RoleDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const actorRole = membership.role as OrgRole
    const targetRole = body.role as OrgRole

    if ((targetRole === 'ADMIN' || targetRole === 'OWNER') && !canPromoteToAdmin(actorRole)) {
      throw new ForbiddenException('Cannot promote to ADMIN/OWNER')
    }
    if (!canAssignRole(actorRole, targetRole)) {
      throw new ForbiddenException('Privilege escalation denied')
    }

    if (targetRole === OrganizationRole.OWNER && actorRole !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can transfer ownership')
    }

    const target = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id }
    })
    if (!target) throw new ForbiddenException('User is not a member')

    if (target.role === OrganizationRole.OWNER && body.role !== OrganizationRole.OWNER) {
      const owners = await this.prisma.client.organizationMember.count({
        where: {
          organizationId: membership.organizationId,
          role: OrganizationRole.OWNER,
          status: 'ACTIVE'
        }
      })
      if (owners <= 1) {
        throw new ForbiddenException('Cannot remove the last active owner')
      }
    }

    const updated = await this.prisma.client.organizationMember.update({
      where: { id: target.id },
      data: { role: body.role }
    })

    if (body.role === OrganizationRole.OWNER) {
      await this.prisma.client.organization.update({
        where: { id: membership.organizationId },
        data: { ownerUserId: id }
      })
    }

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.role.assign',
      result: 'success',
      resourceType: 'user',
      resourceName: id,
      metadata: { role: body.role }
    })
    return updated
  }

  @Post(':id/teams')
  async addTeam(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: TeamAssignDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const team = await this.prisma.client.team.findFirst({
      where: { id: body.teamId, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!team) throw new ForbiddenException('Team not found')
    return this.prisma.client.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: id } },
      create: { teamId: team.id, userId: id, role: 'MEMBER' },
      update: {}
    })
  }

  @Delete(':id/teams/:teamId')
  async removeTeam(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('teamId') teamId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.teamMember.deleteMany({ where: { teamId, userId: id } })
    return { ok: true }
  }

  @Post(':id/revoke-sessions')
  async revokeSessions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.sessions.revoke',
      result: 'success',
      resourceType: 'user',
      resourceName: id
    })
    return { ok: true }
  }

  @Get(':id/access-profile')
  async getAccessProfile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const member = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id, status: { not: 'REMOVED' } }
    })
    if (!member) throw new ForbiddenException('User is not a member')

    const links = await this.prisma.client.userPermissionPolicy.findMany({
      where: { userId: id },
      include: { policy: true }
    })
    const hidePolicies = links.filter(
      (l) =>
        l.policy.description === ACCESS_HIDE_DESC || l.policy.name.startsWith(ACCESS_HIDE_PREFIX)
    )
    const hiddenResourceKinds = hidePolicies
      .map((l) => l.policy.resourceKind)
      .filter((k): k is string => !!k)

    let mode: 'full' | 'readonly' | 'custom' = 'full'
    if (hiddenResourceKinds.length > 0) mode = 'custom'
    else if (member.role === OrganizationRole.READ_ONLY) mode = 'readonly'

    return {
      mode,
      role: member.role,
      writeAccess: member.role !== OrganizationRole.READ_ONLY,
      hiddenResourceKinds,
      policies: links.map((l) => l.policy)
    }
  }

  @Post(':id/access-profile')
  async setAccessProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AccessProfileDto
  ) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const member = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id, status: { not: 'REMOVED' } }
    })
    if (!member) throw new ForbiddenException('User is not a member')

    // Never downgrade OWNER/ADMIN via access profile
    const privileged =
      member.role === OrganizationRole.OWNER || member.role === OrganizationRole.ADMIN

    if (!privileged) {
      let nextRole: OrganizationRole = OrganizationRole.MEMBER
      if (body.mode === 'readonly') nextRole = OrganizationRole.READ_ONLY
      else if (body.mode === 'custom') {
        nextRole = body.writeAccess === false ? OrganizationRole.READ_ONLY : OrganizationRole.MEMBER
      }
      await this.prisma.client.organizationMember.update({
        where: { id: member.id },
        data: { role: nextRole }
      })
    }

    // Detach previous MagicLens hide policies for this user
    const existing = await this.prisma.client.userPermissionPolicy.findMany({
      where: { userId: id },
      include: { policy: true }
    })
    const hideLinkIds = existing
      .filter(
        (l) =>
          l.policy.description === ACCESS_HIDE_DESC || l.policy.name.startsWith(ACCESS_HIDE_PREFIX)
      )
      .map((l) => l.id)
    if (hideLinkIds.length) {
      await this.prisma.client.userPermissionPolicy.deleteMany({
        where: { id: { in: hideLinkIds } }
      })
    }

    const hidden =
      body.mode === 'custom'
        ? [...new Set((body.hiddenResourceKinds ?? []).map((k) => k.trim()).filter(Boolean))]
        : []

    for (const kind of hidden) {
      const name = `${ACCESS_HIDE_PREFIX}${kind}`
      const policy = await this.prisma.client.permissionPolicy.upsert({
        where: {
          organizationId_name: {
            organizationId: membership.organizationId,
            name
          }
        },
        create: {
          organizationId: membership.organizationId,
          name,
          description: ACCESS_HIDE_DESC,
          effect: PolicyEffect.DENY,
          scopeType: ScopeType.USER,
          resourceKind: kind,
          actionsJson: ['*'],
          priority: 10,
          createdByUserId: user.id
        },
        update: {
          effect: PolicyEffect.DENY,
          resourceKind: kind,
          actionsJson: ['*'],
          description: ACCESS_HIDE_DESC,
          priority: 10
        }
      })
      await this.prisma.client.userPermissionPolicy.upsert({
        where: {
          userId_permissionPolicyId: { userId: id, permissionPolicyId: policy.id }
        },
        create: { userId: id, permissionPolicyId: policy.id },
        update: {}
      })
    }

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'user.access-profile.set',
      result: 'success',
      resourceType: 'user',
      resourceName: id,
      metadata: { mode: body.mode, hiddenResourceKinds: hidden, writeAccess: body.writeAccess }
    })

    return this.getAccessProfile(user, id)
  }

  @Post(':id/permission-policies')
  async assignPolicy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AssignPolicyDto
  ) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const member = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: membership.organizationId, userId: id }
    })
    if (!member) throw new ForbiddenException('User is not a member')
    const policy = await this.prisma.client.permissionPolicy.findFirst({
      where: { id: body.policyId, organizationId: membership.organizationId }
    })
    if (!policy) throw new ForbiddenException('Policy not found')
    return this.prisma.client.userPermissionPolicy.upsert({
      where: {
        userId_permissionPolicyId: { userId: id, permissionPolicyId: policy.id }
      },
      create: { userId: id, permissionPolicyId: policy.id },
      update: {}
    })
  }

  @Delete(':id/permission-policies/:policyId')
  async unassignPolicy(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('policyId') policyId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.userPermissionPolicy.deleteMany({
      where: { userId: id, permissionPolicyId: policyId }
    })
    return { ok: true }
  }
}
