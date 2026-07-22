import { Controller, Get, Param, Query, UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit = '50'
  ) {
    const membership = await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.auditLog.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(action ? { action: { contains: action } } : {}),
        ...(userId ? { userId } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 50, 200)
    })
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.auditLog.findUnique({ where: { id } })
  }
}
