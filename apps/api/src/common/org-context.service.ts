import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common'
import { canManageUsers } from '@magiclens/permissions'
import type { OrganizationRole } from '@magiclens/shared-types'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OrgContextService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async requireMembership(userId: string, orgId?: string) {
    const membership = await this.prisma.client.organizationMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        ...(orgId ? { organizationId: orgId } : {})
      },
      include: { organization: true },
      orderBy: { createdAt: 'asc' }
    })
    if (!membership) {
      throw new ForbiddenException({
        allowed: false,
        reason: 'ORGANIZATION_MEMBERSHIP_REQUIRED',
        message: 'Organization membership required'
      })
    }
    return membership
  }

  async requireAdmin(userId: string) {
    const membership = await this.requireMembership(userId)
    if (!canManageUsers(membership.role as OrganizationRole)) {
      throw new ForbiddenException({
        allowed: false,
        reason: 'ADMIN_PERMISSION_REQUIRED',
        message: 'Admin permission required'
      })
    }
    return membership
  }

  async requireOrg(orgId: string) {
    const org = await this.prisma.client.organization.findUnique({ where: { id: orgId } })
    if (!org) throw new NotFoundException('Organization not found')
    return org
  }
}
