import { Module } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [OrganizationsController],
  providers: [OrgContextService],
  exports: [OrgContextService]
})
export class OrganizationsModule {}
