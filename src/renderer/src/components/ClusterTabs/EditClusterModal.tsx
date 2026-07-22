import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Select, Space, Tag, Typography, message } from 'antd'
import { Clipboard, Eye, RefreshCw, Save, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { useQueryClient } from '@tanstack/react-query'
import type { PrometheusStatus } from '@shared/types/prometheus'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { useVpnStore } from '../../stores/vpnStore'
import { ClusterAvatar } from './ClusterAvatar'
import { ClusterBackgroundPicker } from './ClusterBackgroundPicker'
import { LogoCropModal } from './LogoCropModal'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import Editor from '@monaco-editor/react'
import { setupMonaco } from '../Editor/setupMonaco'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'

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
  const { t } = useTranslation()
  const [customName, setCustomName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [backgroundId, setBackgroundId] = useState<string | undefined>(undefined)
  const [backgroundCustomUrl, setBackgroundCustomUrl] = useState<string | undefined>(undefined)
  const [backgroundPanelOpacity, setBackgroundPanelOpacity] = useState<number | undefined>(undefined)
  const [prometheusUrl, setPrometheusUrl] = useState('')
  const [prometheusStatus, setPrometheusStatus] = useState<PrometheusStatus | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [kubeconfigOpen, setKubeconfigOpen] = useState(false)
  const [kubeconfigBusy, setKubeconfigBusy] = useState(false)
  const [kubeconfigYaml, setKubeconfigYaml] = useState<string>('')
  const [kubeconfigDraft, setKubeconfigDraft] = useState<string>('')
  const [kubeconfigEditable, setKubeconfigEditable] = useState(false)
  const [linkedVpnProfileId, setLinkedVpnProfileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const updateClusterMeta = useClusterStore((s) => s.updateClusterMeta)
  const updateClusterSource = useClusterStore((s) => s.updateClusterSource)
  const vpnProfiles = useVpnStore((s) => s.profiles)
  const getVpnLink = useClusterVpnStore((s) => s.getLink)
  const setVpnLink = useClusterVpnStore((s) => s.setLink)
  const isDark = useResolvedDarkMode()

  setupMonaco()

  useEffect(() => {
    if (!cluster) return
    setCustomName(cluster.customName)
    setLogoUrl(cluster.logoUrl)
    setBackgroundId(cluster.backgroundId)
    setBackgroundCustomUrl(cluster.backgroundCustomUrl)
    setBackgroundPanelOpacity(cluster.backgroundPanelOpacity)
    setPrometheusUrl(cluster.prometheusUrl ?? '')
    setPrometheusStatus(null)
    setLinkedVpnProfileId(getVpnLink(cluster.id) ?? null)
    if (cluster.status === 'connected') {
      void window.api.prometheus.getStatus({ clusterId: cluster.id }).then(setPrometheusStatus)
    }
  }, [cluster, getVpnLink])

  const vpnProfileOptions = useMemo(
    () =>
      vpnProfiles
        .filter((p) => p.hasConfig)
        .map((p) => ({
          value: p.id,
          label: p.name
        })),
    [vpnProfiles]
  )

  const kubeconfigCanEdit = useMemo(() => {
    if (!cluster) return false
    // Raw kubeconfig belongs to this cluster entry; safe to edit in-app.
    if (cluster.source.type === 'raw') return true
    // File-backed kubeconfig could contain multiple contexts; still allow edit but warn.
    return true
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
    updateClusterMeta(cluster.id, {
      customName,
      logoUrl,
      prometheusUrl: trimmedPrometheus || undefined,
      backgroundId: backgroundId || undefined,
      backgroundCustomUrl: backgroundId === 'custom' ? backgroundCustomUrl : undefined,
      backgroundPanelOpacity: backgroundId ? backgroundPanelOpacity : undefined
    })
    await window.api.clusterStore.update({
      id: cluster.id,
      customName,
      contextName: cluster.contextName,
      source: cluster.source,
      endpoint: cluster.endpoint,
      logoUrl,
      backgroundId: backgroundId || undefined,
      backgroundCustomUrl: backgroundId === 'custom' ? backgroundCustomUrl : undefined,
      backgroundPanelOpacity: backgroundId ? backgroundPanelOpacity : undefined,
      prometheusUrl: trimmedPrometheus || undefined,
      isFavorite: cluster.isFavorite,
      selectedNamespace: cluster.selectedNamespace,
      selectedResourceKind: cluster.selectedResourceKind,
      origin: cluster.origin,
      remoteId: cluster.remoteId,
      orgKubeconfigId: cluster.orgKubeconfigId,
      environment: cluster.environment,
      localKubeconfigPath: cluster.localKubeconfigPath,
      lastOpenedAt: cluster.lastOpenedAt
    })
    if (cluster.status === 'connected') {
      void window.api.prometheus.discover({
        clusterId: cluster.id,
        manualUrl: trimmedPrometheus || undefined
      })
    }
    await setVpnLink(cluster.id, linkedVpnProfileId)
    onClose()
  }

  async function loadKubeconfigYaml(source: KubeconfigSource): Promise<string> {
    if (!cluster) return ''
    const res = await window.api.kubeconfig.exportContext({ source, contextName: cluster.contextName })
    if (!res.ok) throw new Error(res.error)
    return res.yaml
  }

  async function openKubeconfig(options: { editable: boolean }): Promise<void> {
    if (!cluster) return
    setKubeconfigBusy(true)
    try {
      const yaml = await loadKubeconfigYaml(cluster.source)
      setKubeconfigYaml(yaml)
      setKubeconfigDraft(yaml)
      setKubeconfigEditable(options.editable)
      setKubeconfigOpen(true)
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setKubeconfigBusy(false)
    }
  }

  async function handleCopyKubeconfig(): Promise<void> {
    if (!cluster) return
    try {
      const yaml = kubeconfigYaml || (await loadKubeconfigYaml(cluster.source))
      await navigator.clipboard.writeText(yaml)
      message.success('Kubeconfig copied to clipboard')
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSaveKubeconfig(): Promise<void> {
    if (!cluster) return
    if (!kubeconfigEditable) return
    if (kubeconfigDraft.trim() === kubeconfigYaml.trim()) {
      message.info('No changes to save')
      return
    }

    setKubeconfigBusy(true)
    try {
      // Always save edited kubeconfig scoped to THIS cluster entry (inline/raw),
      // so file-backed kubeconfigs don't accidentally affect other contexts.
      const nextSource: KubeconfigSource = { type: 'raw', yaml: kubeconfigDraft }
      updateClusterSource(cluster.id, nextSource)
      await window.api.clusterStore.update({
        id: cluster.id,
        customName,
        contextName: cluster.contextName,
        source: nextSource,
        endpoint: cluster.endpoint,
        logoUrl,
        backgroundId,
        backgroundCustomUrl,
        backgroundPanelOpacity,
        prometheusUrl: prometheusUrl.trim() || undefined,
        isFavorite: cluster.isFavorite,
        selectedNamespace: cluster.selectedNamespace,
        selectedResourceKind: cluster.selectedResourceKind
      })
      message.success('Kubeconfig saved for this cluster')
      setKubeconfigYaml(kubeconfigDraft)

      if (cluster.status === 'connected') {
        message.info('Reconnect the cluster to apply kubeconfig changes')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setKubeconfigBusy(false)
    }
  }

  return (
    <>
      <Modal title="Edit Cluster" open={!!cluster} onCancel={onClose} onOk={handleSave} okText="Save">
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Space align="center">
            <ClusterAvatar logoUrl={logoUrl} name={customName} size={48} />
            <Button icon={<Icon icon={Upload} variant="detail" />} onClick={() => fileInputRef.current?.click()}>
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
                icon={<Icon icon={RefreshCw} variant="detail" />}
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

          <div>
            <ClusterBackgroundPicker
              backgroundId={backgroundId}
              backgroundCustomUrl={backgroundCustomUrl}
              backgroundPanelOpacity={backgroundPanelOpacity}
              onChange={(next) => {
                setBackgroundId(next.backgroundId)
                setBackgroundCustomUrl(next.backgroundCustomUrl)
                setBackgroundPanelOpacity(next.backgroundPanelOpacity)
              }}
            />
          </div>

          <div>
            <Typography.Text>{t('vpn.clusterLink.title')}</Typography.Text>
            <Select
              allowClear
              placeholder={t('vpn.clusterLink.placeholder')}
              style={{ width: '100%', marginTop: 8 }}
              value={linkedVpnProfileId ?? undefined}
              options={vpnProfileOptions}
              onChange={(value) => setLinkedVpnProfileId(value ?? null)}
              notFoundContent={
                vpnProfileOptions.length === 0 ? t('vpn.clusterLink.empty') : undefined
              }
            />
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              {t('vpn.clusterLink.hint')}
            </Typography.Text>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Typography.Text>Kubeconfig</Typography.Text>
              <Tag>{cluster?.source.type === 'file' ? 'Scoped (from file)' : 'Scoped (inline)'}</Tag>
            </div>
            <Space wrap>
              <Button
                icon={<Icon icon={Eye} variant="detail" />}
                loading={kubeconfigBusy}
                onClick={() => void openKubeconfig({ editable: false })}
              >
                View
              </Button>
              <Button
                icon={<Icon icon={Clipboard} variant="detail" />}
                loading={kubeconfigBusy}
                onClick={() => void handleCopyKubeconfig()}
              >
                Copy
              </Button>
              <Button
                icon={<Icon icon={Save} variant="detail" />}
                loading={kubeconfigBusy}
                disabled={!kubeconfigCanEdit}
                onClick={() => void openKubeconfig({ editable: true })}
              >
                Edit
              </Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              MagicLens shows a scoped kubeconfig for only this cluster (single context). Saving will store it for this cluster entry.
            </Typography.Text>
          </div>
        </Space>
      </Modal>

      <LogoCropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onSave={handleCropSave} />

      <Modal
        title="Kubeconfig"
        open={kubeconfigOpen}
        onCancel={() => setKubeconfigOpen(false)}
        width={980}
        okText="Save"
        okButtonProps={{ disabled: !kubeconfigEditable || kubeconfigBusy }}
        confirmLoading={kubeconfigBusy}
        onOk={() => void handleSaveKubeconfig()}
        cancelText="Close"
      >
        <div style={{ height: 520, border: '1px solid var(--ml-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          <Editor
            language="yaml"
            theme={isDark ? 'vs-dark' : 'vs'}
            value={kubeconfigDraft}
            onChange={(v) => setKubeconfigDraft(v ?? '')}
            options={{
              readOnly: !kubeconfigEditable,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'var(--ml-font-mono)',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              tabSize: 2
            }}
          />
        </div>
      </Modal>
    </>
  )
}
