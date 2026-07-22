import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { generateSecureToken, hashToken, normalizeEmail } from '@magiclens/auth'
import { writeAuditLog } from '@magiclens/audit'
import { OrganizationRole } from '@magiclens/database'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { OrgContextService } from '../common/org-context.service'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'

class CreateInvitationDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole
}

class AcceptInvitationDto {
  @IsString()
  token!: string
}

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor( @Inject(OrgContextService) private readonly orgContext: OrgContextService, @Inject(PrismaService) private readonly prisma: PrismaService, @Inject(QueueService) private readonly queues: QueueService, @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const membership = await this.orgContext.requireAdmin(user.id)
    return this.prisma.client.invitation.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: 'desc' }
    })
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateInvitationDto) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const normalized = normalizeEmail(body.email)
    const role = body.role ?? OrganizationRole.MEMBER

    if (role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot invite as OWNER')
    }

    const existingUser = await this.prisma.client.user.findUnique({
      where: { normalizedEmail: normalized }
    })
    if (existingUser) {
      const alreadyMember = await this.prisma.client.organizationMember.findFirst({
        where: {
          organizationId: membership.organizationId,
          userId: existingUser.id,
          status: 'ACTIVE'
        }
      })
      if (alreadyMember) {
        // Prevent invitation enumeration details — generic conflict
        throw new ConflictException('Unable to create invitation for this email')
      }
    }

    const activeInvite = await this.prisma.client.invitation.findFirst({
      where: {
        organizationId: membership.organizationId,
        normalizedEmail: normalized,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    })
    if (activeInvite) {
      throw new ConflictException('An active invitation already exists for this email')
    }

    const rawToken = generateSecureToken(32)
    const ttlHours = Number(this.config.get('INVITATION_TTL_HOURS') ?? 72)
    const invitation = await this.prisma.client.invitation.create({
      data: {
        organizationId: membership.organizationId,
        email: body.email.trim(),
        normalizedEmail: normalized,
        role,
        invitedByUserId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      }
    })

    const acceptBase = this.config.get('INVITATION_ACCEPT_URL') ?? 'http://localhost:5173/invitations/accept'
    const inviteUrl = `${acceptBase}?token=${rawToken}`
    const inviter = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } })

    await this.queues.enqueueInvitationEmail({
      type: 'invitation',
      invitationId: invitation.id,
      to: invitation.email,
      organizationName: membership.organization.name,
      inviteUrl,
      invitedByName: inviter.name
    })

    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'invitation.create',
      result: 'success',
      resourceType: 'invitation',
      resourceName: invitation.email
    })

    // Do not return raw token in production responses; include for local admin UX only when NODE_ENV=development
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      ...(process.env.NODE_ENV === 'development' ? { token: rawToken, inviteUrl } : {})
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('accept')
  async accept(@CurrentUser() user: AuthUser, @Body() body: AcceptInvitationDto) {
    const tokenHash = hashToken(body.token)
    const me = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } })

    return this.prisma.client.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } })
      if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt < new Date()) {
        throw new BadRequestException('Invitation is invalid or expired')
      }

      if (normalizeEmail(me.email) !== invitation.normalizedEmail) {
        throw new ForbiddenException('Authenticated email does not match invitation')
      }

      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: me.id
          }
        },
        create: {
          organizationId: invitation.organizationId,
          userId: me.id,
          role: invitation.role,
          status: 'ACTIVE',
          invitedByUserId: invitation.invitedByUserId,
          joinedAt: new Date()
        },
        update: {
          role: invitation.role,
          status: 'ACTIVE',
          joinedAt: new Date()
        }
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      await writeAuditLog(tx as never, {
        organizationId: invitation.organizationId,
        userId: me.id,
        action: 'invitation.accept',
        result: 'success',
        resourceType: 'invitation',
        resourceName: invitation.email
      })

      return { ok: true, organizationId: invitation.organizationId }
    })
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/resend')
  async resend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    const invitation = await this.prisma.client.invitation.findFirst({
      where: { id, organizationId: membership.organizationId }
    })
    if (!invitation || invitation.acceptedAt || invitation.revokedAt) {
      throw new BadRequestException('Invitation cannot be resent')
    }

    const rawToken = generateSecureToken(32)
    const ttlHours = Number(this.config.get('INVITATION_TTL_HOURS') ?? 72)
    await this.prisma.client.invitation.update({
      where: { id },
      data: {
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      }
    })

    const acceptBase = this.config.get('INVITATION_ACCEPT_URL') ?? 'http://localhost:5173/invitations/accept'
    const inviteUrl = `${acceptBase}?token=${rawToken}`
    const inviter = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } })

    await this.queues.enqueueInvitationEmail({
      type: 'invitation',
      invitationId: invitation.id,
      to: invitation.email,
      organizationName: membership.organization.name,
      inviteUrl,
      invitedByName: inviter.name
    })

    return { ok: true, ...(process.env.NODE_ENV === 'development' ? { token: rawToken, inviteUrl } : {}) }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const membership = await this.orgContext.requireAdmin(user.id)
    await this.prisma.client.invitation.updateMany({
      where: { id, organizationId: membership.organizationId, revokedAt: null, acceptedAt: null },
      data: { revokedAt: new Date() }
    })
    await writeAuditLog(this.prisma.client, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'invitation.revoke',
      result: 'success',
      resourceType: 'invitation',
      resourceName: id
    })
    return { ok: true }
  }
}
