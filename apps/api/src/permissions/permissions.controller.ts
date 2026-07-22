import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator'
import { evaluatePermission } from '@magiclens/permissions'
import type { OrganizationRole } from '@magiclens/shared-types'
import { PolicyEffect, ScopeType } from '@magiclens/database'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'

class CreatePolicyDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsEnum(PolicyEffect)
  effect!: PolicyEffect

  @IsOptional()
  @IsEnum(ScopeType)
  scopeType?: ScopeType

  @IsOptional()
  @IsString()
  clusterId?: string

  @IsOptional()
  @IsString()
  namespacePattern?: string

  @IsOptional()
  @IsString()
  resourceKind?: string

  @IsArray()
  actions!: string[]

  @IsOptional()
  @IsInt()
  priority?: number
}

class CheckPermissionDto {
  @IsString()
  action!: string

  @IsOptional()
  @IsString()
  resourceKind?: string

  @IsOptional()
  @IsString()
  namespace?: string

  @IsOptional()
  @IsString()
  clusterId?: string

  @IsOptional()
  clusterAssigned?: boolean

  @IsOptional()
  kubernetesRbacAllowed?: boolean
}

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permission-policies')
export class PermissionsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.permissionPolicy.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }]
    })
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreatePolicyDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.permissionPolicy.create({
      data: {
        organizationId: membership.organizationId,
        name: body.name,
        description: body.description,
        effect: body.effect,
        scopeType: body.scopeType ?? ScopeType.ORGANIZATION,
        clusterId: body.clusterId,
        namespacePattern: body.namespacePattern,
        resourceKind: body.resourceKind,
        actionsJson: body.actions,
        priority: body.priority ?? 100,
        createdByUserId: user.id
      }
    })
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CreatePolicyDto) {
    await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.permissionPolicy.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        effect: body.effect,
        scopeType: body.scopeType,
        clusterId: body.clusterId,
        namespacePattern: body.namespacePattern,
        resourceKind: body.resourceKind,
        actionsJson: body.actions,
        priority: body.priority
      }
    })
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.permissionPolicy.delete({ where: { id } })
    return { ok: true }
  }

  @Post('check')
  async check(@CurrentUser() user: AuthUser, @Body() body: CheckPermissionDto) {
    const membership = await this.orgContext.requireMembership(user.id)
    const me = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } })
    const policies = await this.prisma.client.permissionPolicy.findMany({
      where: { organizationId: membership.organizationId }
    })

    return evaluatePermission({
      userStatus: me.status,
      orgRole: membership.role as OrganizationRole,
      clusterAssigned: body.clusterAssigned ?? true,
      action: body.action,
      resourceKind: body.resourceKind,
      namespace: body.namespace,
      clusterId: body.clusterId,
      kubernetesRbacAllowed: body.kubernetesRbacAllowed,
      policies: policies.map((p) => ({
        effect: p.effect,
        actions: Array.isArray(p.actionsJson) ? (p.actionsJson as string[]) : [],
        resourceKind: p.resourceKind,
        namespacePattern: p.namespacePattern,
        clusterId: p.clusterId,
        priority: p.priority
      }))
    })
  }
}

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EffectivePermissionsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get('users/:id/effective-permissions')
  async userEffective(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.orgContext.requireAdmin(user.id)
    const membership = await this.orgContext.requireMembership(user.id)
    const direct = await this.prisma.client.userPermissionPolicy.findMany({
      where: { userId: id },
      include: { policy: true }
    })
    const teams = await this.prisma.client.teamMember.findMany({
      where: { userId: id },
      include: { team: { include: { policies: { include: { policy: true } } } } }
    })
    const orgPolicies = await this.prisma.client.permissionPolicy.findMany({
      where: { organizationId: membership.organizationId, scopeType: 'ORGANIZATION' }
    })
    return {
      direct: direct.map((d) => d.policy),
      team: teams.flatMap((t) => t.team.policies.map((p) => p.policy)),
      organization: orgPolicies
    }
  }

  @Get('teams/:id/effective-permissions')
  async teamEffective(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.orgContext.requireAdmin(user.id)
    const policies = await this.prisma.client.teamPermissionPolicy.findMany({
      where: { teamId: id },
      include: { policy: true }
    })
    return policies.map((p) => p.policy)
  }
}
