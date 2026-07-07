import { Alert } from 'antd'
import type { HpaAttachment, PdbAttachment } from '@shared/types/workload'

interface WorkloadWarningBannersProps {
  hpa?: HpaAttachment
  pdb?: PdbAttachment
  stateful?: boolean
  scalingDown?: boolean
}

export function WorkloadWarningBanners({
  hpa,
  pdb,
  stateful,
  scalingDown
}: WorkloadWarningBannersProps): React.JSX.Element | null {
  const items: React.ReactNode[] = []

  if (hpa) {
    items.push(
      <Alert
        key="hpa"
        type="warning"
        showIcon
        message="HPA attached"
        description={`This workload is controlled by HorizontalPodAutoscaler "${hpa.name}" (min: ${hpa.minReplicas ?? '?'}, max: ${hpa.maxReplicas ?? '?'}). Manual replica changes may be overwritten.`}
        style={{ marginBottom: 8 }}
      />
    )
  }

  if (pdb && (scalingDown || stateful)) {
    items.push(
      <Alert
        key="pdb"
        type="warning"
        showIcon
        message="PodDisruptionBudget may block changes"
        description={`PDB "${pdb.name}" may prevent voluntary disruptions (minAvailable: ${pdb.minAvailable ?? '-'}, maxUnavailable: ${pdb.maxUnavailable ?? '-'}).`}
        style={{ marginBottom: 8 }}
      />
    )
  }

  if (stateful) {
    items.push(
      <Alert
        key="stateful"
        type="warning"
        showIcon
        message="Stateful workload"
        description="This may affect stateful applications and attached volumes. Make sure the application supports this operation."
        style={{ marginBottom: 8 }}
      />
    )
  }

  if (items.length === 0) return null
  return <div>{items}</div>
}
