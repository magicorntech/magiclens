import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Drawer, Input, Select, Space, Tag, Typography, message, Modal } from 'antd'
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
import { useLayoutMode } from '../../hooks/useLayoutMode'

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

function statusTag(status: PrometheusStatus | null, t: (key: string, opts?: Record<string, string>) => string): React.JSX.Element {
  if (!status) return <Tag>{t('clusterEdit.prometheusUnknown')}</Tag>
  if (status.available) {
    return <Tag color="green">{t('clusterEdit.prometheusConnected', { method: status.discoveryMethod })}</Tag>
  }
  return <Tag color="default">{t('clusterEdit.prometheusNotFound')}</Tag>
}

export function EditClusterModal({ cluster, onClose }: EditClusterModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const layoutMode = useLayoutMode()
  const drawerWidth =
    layoutMode === 'mobile' ? '100%' : layoutMode === 'compact' ? 'min(720px, 96vw)' : 'min(880px, 92vw)'
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
      message.success(t('clusterEdit.kubeconfigCopied'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSaveKubeconfig(): Promise<void> {
    if (!cluster) return
    if (!kubeconfigEditable) return
    if (kubeconfigDraft.trim() === kubeconfigYaml.trim()) {
      message.info(t('clusterEdit.noKubeconfigChanges'))
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
      message.success(t('clusterEdit.kubeconfigSaved'))
      setKubeconfigYaml(kubeconfigDraft)

      if (cluster.status === 'connected') {
        message.info(t('clusterEdit.reconnectHint'))
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setKubeconfigBusy(false)
    }
  }

  return (
    <>
      <Drawer
        title={t('clusterEdit.title')}
        open={!!cluster}
        onClose={onClose}
        placement="right"
        width={drawerWidth}
        destroyOnHidden
        className="ml-cluster-edit-drawer"
        mask={{ blur: true }}
        styles={{
          body: { paddingTop: 12, paddingBottom: 8 },
          footer: { borderTop: '1px solid var(--ml-border-secondary)' }
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>{t('clusterEdit.close')}</Button>
            <Button type="primary" onClick={() => void handleSave()}>
              {t('clusterEdit.save')}
            </Button>
          </div>
        }
      >
        <div className="ml-cluster-edit-layout">
          <section className="ml-cluster-edit-col">
            <Typography.Text strong className="ml-cluster-edit-section-title">
              {t('clusterEdit.displayName')}
            </Typography.Text>
            <Space align="start" size="middle" style={{ width: '100%', marginTop: 8 }}>
              <ClusterAvatar logoUrl={logoUrl} name={customName} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={t('clusterEdit.displayNamePlaceholder')}
                  size="large"
                />
                <Button
                  size="small"
                  icon={<Icon icon={Upload} variant="detail" />}
                  style={{ marginTop: 8 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('clusterEdit.changeLogo')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  style={{ display: 'none' }}
                  onChange={handleLogoSelected}
                />
              </div>
            </Space>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Typography.Text strong>{t('clusterEdit.prometheus')}</Typography.Text>
                {statusTag(prometheusStatus, t)}
              </div>
              <Input
                value={prometheusUrl}
                onChange={(e) => setPrometheusUrl(e.target.value)}
                placeholder={t('clusterEdit.prometheusPlaceholder')}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                {t('clusterEdit.prometheusHint')}
              </Typography.Text>
              {cluster?.status === 'connected' ? (
                <Button
                  size="small"
                  icon={<Icon icon={RefreshCw} variant="detail" />}
                  loading={discovering}
                  style={{ marginTop: 8 }}
                  onClick={() => void handleDiscover()}
                >
                  {t('clusterActions.testConnection')}
                </Button>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message={t('clusterEdit.prometheusConnectHint')}
                />
              )}
              {prometheusStatus && !prometheusStatus.available && prometheusStatus.error ? (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                  {prometheusStatus.error}
                </Typography.Text>
              ) : null}
            </div>

            <div style={{ marginTop: 20 }}>
              <Typography.Text strong>{t('vpn.clusterLink.title')}</Typography.Text>
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
          </section>

          <section className="ml-cluster-edit-col">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Typography.Text strong>{t('clusterEdit.kubeconfig')}</Typography.Text>
              <Tag>
                {cluster?.source.type === 'file'
                  ? t('clusterEdit.kubeconfigScopedFile')
                  : t('clusterEdit.kubeconfigScopedInline')}
              </Tag>
            </div>
            <Space wrap>
              <Button
                icon={<Icon icon={Eye} variant="detail" />}
                loading={kubeconfigBusy}
                onClick={() => void openKubeconfig({ editable: false })}
              >
                {t('clusterEdit.view')}
              </Button>
              <Button
                icon={<Icon icon={Clipboard} variant="detail" />}
                loading={kubeconfigBusy}
                onClick={() => void handleCopyKubeconfig()}
              >
                {t('clusterEdit.copy')}
              </Button>
              <Button
                icon={<Icon icon={Save} variant="detail" />}
                loading={kubeconfigBusy}
                disabled={!kubeconfigCanEdit}
                onClick={() => void openKubeconfig({ editable: true })}
              >
                {t('clusterEdit.editYaml')}
              </Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              {t('clusterEdit.kubeconfigHint')}
            </Typography.Text>

            <div style={{ marginTop: 20 }}>
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
          </section>
        </div>
      </Drawer>

      <LogoCropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onSave={handleCropSave} />

      <Modal
        title={t('clusterEdit.kubeconfig')}
        open={kubeconfigOpen}
        onCancel={() => setKubeconfigOpen(false)}
        width={980}
        okText={t('clusterEdit.save')}
        okButtonProps={{ disabled: !kubeconfigEditable || kubeconfigBusy }}
        confirmLoading={kubeconfigBusy}
        onOk={() => void handleSaveKubeconfig()}
        cancelText={t('clusterEdit.close')}
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
