import { Module } from '@nestjs/common'
import { KubeconfigsController } from './kubeconfigs.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [KubeconfigsController],
  providers: [OrgContextService]
})
export class KubeconfigsModule {}
