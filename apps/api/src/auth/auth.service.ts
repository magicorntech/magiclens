import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  parseTtlToSeconds,
  signAccessToken,
  verifyPassword
} from '@magiclens/auth'
import { writeAuditLog } from '@magiclens/audit'
import {
  AuthProvider,
  OrganizationRole,
  PolicyEffect,
  ScopeType,
  UserStatus
} from '@magiclens/database'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor( @Inject(PrismaService) private readonly prisma: PrismaService, @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  private accessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_TTL') ?? '15m'
  }

  private refreshTtlMs(): number {
    const ttl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d'
    return parseTtlToSeconds(ttl) * 1000
  }

  async issueSession(
    userId: string,
    meta?: { deviceId?: string; userAgent?: string; ipAddress?: string }
  ) {
    const user = await this.prisma.client.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        allowed: false,
        reason: 'USER_DISABLED',
        message: 'Account is not active'
      })
    }

    const membership = await this.prisma.client.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' }
    })

    const accessToken = signAccessToken(
      {
        sub: user.id,
        email: user.email,
        orgId: membership?.organizationId,
        role: membership?.role
      },
      this.config.getOrThrow('JWT_ACCESS_SECRET'),
      this.accessTtl()
    )

    const rawRefresh = generateSecureToken(48)
    const familyId = generateSecureToken(16)
    await this.prisma.client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefresh),
        familyId,
        deviceId: meta?.deviceId,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt: new Date(Date.now() + this.refreshTtlMs())
      }
    })

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: parseTtlToSeconds(this.accessTtl()),
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        organization: membership
          ? {
              id: membership.organization.id,
              name: membership.organization.name,
              slug: membership.organization.slug,
              role: membership.role
            }
          : null
      }
    }
  }

  async loginWithPassword(
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    const normalized = normalizeEmail(email)
    const user = await this.prisma.client.user.findUnique({ where: { normalizedEmail: normalized } })
    if (!user || !user.passwordHash || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password')
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        allowed: false,
        reason: 'USER_DISABLED',
        message: 'Account is disabled'
      })
    }
    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password')
    }
    await writeAuditLog(this.prisma.client, {
      userId: user.id,
      action: 'auth.login',
      result: 'success',
      resourceType: 'user',
      resourceName: user.email
    })
    return this.issueSession(user.id, meta)
  }

  async changePassword(userId: string, newPassword: string, currentPassword?: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.passwordHash && !user.mustChangePassword) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        throw new UnauthorizedException('Current password is incorrect')
      }
    }
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(newPassword),
        mustChangePassword: false
      }
    })
    await writeAuditLog(this.prisma.client, {
      userId,
      action: 'auth.password.change',
      result: 'success',
      resourceType: 'user',
      resourceName: user.email
    })
    return { ok: true }
  }

  async registerOrLoginLocal(email: string, name?: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const normalized = normalizeEmail(email)

    const userId = await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { normalizedEmail: normalized } })
      if (existing) {
        if (existing.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException({
            allowed: false,
            reason: 'USER_DISABLED',
            message: 'Account is disabled'
          })
        }
        return existing.id
      }

      const userCount = await tx.user.count({ where: { deletedAt: null } })
      try {
        const user = await tx.user.create({
          data: {
            name: name?.trim() || email.split('@')[0],
            email: email.trim(),
            normalizedEmail: normalized,
            provider: AuthProvider.LOCAL,
            providerId: `local:${normalized}`,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date()
          }
        })

        if (userCount === 0) {
          await this.bootstrapFirstUser(tx, user.id, user.name)
        }

        await writeAuditLog(tx as never, {
          userId: user.id,
          action: 'auth.register',
          result: 'success',
          resourceType: 'user',
          resourceName: user.email
        })

        return user.id
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        if (code === 'P2002') {
          throw new ConflictException({
            statusCode: 409,
            message: 'Email already registered',
            error: 'Conflict'
          })
        }
        throw err
      }
    })

    return this.issueSession(userId, meta)
  }

  private async bootstrapFirstUser(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    userId: string,
    userName: string
  ): Promise<void> {
    const slug = 'magiclens'
    const org = await tx.organization.create({
      data: {
        name: `${userName}'s Organization`,
        slug,
        ownerUserId: userId,
        members: {
          create: {
            userId,
            role: OrganizationRole.OWNER,
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        }
      }
    })

    const templates = [
      { name: 'Read Only', actions: ['get', 'list', 'watch'], priority: 100 },
      {
        name: 'Operator',
        actions: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete', 'scale', 'restart'],
        priority: 50
      },
      { name: 'Full Access', actions: ['*'], priority: 10 }
    ]

    for (const t of templates) {
      await tx.permissionPolicy.create({
        data: {
          organizationId: org.id,
          name: t.name,
          description: `Default ${t.name} template`,
          effect: PolicyEffect.ALLOW,
          scopeType: ScopeType.ORGANIZATION,
          actionsJson: t.actions,
          priority: t.priority,
          createdByUserId: userId
        }
      })
    }

    await tx.team.create({
      data: {
        organizationId: org.id,
        name: 'Default',
        description: 'Default team',
        createdByUserId: userId,
        members: { create: { userId, role: 'ADMIN' } }
      }
    })
  }

  async linkOrLoginGoogle(profile: {
    id: string
    email: string
    emailVerified: boolean
    name: string
    avatarUrl?: string
  }, meta?: { userAgent?: string; ipAddress?: string }) {
    if (!profile.emailVerified) {
      throw new ForbiddenException('Google email is not verified')
    }
    const normalized = normalizeEmail(profile.email)

    const userId = await this.prisma.client.$transaction(async (tx) => {
      const byProvider = await tx.user.findFirst({
        where: { provider: AuthProvider.GOOGLE, providerId: profile.id }
      })
      if (byProvider) {
        if (byProvider.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException({
            allowed: false,
            reason: 'USER_DISABLED',
            message: 'Account is disabled'
          })
        }
        return byProvider.id
      }

      const byEmail = await tx.user.findUnique({ where: { normalizedEmail: normalized } })
      if (byEmail) {
        if (byEmail.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException({
            allowed: false,
            reason: 'USER_DISABLED',
            message: 'Account is disabled'
          })
        }
        await tx.user.update({
          where: { id: byEmail.id },
          data: {
            provider: AuthProvider.GOOGLE,
            providerId: profile.id,
            avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date()
          }
        })
        await writeAuditLog(tx as never, {
          userId: byEmail.id,
          action: 'auth.google_link',
          result: 'success',
          resourceType: 'user',
          resourceName: byEmail.email
        })
        return byEmail.id
      }

      const userCount = await tx.user.count({ where: { deletedAt: null } })
      try {
        const user = await tx.user.create({
          data: {
            name: profile.name,
            email: profile.email.trim(),
            normalizedEmail: normalized,
            avatarUrl: profile.avatarUrl,
            provider: AuthProvider.GOOGLE,
            providerId: profile.id,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date()
          }
        })
        if (userCount === 0) {
          await this.bootstrapFirstUser(tx, user.id, user.name)
        }
        return user.id
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2002') {
          throw new ConflictException('Email already registered')
        }
        throw err
      }
    })

    return this.issueSession(userId, meta)
  }

  async refresh(rawRefresh: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const tokenHash = hashToken(rawRefresh)
    const existing = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    })
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }
    if (existing.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        allowed: false,
        reason: 'USER_DISABLED',
        message: 'Account is disabled'
      })
    }

    // Reuse detection: if already rotated, revoke family
    await this.prisma.client.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() }
    })

    const nextRaw = generateSecureToken(48)
    await this.prisma.client.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(nextRaw),
        familyId: existing.familyId,
        deviceId: existing.deviceId,
        userAgent: meta?.userAgent ?? existing.userAgent,
        ipAddress: meta?.ipAddress ?? existing.ipAddress,
        expiresAt: new Date(Date.now() + this.refreshTtlMs())
      }
    })

    const membership = await this.prisma.client.organizationMember.findFirst({
      where: { userId: existing.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' }
    })

    const accessToken = signAccessToken(
      {
        sub: existing.userId,
        email: existing.user.email,
        orgId: membership?.organizationId,
        role: membership?.role
      },
      this.config.getOrThrow('JWT_ACCESS_SECRET'),
      this.accessTtl()
    )

    return {
      accessToken,
      refreshToken: nextRaw,
      expiresIn: parseTtlToSeconds(this.accessTtl())
    }
  }

  async logout(rawRefresh: string): Promise<void> {
    const tokenHash = hashToken(rawRefresh)
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }

  async listSessions(userId: string) {
    const tokens = await this.prisma.client.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    })
    return tokens.map((t) => ({
      id: t.id,
      deviceId: t.deviceId,
      userAgent: t.userAgent,
      ipAddress: t.ipAddress,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt.toISOString()
    }))
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }

  async getMe(userId: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({ where: { id: userId } })
    const membership = await this.prisma.client.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' }
    })

    const teamIds = (
      await this.prisma.client.teamMember.findMany({ where: { userId }, select: { teamId: true } })
    ).map((t) => t.teamId)

    const kubeconfigs = membership
      ? await this.prisma.client.kubeconfig.findMany({
          where: {
            organizationId: membership.organizationId,
            deletedAt: null,
            status: 'ACTIVE',
            OR: [
              { ownerUserId: userId, visibility: 'PERSONAL' },
              { visibility: 'ORGANIZATION' },
              { visibility: 'TEAM', teams: { some: { teamId: { in: teamIds } } } }
            ]
          },
          select: {
            id: true,
            name: true,
            visibility: true,
            serverEndpoint: true,
            environment: true,
            updatedAt: true,
            encryptedContent: true,
            encryptedDataKey: true
          }
        })
      : []

    const kubeconfigsWithFlags = kubeconfigs.map((k) => {
      const { encryptedContent, encryptedDataKey, ...safe } = k
      return {
        ...safe,
        hasConfig: !!(encryptedContent && encryptedDataKey)
      }
    })

    const vpnProfiles = membership
      ? await this.prisma.client.vpnProfile.findMany({
          where: {
            organizationId: membership.organizationId,
            deletedAt: null,
            status: 'ACTIVE',
            OR: [
              { users: { some: { userId } } },
              { teams: { some: { teamId: { in: teamIds } } } }
            ]
          },
          select: {
            id: true,
            name: true,
            description: true,
            provider: true,
            serverHost: true,
            protocol: true,
            updatedAt: true,
            encryptedConfig: true,
            encryptedDataKey: true
          }
        })
      : []

    const vpnProfilesWithFlags = vpnProfiles.map((v) => {
      const { encryptedConfig, encryptedDataKey, ...safe } = v
      return {
        ...safe,
        hasConfig: !!(encryptedConfig && encryptedDataKey)
      }
    })

    const unreadNotifications = await this.prisma.client.userNotification.count({
      where: { userId, readAt: null }
    })

    const hideLinks = await this.prisma.client.userPermissionPolicy.findMany({
      where: { userId },
      include: { policy: true }
    })
    const hiddenResourceKinds = [
      ...new Set(
        hideLinks
          .filter(
            (l) =>
              l.policy.description === 'magiclens:access:hide' ||
              l.policy.name.startsWith('[Hide] ')
          )
          .map((l) => l.policy.resourceKind)
          .filter((k): k is string => !!k)
      )
    ]

    let accessMode: 'full' | 'readonly' | 'custom' = 'full'
    if (hiddenResourceKinds.length > 0) accessMode = 'custom'
    else if (membership?.role === 'READ_ONLY') accessMode = 'readonly'

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      organization: membership
        ? {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            role: membership.role
          }
        : null,
      kubeconfigs: kubeconfigsWithFlags,
      vpnProfiles: vpnProfilesWithFlags,
      unreadNotifications,
      accessMode,
      hiddenResourceKinds
    }
  }
}
