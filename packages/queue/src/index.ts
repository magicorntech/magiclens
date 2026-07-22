import { Queue, type ConnectionOptions, type DefaultJobOptions } from 'bullmq'
import { QUEUE_NAMES, type QueueName } from '@magiclens/shared-types'

export { QUEUE_NAMES }
export type { QueueName }

export interface InvitationEmailJob {
  type: 'invitation'
  invitationId: string
  to: string
  organizationName: string
  inviteUrl: string
  invitedByName: string
}

export interface CredentialsEmailJob {
  type: 'credentials'
  to: string
  name: string
  organizationName: string
  temporaryPassword: string
  mustChangePassword: boolean
}

export type EmailJob = InvitationEmailJob | CredentialsEmailJob

export interface MaintenanceJob {
  type: 'clean-expired-invitations' | 'clean-refresh-tokens' | 'clean-background-jobs'
}

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: { age: 7 * 86400 }
}

export function createRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null
  }
}

export function createQueue<T>(name: QueueName, redisUrl: string): Queue<T> {
  return new Queue<T>(name, {
    connection: createRedisConnection(redisUrl),
    defaultJobOptions
  })
}

export function createAllQueues(redisUrl: string): Record<QueueName, Queue> {
  const queues = {} as Record<QueueName, Queue>
  for (const name of QUEUE_NAMES) {
    queues[name] = createQueue(name, redisUrl)
  }
  return queues
}
