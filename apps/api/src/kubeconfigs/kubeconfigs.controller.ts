import {
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
import { ConfigService } from '@nestjs/config'
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { encryptSecret, decryptSecret } from '@magiclens/encryption'
import { writeAuditLog } from '@magiclens/audit'
import { KubeconfigVisibility } from '@magiclens/database'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'
import { notifyUsers } from '../common/notify'

class CreateKubeconfigDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(KubeconfigVisibility)
  visibility?: KubeconfigVisibility

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  serverEndpoint?: string

  @IsOptional()
  @IsString()
  environment?: string

  @IsOptional()
  @IsArray()
  tags?: string[]
}

class PatchKubeconfigDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(KubeconfigVisibility)
  visibility?: KubeconfigVisibility

  @IsOptional()
  @IsString()
  serverEndpoint?: string

  @IsOptional()
  @IsString()
  environment?: string
}

class AssignTeamDto {
  @IsString()
  teamId!: string
}

@ApiTags('kubeconfigs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kubeconfigs')
export class KubeconfigsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService, @Inject(QueueService) private readonly queues: QueueService, @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  private async teamIdsFor(userId: string): Promise<string[]> {
    return (
      await this.prisma.client.teamMember.findMany({ where: { userId }, select: { teamId: true } })
    ).map((t) => t.teamId)
  }

  private async findAccessibleKubeconfig(
    user: AuthUser,
    id: string,
    membership: Awaited<ReturnType<OrgContextService['requireMembership']>>
  ) {
    const teamIds = await this.teamIdsFor(user.id)
    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN'
    return this.prisma.client.kubeconfig.findFirst({
      where: {
        id,
        organizationId: membership.organizationId,
        deletedAt: null,
        status: 'ACTIVE',
        OR: [
          { ownerUserId: user.id },
          { visibility: 'ORGANIZATION' },
          { visibility: 'TEAM', teams: { some: { teamId: { in: teamIds } } } },
          ...(isAdmin ? [{}] : [])
        ]
      },
      include: { teams: { include: { team: true } } }
    })
  }

  private mapKubeconfigSummary(row: {
    id: string
    name: string
    description: string | null
    visibility: string
    serverEndpoint: string | null
    environment: string | null
    tagsJson: unknown
    status: string
    createdAt: Date
    updatedAt: Date
    encryptedContent: string | null
    encryptedDataKey: string | null
  }) {
    const { encryptedContent, encryptedDataKey, ...safe } = row
    return {
      ...safe,
      hasConfig: !!(encryptedContent && encryptedDataKey)
    }
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    const teamIds = await this.teamIdsFor(user.id)
    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN'

    const rows = await this.prisma.client.kubeconfig.findMany({
      where: {
        organizationId: membership.organizationId,
        deletedAt: null,
        OR: [
          { ownerUserId: user.id },
          { visibility: 'ORGANIZATION' },
          { visibility: 'TEAM', teams: { some: { teamId: { in: teamIds } } } },
          ...(isAdmin ? [{}] : [])
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        serverEndpoint: true,
        environment: true,
        tagsJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        encryptedContent: true,
        encryptedDataKey: true
      },
      orderBy: { name: 'asc' }
    })

    return rows.map((row) => this.mapKubeconfigSummary(row))
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateKubeconfigDto) {
    const membership = await this.orgContext.requireMembership(user.id)
    const visibility = body.visibility ?? 'PERSONAL'
    if (visibility !== 'PERSONAL') {
      await this.orgContext.requireAdmin(user.id)
    }

    let encryptedContent: string | undefined
    let encryptedDataKey: string | undefined
    if (body.content) {
      const master = this.config.getOrThrow('ENCRYPTION_MASTER_KEY')
      const enc = encryptSecret(body.content, master)
      encryptedContent = enc.encryptedContent
      encryptedDataKey = enc.encryptedDataKey
    }

    const created = await this.prisma.client.kubeconfig.create({
      data: {
        organizationId: membership.organizationId,
        ownerUserId: user.id,
        createdByUserId: user.id,
        name: body.name,
        description: body.description,
        visibility,
        encryptedContent,
        encryptedDataKey,
        serverEndpoint: body.serverEndpoint,
        environment: body.environment,
        tagsJson: body.tags ?? [],
        contextsJson: []
      }
    })

    await this.queues.get('kubeconfig-validation').add('validate', {
      kubeconfigId: created.id
    })

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'kubeconfig.create',
      result: 'success',
      resourceType: 'kubeconfig',
      resourceName: created.name
    })

    return {
      id: created.id,
      name: created.name,
      visibility: created.visibility,
      status: created.status,
      hasConfig: !!(encryptedContent && encryptedDataKey)
    }
  }

  @Get(':id/config')
  async getConfig(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    const item = await this.findAccessibleKubeconfig(user, id, membership)
    if (!item) throw new NotFoundException('Kubeconfig not found')
    if (!item.encryptedContent || !item.encryptedDataKey) {
      throw new NotFoundException('Kubeconfig has no credential content')
    }

    const content = decryptSecret(
      item.encryptedContent,
      item.encryptedDataKey,
      this.config.getOrThrow('ENCRYPTION_MASTER_KEY')
    )

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'kubeconfig.config.download',
      result: 'success',
      resourceType: 'kubeconfig',
      resourceName: item.name
    })

    const { encryptedContent: _c, encryptedDataKey: _k, teams, ...safe } = item
    return {
      ...safe,
      hasConfig: true,
      content,
      teams: teams.map((t) => ({ id: t.team.id, name: t.team.name }))
    }
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    const item = await this.findAccessibleKubeconfig(user, id, membership)
    if (!item) throw new NotFoundException('Kubeconfig not found')
    const { encryptedContent, encryptedDataKey, ...safe } = item
    return {
      ...safe,
      hasConfig: !!(encryptedContent && encryptedDataKey)
    }
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PatchKubeconfigDto) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.kubeconfig.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        visibility: body.visibility,
        serverEndpoint: body.serverEndpoint,
        environment: body.environment
      }
    })
    return this.get(user, id)
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.kubeconfig.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DISABLED' }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'kubeconfig.delete',
      result: 'success',
      resourceType: 'kubeconfig',
      resourceName: id
    })
    return { ok: true }
  }

  @Post(':id/test')
  async test(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.orgContext.requireMembership(user.id)
    await this.queues.get('kubeconfig-validation').add('validate', { kubeconfigId: id })
    return { queued: true }
  }

  @Post(':id/rotate')
  async rotate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { content: string }) {
    await this.orgContext.requireAdmin(user.id)
    const master = this.config.getOrThrow('ENCRYPTION_MASTER_KEY')
    const enc = encryptSecret(body.content, master)
    await this.prisma.client.kubeconfig.update({
      where: { id },
      data: {
        encryptedContent: enc.encryptedContent,
        encryptedDataKey: enc.encryptedDataKey,
        status: 'ACTIVE'
      }
    })
    return { ok: true }
  }

  @Post(':id/teams')
  async assignTeam(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AssignTeamDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const kube = await this.prisma.client.kubeconfig.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!kube) throw new NotFoundException('Kubeconfig not found')

    const team = await this.prisma.client.team.findFirst({
      where: { id: body.teamId, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!team) throw new NotFoundException('Team not found')

    if (kube.visibility === 'PERSONAL') {
      await this.prisma.client.kubeconfig.update({
        where: { id },
        data: { visibility: 'TEAM' }
      })
    }

    const assignment = await this.prisma.client.teamKubeconfig.upsert({
      where: { teamId_kubeconfigId: { teamId: body.teamId, kubeconfigId: id } },
      create: { teamId: body.teamId, kubeconfigId: id },
      update: {}
    })

    const members = await this.prisma.client.teamMember.findMany({
      where: { teamId: body.teamId },
      select: { userId: true }
    })
    await notifyUsers(this.prisma.client, {
      userIds: members.map((m) => m.userId),
      organizationId: membership.organizationId,
      type: 'kubeconfig.assigned',
      title: 'Kubeconfig assigned',
      body: `${kube.name} was shared with your team`,
      resourceType: 'kubeconfig',
      resourceId: kube.id
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
    await this.prisma.client.teamKubeconfig.deleteMany({ where: { kubeconfigId: id, teamId } })
    return { ok: true }
  }
}
