import type { CloudProviderId } from '@shared/cloudProvider'
import awsSrc from './brands/aws.png'
import gcpSrc from './brands/gcp.png'
import azureSrc from './brands/azure.png'
import huaweiSrc from './brands/huawei.png'

export const CLOUD_PROVIDER_ICONS: Record<CloudProviderId, string> = {
  aws: awsSrc,
  gcp: gcpSrc,
  azure: azureSrc,
  huawei: huaweiSrc
}
