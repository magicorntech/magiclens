import {
  AuthProvider,
  OrganizationRole,
  PrismaClient,
  UserStatus,
  KubeconfigVisibility,
  PolicyEffect,
  ScopeType
} from '@prisma/client'
import { createHash, randomBytes, scryptSync } from 'crypto'

const prisma = new PrismaClient()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize('NFC')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

const SEED_PASSWORD = 'MagicLens123!'

async function wipeDatabase(): Promise<void> {
  await prisma.userNotification.deleteMany()
  await prisma.teamResourcePackage.deleteMany()
  await prisma.packageKubeconfigItem.deleteMany()
  await prisma.packageVpnProfileItem.deleteMany()
  await prisma.resourcePackage.deleteMany()
  await prisma.userVpnProfile.deleteMany()
  await prisma.teamVpnProfile.deleteMany()
  await prisma.vpnProfile.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.backgroundJob.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.userPermissionPolicy.deleteMany()
  await prisma.teamPermissionPolicy.deleteMany()
  await prisma.permissionPolicy.deleteMany()
  await prisma.teamKubeconfig.deleteMany()
  await prisma.kubeconfig.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
}

async function main(): Promise<void> {
  const forceReset = process.env.PRISMA_SEED_FORCE_RESET === '1'
  const existingOrg = await prisma.organization.findFirst({ select: { id: true, slug: true } })

  if (existingOrg && !forceReset) {
    console.log(
      `Seed skipped: database already has data (org=${existingOrg.slug}). ` +
        'Created users and VPN/kubeconfigs are kept. ' +
        'To wipe and reseed demo data: npm run prisma:reset'
    )
    return
  }

  if (forceReset || existingOrg) {
    console.log('Wiping database before seed...')
    await wipeDatabase()
  }

  const passwordHash = hashPassword(SEED_PASSWORD)

  const owner = await prisma.user.create({
    data: {
      name: 'Owner Admin',
      email: 'owner@magiclens.local',
      normalizedEmail: normalizeEmail('owner@magiclens.local'),
      provider: AuthProvider.LOCAL,
      providerId: 'local-owner',
      passwordHash,
      mustChangePassword: false,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date()
    }
  })

  const member = await prisma.user.create({
    data: {
      name: 'Standard User',
      email: 'member@magiclens.local',
      normalizedEmail: normalizeEmail('member@magiclens.local'),
      provider: AuthProvider.LOCAL,
      providerId: 'local-member',
      passwordHash,
      mustChangePassword: false,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date()
    }
  })

  const readOnly = await prisma.user.create({
    data: {
      name: 'Read Only User',
      email: 'readonly@magiclens.local',
      normalizedEmail: normalizeEmail('readonly@magiclens.local'),
      provider: AuthProvider.LOCAL,
      providerId: 'local-readonly',
      passwordHash,
      mustChangePassword: false,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date()
    }
  })

  const org = await prisma.organization.create({
    data: {
      name: 'MagicLens Demo',
      slug: 'magiclens-demo',
      ownerUserId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: OrganizationRole.OWNER, status: 'ACTIVE', joinedAt: new Date() },
          { userId: member.id, role: OrganizationRole.MEMBER, status: 'ACTIVE', joinedAt: new Date() },
          {
            userId: readOnly.id,
            role: OrganizationRole.READ_ONLY,
            status: 'ACTIVE',
            joinedAt: new Date()
          }
        ]
      }
    }
  })

  const templates = [
    {
      name: 'Read Only',
      description: 'View resources only',
      actionsJson: ['get', 'list', 'watch'],
      effect: PolicyEffect.ALLOW
    },
    {
      name: 'Operator',
      description: 'Operate workloads without admin secrets',
      actionsJson: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete', 'scale', 'restart'],
      effect: PolicyEffect.ALLOW
    },
    {
      name: 'Full Access',
      description: 'Full MagicLens administration',
      actionsJson: ['*'],
      effect: PolicyEffect.ALLOW
    }
  ]

  for (const template of templates) {
    await prisma.permissionPolicy.create({
      data: {
        organizationId: org.id,
        name: template.name,
        description: template.description,
        effect: template.effect,
        scopeType: ScopeType.ORGANIZATION,
        actionsJson: template.actionsJson,
        priority: template.name === 'Full Access' ? 10 : 100,
        createdByUserId: owner.id
      }
    })
  }

  const team = await prisma.team.create({
    data: {
      organizationId: org.id,
      name: 'Platform',
      description: 'Platform engineering team',
      createdByUserId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' }
        ]
      }
    }
  })

  const kube = await prisma.kubeconfig.create({
    data: {
      organizationId: org.id,
      ownerUserId: owner.id,
      createdByUserId: owner.id,
      name: 'Demo Cluster (metadata only)',
      description: 'Sample shared kubeconfig metadata — no real credentials',
      visibility: KubeconfigVisibility.TEAM,
      contextsJson: [{ name: 'demo-context', cluster: 'demo-cluster' }],
      serverEndpoint: 'https://kubernetes.demo.local',
      environment: 'development',
      tagsJson: ['demo', 'shared'],
      status: 'ACTIVE'
    }
  })

  await prisma.teamKubeconfig.create({
    data: { teamId: team.id, kubeconfigId: kube.id }
  })

  const vpn = await prisma.vpnProfile.create({
    data: {
      organizationId: org.id,
      name: 'Demo VPN',
      description: 'Sample VPN profile metadata',
      provider: 'openvpn',
      serverHost: 'vpn.demo.local',
      protocol: 'udp',
      status: 'ACTIVE',
      createdByUserId: owner.id
    }
  })

  await prisma.userVpnProfile.create({
    data: { userId: member.id, vpnProfileId: vpn.id }
  })

  await prisma.userNotification.create({
    data: {
      userId: member.id,
      organizationId: org.id,
      type: 'vpn.assigned',
      title: 'VPN profile assigned',
      body: 'Demo VPN was assigned to your account',
      resourceType: 'vpn',
      resourceId: vpn.id
    }
  })

  const inviteToken = 'seed-invite-token-change-me'
  await prisma.invitation.create({
    data: {
      organizationId: org.id,
      email: 'invitee@magiclens.local',
      normalizedEmail: normalizeEmail('invitee@magiclens.local'),
      role: OrganizationRole.MEMBER,
      invitedByUserId: owner.id,
      tokenHash: hashToken(inviteToken),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
    }
  })

  console.log('Seed complete:')
  console.log(`  org=${org.slug}`)
  console.log(`  owner=${owner.email} / ${SEED_PASSWORD}`)
  console.log(`  member=${member.email} / ${SEED_PASSWORD}`)
  console.log(`  readonly=${readOnly.email} / ${SEED_PASSWORD}`)
  console.log(`  sample invitation token=${inviteToken}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
