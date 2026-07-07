import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Space, Tag, Typography } from 'antd'
import { SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import type { PrometheusStatus } from '@shared/types/prometheus'
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

function statusTag(status: PrometheusStatus | null): React.JSX.Element {
  if (!status) return <Tag>Unknown</Tag>
  if (status.available) {
    return <Tag color="green">Connected ({status.discoveryMethod})</Tag>
  }
  return <Tag color="default">Not found</Tag>
}

export function EditClusterModal({ cluster, onClose }: EditClusterModalProps): React.JSX.Element {
  const [customName, setCustomName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [prometheusUrl, setPrometheusUrl] = useState('')
  const [prometheusStatus, setPrometheusStatus] = useState<PrometheusStatus | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const updateClusterMeta = useClusterStore((s) => s.updateClusterMeta)

  useEffect(() => {
    if (!cluster) return
    setCustomName(cluster.customName)
    setLogoUrl(cluster.logoUrl)
    setPrometheusUrl(cluster.prometheusUrl ?? '')
    setPrometheusStatus(null)
    if (cluster.status === 'connected') {
      void window.api.prometheus.getStatus({ clusterId: cluster.id }).then(setPrometheusStatus)
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

  async function handleDiscover(): Promise<void> {
    if (!cluster || cluster.status !== 'connected') return
    setDiscovering(true)
    try {
      const status = await window.api.prometheus.discover({
        clusterId: cluster.id,
        manualUrl: prometheusUrl.trim() || undefined
      })
      setPrometheusStatus(status)
      queryClient.setQueryData(['prometheus-status', cluster.id], status)
    } finally {
      setDiscovering(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!cluster) return
    const trimmedPrometheus = prometheusUrl.trim()
    updateClusterMeta(cluster.id, { customName, logoUrl, prometheusUrl: trimmedPrometheus || undefined })
    await window.api.clusterStore.update({
      id: cluster.id,
      customName,
      contextName: cluster.contextName,
      source: cluster.source,
      endpoint: cluster.endpoint,
      logoUrl,
      prometheusUrl: trimmedPrometheus || undefined,
      isFavorite: cluster.isFavorite,
      selectedNamespace: cluster.selectedNamespace,
      selectedResourceKind: cluster.selectedResourceKind
    })
    if (cluster.status === 'connected') {
      void window.api.prometheus.discover({
        clusterId: cluster.id,
        manualUrl: trimmedPrometheus || undefined
      })
    }
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Typography.Text>Prometheus</Typography.Text>
              {statusTag(prometheusStatus)}
            </div>
            <Input
              value={prometheusUrl}
              onChange={(e) => setPrometheusUrl(e.target.value)}
              placeholder="Auto-discover, or paste URL / API proxy path"
            />
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              Leave empty to auto-discover via the Kubernetes API proxy. For external Prometheus, paste the full URL
              (e.g. https://prometheus.example.com).
            </Typography.Text>
            {cluster?.status === 'connected' ? (
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={discovering}
                style={{ marginTop: 8 }}
                onClick={() => void handleDiscover()}
              >
                Test connection
              </Button>
            ) : (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 8 }}
                message="Connect to this cluster to test Prometheus discovery."
              />
            )}
            {prometheusStatus && !prometheusStatus.available && prometheusStatus.error ? (
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                {prometheusStatus.error}
              </Typography.Text>
            ) : null}
          </div>
        </Space>
      </Modal>

      <LogoCropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onSave={handleCropSave} />
    </>
  )
}
