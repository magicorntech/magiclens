import { Module } from '@nestjs/common'
import { PermissionsController, EffectivePermissionsController } from './permissions.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [PermissionsController, EffectivePermissionsController],
  providers: [OrgContextService]
})
export class PermissionsModule {}
