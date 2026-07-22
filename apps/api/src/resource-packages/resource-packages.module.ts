import { Module } from '@nestjs/common'
import { ResourcePackagesController } from './resource-packages.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [ResourcePackagesController],
  providers: [OrgContextService]
})
export class ResourcePackagesModule {}
