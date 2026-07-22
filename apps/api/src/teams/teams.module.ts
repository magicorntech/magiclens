import { Module } from '@nestjs/common'
import { TeamsController } from './teams.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [TeamsController],
  providers: [OrgContextService]
})
export class TeamsModule {}
