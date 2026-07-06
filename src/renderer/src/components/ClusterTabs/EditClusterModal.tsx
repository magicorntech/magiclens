import { useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Space, Typography } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterAvatar } from './ClusterAvatar'
import { LogoCropModal } from './LogoCropModal'

interface EditClusterModalProps {
  cluster: ClusterEntry | null
  onClose: () => void
}

const LOGO_ACCEPT = 'image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.ico'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function EditClusterModal({ cluster, onClose }: EditClusterModalProps): React.JSX.Element {
  const [customName, setCustomName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateClusterMeta = useClusterStore((s) => s.updateClusterMeta)

  useEffect(() => {
    if (cluster) {
      setCustomName(cluster.customName)
      setLogoUrl(cluster.logoUrl)
    }
  }, [cluster])

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropSource(await readFileAsDataUrl(file))
  }

  function handleCropSave(dataUrl: string): void {
    setLogoUrl(dataUrl)
    setCropSource(null)
  }

  async function handleSave(): Promise<void> {
    if (!cluster) return
    updateClusterMeta(cluster.id, { customName, logoUrl })
    await window.api.clusterStore.update({
      id: cluster.id,
      customName,
      contextName: cluster.contextName,
      source: cluster.source,
      endpoint: cluster.endpoint,
      logoUrl,
      isFavorite: cluster.isFavorite,
      selectedNamespace: cluster.selectedNamespace,
      selectedResourceKind: cluster.selectedResourceKind
    })
    onClose()
  }

  return (
    <>
      <Modal title="Edit Cluster" open={!!cluster} onCancel={onClose} onOk={handleSave} okText="Save">
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Space align="center">
            <ClusterAvatar logoUrl={logoUrl} name={customName} size={48} />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              Change logo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              style={{ display: 'none' }}
              onChange={handleLogoSelected}
            />
          </Space>
          <div>
            <Typography.Text>Display name</Typography.Text>
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
          </div>
        </Space>
      </Modal>

      <LogoCropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onSave={handleCropSave} />
    </>
  )
}
