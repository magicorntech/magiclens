import { Module } from '@nestjs/common'
import { InvitationsController } from './invitations.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [InvitationsController],
  providers: [OrgContextService]
})
export class InvitationsModule {}
