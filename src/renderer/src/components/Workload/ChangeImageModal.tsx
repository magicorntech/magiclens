import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { WorkloadContainerInfo, WorkloadKind } from '@shared/types/workload'
import { KubectlCommandPreview } from './KubectlCommandPreview'
import { kubectlResourceName } from '@shared/workloadKubectl'

interface ChangeImageModalProps {
  open: boolean
  kind: WorkloadKind
  namespace: string
  name: string
  containers: WorkloadContainerInfo[]
  loading?: boolean
  onCancel: () => void
  onConfirm: (containerName: string, image: string) => void
}

export function ChangeImageModal({
  open,
  kind,
  namespace,
  name,
  containers,
  loading,
  onCancel,
  onConfirm
}: ChangeImageModalProps): React.JSX.Element {
  const [containerName, setContainerName] = useState(containers[0]?.name ?? '')
  const [image, setImage] = useState(containers[0]?.image ?? '')

  useEffect(() => {
    if (open && containers.length > 0) {
      setContainerName(containers[0].name)
      setImage(containers[0].image)
    }
  }, [open, containers])

  const preview = `kubectl set image ${kubectlResourceName(kind)}/${name} ${containerName}=${image} -n ${namespace}`

  return (
    <Modal
      title={`Change image — ${name}`}
      open={open}
      okText="Apply"
      okButtonProps={{ loading, disabled: !containerName || !image }}
      onCancel={onCancel}
      onOk={() => onConfirm(containerName, image)}
    >
      <Form layout="vertical">
        <Form.Item label="Container">
          <Select
            value={containerName}
            options={containers.map((c) => ({ value: c.name, label: c.name }))}
            onChange={(v) => {
              setContainerName(v)
              const match = containers.find((c) => c.name === v)
              if (match) setImage(match.image)
            }}
          />
        </Form.Item>
        <Form.Item label="Image">
          <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="nginx:1.27" />
        </Form.Item>
      </Form>
      <KubectlCommandPreview command={preview} />
    </Modal>
  )
}
