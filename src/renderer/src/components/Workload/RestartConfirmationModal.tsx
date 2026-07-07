import { Modal } from 'antd'
import type { WorkloadContextInfo, WorkloadKind } from '@shared/types/workload'
import { KubectlCommandPreview } from './KubectlCommandPreview'
import { WorkloadWarningBanners } from './WorkloadWarningBanners'
import { kubectlRestartCommand } from '@shared/workloadKubectl'

interface RestartConfirmationModalProps {
  open: boolean
  kind: WorkloadKind
  namespace: string
  name: string
  context?: WorkloadContextInfo
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function RestartConfirmationModal({
  open,
  kind,
  namespace,
  name,
  context,
  loading,
  onCancel,
  onConfirm
}: RestartConfirmationModalProps): React.JSX.Element {
  return (
    <Modal
      title={`Restart ${name}?`}
      open={open}
      okText="Restart"
      okButtonProps={{ loading }}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      <WorkloadWarningBanners hpa={context?.hpa} pdb={context?.pdb} stateful={context?.replicas?.statefulWarning} />
      <p>
        This will restart all pods by updating the pod template annotation. Running workloads may experience brief
        disruption.
      </p>
      <KubectlCommandPreview command={kubectlRestartCommand(kind, name, namespace)} />
    </Modal>
  )
}
