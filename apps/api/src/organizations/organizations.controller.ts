import { Controller, Get, Patch, Body, UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'

class PatchOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  logoUrl?: string
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get('current')
  async current(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    return {
      ...membership.organization,
      role: membership.role
    }
  }

  @Patch('current')
  async patch(@CurrentUser() user: AuthUser, @Body() body: PatchOrgDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.organization.update({
      where: { id: membership.organizationId },
      data: {
        name: body.name,
        logoUrl: body.logoUrl
      }
    })
  }

  @Get('current/members')
  async members(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireMembership(user.id)
    return this.prisma.client.organizationMember.findMany({
      where: { organizationId: membership.organizationId, status: { not: 'REMOVED' } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            avatarUrl: true,
            lastLoginAt: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
  }
}
