import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'
import http from 'http'
import { Worker, type Job } from 'bullmq'
import { createPrismaClient } from '@magiclens/database'
import { sendCredentialsEmail, sendInvitationEmail } from '@magiclens/email'
import {
  createRedisConnection,
  QUEUE_NAMES,
  type EmailJob,
  type MaintenanceJob
} from '@magiclens/queue'

loadEnv({ path: resolve(__dirname, '../../../.env') })
loadEnv({ path: resolve(process.cwd(), '../../.env') })
loadEnv({ path: resolve(process.cwd(), '.env') })

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
const connection = createRedisConnection(redisUrl)
const prisma = createPrismaClient()

const smtp = {
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.SMTP_FROM ?? 'MagicLens <noreply@magiclens.local>'
}

function concurrency(name: string, fallback: number): number {
  const key = `WORKER_CONCURRENCY_${name}`
  return Number(process.env[key] ?? fallback)
}

async function handleEmail(job: Job<EmailJob>): Promise<void> {
  const data = job.data
  if (data.type === 'invitation') {
    await sendInvitationEmail(smtp, {
      to: data.to,
      organizationName: data.organizationName,
      inviteUrl: data.inviteUrl,
      invitedByName: data.invitedByName
    })
    await prisma.backgroundJob.create({
      data: {
        type: 'email.invitation',
        status: 'COMPLETED',
        payloadJson: { invitationId: data.invitationId, to: data.to },
        attempts: job.attemptsMade,
        startedAt: new Date(job.timestamp),
        completedAt: new Date()
      }
    })
    return
  }

  if (data.type === 'credentials') {
    await sendCredentialsEmail(smtp, {
      to: data.to,
      name: data.name,
      organizationName: data.organizationName,
      temporaryPassword: data.temporaryPassword,
      mustChangePassword: data.mustChangePassword
    })
    await prisma.backgroundJob.create({
      data: {
        type: 'email.credentials',
        status: 'COMPLETED',
        payloadJson: { to: data.to },
        attempts: job.attemptsMade,
        startedAt: new Date(job.timestamp),
        completedAt: new Date()
      }
    })
  }
}

async function handleMaintenance(job: Job<MaintenanceJob>): Promise<void> {
  const now = new Date()
  if (job.data.type === 'clean-expired-invitations') {
    await prisma.invitation.updateMany({
      where: { expiresAt: { lt: now }, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now }
    })
  }
  if (job.data.type === 'clean-refresh-tokens') {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null, lt: new Date(now.getTime() - 30 * 86400000) } }]
      }
    })
  }
  if (job.data.type === 'clean-background-jobs') {
    await prisma.backgroundJob.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - 30 * 86400000) }, status: 'COMPLETED' }
    })
  }
}

async function handleKubeconfigValidation(job: Job<{ kubeconfigId: string }>): Promise<void> {
  // Stub: mark as ACTIVE after metadata check (no live cluster call in local seed)
  const id = job.data.kubeconfigId
  const existing = await prisma.kubeconfig.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) return
  await prisma.kubeconfig.update({
    where: { id },
    data: { status: 'ACTIVE' }
  })
  await job.updateProgress(100)
}

const workers: Worker[] = []

workers.push(
  new Worker('email', handleEmail, {
    connection,
    concurrency: concurrency('EMAIL', 5)
  })
)

workers.push(
  new Worker('maintenance', handleMaintenance, {
    connection,
    concurrency: concurrency('MAINTENANCE', 1)
  })
)

workers.push(
  new Worker('kubeconfig-validation', handleKubeconfigValidation, {
    connection,
    concurrency: 2
  })
)

for (const name of ['cluster-health', 'notifications', 'audit-export', 'reports'] as const) {
  workers.push(
    new Worker(
      name,
      async (job) => {
        console.log(`[stub] processed ${name} job ${job.id}`)
        await job.updateProgress(100)
      },
      {
        connection,
        concurrency: concurrency(name.replace('-', '_').toUpperCase(), 2)
      }
    )
  )
}

for (const w of workers) {
  w.on('failed', (job, err) => {
    console.error(`Job ${job?.id} on ${w.name} failed`, err.message)
  })
  w.on('completed', (job) => {
    console.log(`Job ${job.id} on ${w.name} completed`)
  })
}

const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({
      status: 'ok',
      queues: QUEUE_NAMES,
      workers: workers.map((w) => w.name),
      timestamp: new Date().toISOString()
    })
  )
})

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 3001)
healthServer.listen(healthPort, () => {
  console.log(`MagicLens worker health on :${healthPort}`)
})

async function scheduleMaintenance(): Promise<void> {
  const { Queue } = await import('bullmq')
  const q = new Queue('maintenance', { connection })
  await q.add(
    'clean-expired-invitations',
    { type: 'clean-expired-invitations' },
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'repeat-clean-invitations' }
  )
  await q.add(
    'clean-refresh-tokens',
    { type: 'clean-refresh-tokens' },
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'repeat-clean-tokens' }
  )
  await q.add(
    'clean-background-jobs',
    { type: 'clean-background-jobs' },
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: 'repeat-clean-jobs' }
  )
  await q.close()
}

scheduleMaintenance().catch(console.error)

async function shutdown(): Promise<void> {
  console.log('Shutting down worker…')
  await Promise.all(workers.map((w) => w.close()))
  healthServer.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())

console.log(`MagicLens worker started for queues: ${QUEUE_NAMES.join(', ')}`)
