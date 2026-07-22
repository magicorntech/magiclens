import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common'
import { createAllQueues } from '@magiclens/queue'
import { QueueService } from './queue.service'

@Global()
@Module({
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule implements OnModuleDestroy {
  constructor( @Inject(QueueService) private readonly queues: QueueService) {}

  async onModuleDestroy(): Promise<void> {
    await this.queues.close()
  }
}

export { createAllQueues }
