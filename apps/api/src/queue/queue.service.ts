import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  createAllQueues,
  type CredentialsEmailJob,
  type InvitationEmailJob,
  type QueueName
} from '@magiclens/queue'
import type { Queue } from 'bullmq'

@Injectable()
export class QueueService {
  private readonly queues: Record<QueueName, Queue>

  constructor(@Inject(ConfigService) config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL') ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
    this.queues = createAllQueues(redisUrl)
  }

  get(name: QueueName): Queue {
    return this.queues[name]
  }

  async enqueueInvitationEmail(job: InvitationEmailJob): Promise<void> {
    await this.queues.email.add('invitation', job, {
      jobId: `invitation-${job.invitationId}-${Date.now()}`
    })
  }

  async enqueueCredentialsEmail(job: CredentialsEmailJob): Promise<void> {
    await this.queues.email.add('credentials', job, {
      jobId: `credentials-${job.to}-${Date.now()}`
    })
  }

  async close(): Promise<void> {
    await Promise.all(Object.values(this.queues).map((q) => q.close()))
  }
}
