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
  UseGuards,
  Inject
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { writeAuditLog } from '@magiclens/audit'
import { ResourcePackageType } from '@magiclens/database'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'

class CreatePackageDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsEnum(ResourcePackageType)
  type!: ResourcePackageType

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kubeconfigIds?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vpnProfileIds?: string[]
}

class PatchPackageDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string
}

class PackageItemsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[]
}

@ApiTags('resource-packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resource-packages')
export class ResourcePackagesController {
  constructor(
    @Inject(OrgContextService) private readonly orgContext: OrgContextService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.resourcePackage.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      include: {
        kubeconfigs: { include: { kubeconfig: { select: { id: true, name: true } } } },
        vpnProfiles: { include: { vpnProfile: { select: { id: true, name: true } } } },
        _count: { select: { teams: true } }
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    })
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreatePackageDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    if (body.type === 'KUBECONFIG' && body.vpnProfileIds?.length) {
      throw new BadRequestException('Kubeconfig packages cannot include VPN profiles')
    }
    if (body.type === 'VPN' && body.kubeconfigIds?.length) {
      throw new BadRequestException('VPN packages cannot include kubeconfigs')
    }

    const pkg = await this.prisma.client.resourcePackage.create({
      data: {
        organizationId: membership.organizationId,
        name: body.name,
        description: body.description,
        type: body.type,
        createdByUserId: user.id,
        kubeconfigs:
          body.type === 'KUBECONFIG' && body.kubeconfigIds?.length
            ? {
                create: body.kubeconfigIds.map((kubeconfigId) => ({ kubeconfigId }))
              }
            : undefined,
        vpnProfiles:
          body.type === 'VPN' && body.vpnProfileIds?.length
            ? {
                create: body.vpnProfileIds.map((vpnProfileId) => ({ vpnProfileId }))
              }
            : undefined
      },
      include: {
        kubeconfigs: { include: { kubeconfig: true } },
        vpnProfiles: { include: { vpnProfile: true } }
      }
    })

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'resource_package.create',
      result: 'success',
      resourceType: 'resource_package',
      resourceName: pkg.name
    })
    return pkg
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireMembership(user.id)
    const pkg = await this.prisma.client.resourcePackage.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null },
      include: {
        kubeconfigs: { include: { kubeconfig: true } },
        vpnProfiles: { include: { vpnProfile: true } },
        teams: { include: { team: { select: { id: true, name: true } } } }
      }
    })
    if (!pkg) throw new NotFoundException('Package not found')
    return pkg
  }

  @Patch(':id')
  async patch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PatchPackageDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.resourcePackage.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: { name: body.name, description: body.description }
    })
    return this.prisma.client.resourcePackage.findUniqueOrThrow({ where: { id } })
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.resourcePackage.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: { deletedAt: new Date() }
    })
    return { ok: true }
  }

  @Post(':id/kubeconfigs')
  async addKubeconfigs(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PackageItemsDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const pkg = await this.requireKubeconfigPackage(id, membership.organizationId)
    for (const kubeconfigId of body.ids) {
      await this.prisma.client.packageKubeconfigItem.upsert({
        where: { packageId_kubeconfigId: { packageId: pkg.id, kubeconfigId } },
        create: { packageId: pkg.id, kubeconfigId },
        update: {}
      })
    }
    return this.get(user, id)
  }

  @Delete(':id/kubeconfigs/:kubeconfigId')
  async removeKubeconfig(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('kubeconfigId') kubeconfigId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.packageKubeconfigItem.deleteMany({ where: { packageId: id, kubeconfigId } })
    return { ok: true }
  }

  @Post(':id/vpn-profiles')
  async addVpnProfiles(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PackageItemsDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const pkg = await this.requireVpnPackage(id, membership.organizationId)
    for (const vpnProfileId of body.ids) {
      await this.prisma.client.packageVpnProfileItem.upsert({
        where: { packageId_vpnProfileId: { packageId: pkg.id, vpnProfileId } },
        create: { packageId: pkg.id, vpnProfileId },
        update: {}
      })
    }
    return this.get(user, id)
  }

  @Delete(':id/vpn-profiles/:vpnProfileId')
  async removeVpnProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vpnProfileId') vpnProfileId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.packageVpnProfileItem.deleteMany({ where: { packageId: id, vpnProfileId } })
    return { ok: true }
  }

  @Post(':id/teams')
  async assignTeam(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { teamId: string }) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const pkg = await this.prisma.client.resourcePackage.findFirst({
      where: { id, organizationId: membership.organizationId, deletedAt: null },
      include: {
        kubeconfigs: true,
        vpnProfiles: true
      }
    })
    if (!pkg) throw new NotFoundException('Package not found')

    const team = await this.prisma.client.team.findFirst({
      where: { id: body.teamId, organizationId: membership.organizationId, deletedAt: null }
    })
    if (!team) throw new NotFoundException('Team not found')

    await this.prisma.client.teamResourcePackage.upsert({
      where: { teamId_packageId: { teamId: body.teamId, packageId: id } },
      create: { teamId: body.teamId, packageId: id },
      update: {}
    })

    if (pkg.type === 'KUBECONFIG') {
      for (const item of pkg.kubeconfigs) {
        await this.prisma.client.teamKubeconfig.upsert({
          where: { teamId_kubeconfigId: { teamId: body.teamId, kubeconfigId: item.kubeconfigId } },
          create: { teamId: body.teamId, kubeconfigId: item.kubeconfigId },
          update: {}
        })
      }
    } else {
      for (const item of pkg.vpnProfiles) {
        await this.prisma.client.teamVpnProfile.upsert({
          where: { teamId_vpnProfileId: { teamId: body.teamId, vpnProfileId: item.vpnProfileId } },
          create: { teamId: body.teamId, vpnProfileId: item.vpnProfileId },
          update: {}
        })
      }
    }

    return { ok: true }
  }

  @Delete(':id/teams/:teamId')
  async unassignTeam(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('teamId') teamId: string
  ) {
    await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.teamResourcePackage.deleteMany({ where: { packageId: id, teamId } })
    return { ok: true }
  }

  private async requireKubeconfigPackage(id: string, organizationId: string) {
    const pkg = await this.prisma.client.resourcePackage.findFirst({
      where: { id, organizationId, deletedAt: null, type: 'KUBECONFIG' }
    })
    if (!pkg) throw new NotFoundException('Kubeconfig package not found')
    return pkg
  }

  private async requireVpnPackage(id: string, organizationId: string) {
    const pkg = await this.prisma.client.resourcePackage.findFirst({
      where: { id, organizationId, deletedAt: null, type: 'VPN' }
    })
    if (!pkg) throw new NotFoundException('VPN package not found')
    return pkg
  }
}
