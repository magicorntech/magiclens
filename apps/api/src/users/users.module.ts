import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { OrgContextService } from '../common/org-context.service'
import { QueueModule } from '../queue/queue.module'

@Module({
  imports: [QueueModule],
  controllers: [UsersController],
  providers: [OrgContextService]
})
export class UsersModule {}
