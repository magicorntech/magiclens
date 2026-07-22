import { Module } from '@nestjs/common'
import { AuditController } from './audit.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [AuditController],
  providers: [OrgContextService]
})
export class AuditModule {}
