import { Controller, Get, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor( @Inject(PrismaService) private readonly prisma: PrismaService, @Inject(QueueService) private readonly queues: QueueService
  ) {}

  @Get()
  async check() {
    await this.prisma.client.$queryRaw`SELECT 1`
    const emailCounts = await this.queues.get('email').getJobCounts()
    return {
      status: 'ok',
      postgres: 'up',
      redisQueues: { email: emailCounts },
      timestamp: new Date().toISOString()
    }
  }
}
