import { useEffect, useState } from 'react'
import { Form, InputNumber, Modal } from 'antd'
import type { WorkloadContextInfo, WorkloadKind } from '@shared/types/workload'
import { KubectlCommandPreview } from './KubectlCommandPreview'
import { WorkloadWarningBanners } from './WorkloadWarningBanners'
import { kubectlScaleCommand } from '@shared/workloadKubectl'

interface ScaleModalProps {
  open: boolean
  kind: WorkloadKind
  namespace: string
  name: string
  context?: WorkloadContextInfo
  loading?: boolean
  onCancel: () => void
  onConfirm: (replicas: number) => void
}

export function ScaleModal({
  open,
  kind,
  namespace,
  name,
  context,
  loading,
  onCancel,
  onConfirm
}: ScaleModalProps): React.JSX.Element {
  const [replicas, setReplicas] = useState(context?.replicas?.currentReplicas ?? 1)
  const current = context?.replicas?.currentReplicas ?? 0
  const scalingDown = replicas < current

  useEffect(() => {
    if (open) setReplicas(context?.replicas?.currentReplicas ?? 1)
  }, [open, context?.replicas?.currentReplicas])

  const ownerWarning =
    kind === 'ReplicaSets' && context?.replicas?.hasOwnerDeployment
      ? `This ReplicaSet is managed by Deployment "${context.replicas.ownerDeploymentName}". Scale the Deployment instead.`
      : undefined

  return (
    <Modal
      title={`Scale ${name}`}
      open={open}
      okText="Scale"
      okButtonProps={{ disabled: !!ownerWarning, loading }}
      onCancel={onCancel}
      onOk={() => onConfirm(replicas)}
    >
      <WorkloadWarningBanners
        hpa={context?.hpa}
        pdb={context?.pdb}
        stateful={context?.replicas?.statefulWarning}
        scalingDown={scalingDown}
      />
      {ownerWarning ? (
        <p style={{ color: 'var(--ant-color-warning)', marginBottom: 12 }}>{ownerWarning}</p>
      ) : null}
      <Form layout="vertical">
        <Form.Item label="Replica count">
          <InputNumber min={0} value={replicas} onChange={(v) => setReplicas(v ?? 0)} style={{ width: '100%' }} />
        </Form.Item>
        {context?.replicas?.statefulWarning && scalingDown && context.replicas.affectedOrdinals ? (
          <p style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
            Scaling down may leave PVCs behind. Affected ordinals: {context.replicas.affectedOrdinals.join(', ')}
          </p>
        ) : null}
        <p style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
          Current: {current} ready / {context?.replicas?.readyReplicas ?? 0} ready
        </p>
      </Form>
      <KubectlCommandPreview command={kubectlScaleCommand(kind, name, namespace, replicas)} />
    </Modal>
  )
}
