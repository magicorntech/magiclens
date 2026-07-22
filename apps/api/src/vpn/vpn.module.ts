import { Module } from '@nestjs/common'
import { VpnProfilesController } from './vpn.controller'
import { OrgContextService } from '../common/org-context.service'

@Module({
  controllers: [VpnProfilesController],
  providers: [OrgContextService]
})
export class VpnModule {}
