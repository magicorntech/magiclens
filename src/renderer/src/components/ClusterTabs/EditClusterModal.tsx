import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Drawer, Input, Select, Space, Tag, Typography, message, Modal } from 'antd'
import {
  Boxes,
  Bug,
  Clipboard,
  Database,
  Eye,
  Gauge,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Network,
  Plug,
  Save,
  Server,
  Settings2,
  Shield,
  Terminal,
  Upload,
  Workflow
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { useQueryClient } from '@tanstack/react-query'
import type { PrometheusStatus } from '@shared/types/prometheus'
import type { ClusterSettings, ClusterSettingsSectionId } from '@shared/types/clusterSettings'
import { CLUSTER_SETTINGS_SECTIONS, mergeClusterSettings } from '@shared/types/clusterSettings'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { useVpnStore } from '../../stores/vpnStore'
import { ClusterAvatar } from './ClusterAvatar'
import { ClusterBackgroundPicker } from './ClusterBackgroundPicker'
import { LogoCropModal } from './LogoCropModal'
import { ClusterSettingsSectionBody } from './ClusterSettingsSections'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import Editor from '@monaco-editor/react'
import { setupMonaco } from '../Editor/setupMonaco'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import type { LucideIcon } from 'lucide-react'

interface EditClusterModalProps {
  cluster: ClusterEntry | null
  onClose: () => void
}

type NavId = 'appearance' | 'kubeconfig' | ClusterSettingsSectionId

const LOGO_ACCEPT = 'image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.ico'

const NAV_ICONS: Record<NavId, LucideIcon> = {
  appearance: LayoutDashboard,
  general: Settings2,
  proxy: Network,
  terminal: Terminal,
  namespaces: Boxes,
  metrics: LineChart,
  lensMetrics: Gauge,
  nodeShell: Server,
  security: Shield,
  network: Workflow,
  storage: HardDrive,
  integrations: Plug,
  performance: Gauge,
  ui: LayoutDashboard,
  debug: Bug,
  kubeconfig: KeyRound
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function statusTag(
  status: PrometheusStatus | null,
  t: (key: string, opts?: Record<string, string>) => string
): React.JSX.Element {
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
    layoutMode === 'mobile' ? '100%' : layoutMode === 'compact' ? 'min(860px, 98vw)' : 'min(1040px, 94vw)'
  const [section, setSection] = useState<NavId>('appearance')
  const [navQuery, setNavQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [backgroundId, setBackgroundId] = useState<string | undefined>(undefined)
  const [backgroundCustomUrl, setBackgroundCustomUrl] = useState<string | undefined>(undefined)
  const [backgroundPanelOpacity, setBackgroundPanelOpacity] = useState<number | undefined>(undefined)
  const [prometheusUrl, setPrometheusUrl] = useState('')
  const [prometheusStatus, setPrometheusStatus] = useState<PrometheusStatus | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [settings, setSettings] = useState<ClusterSettings>(() => mergeClusterSettings())
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [kubeconfigOpen, setKubeconfigOpen] = useState(false)
  const [kubeconfigBusy, setKubeconfigBusy] = useState(false)
  const [kubeconfigYaml, setKubeconfigYaml] = useState('')
  const [kubeconfigDraft, setKubeconfigDraft] = useState('')
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
    setSection('appearance')
    setNavQuery('')
    setCustomName(cluster.customName)
    setLogoUrl(cluster.logoUrl)
    setBackgroundId(cluster.backgroundId)
    setBackgroundCustomUrl(cluster.backgroundCustomUrl)
    setBackgroundPanelOpacity(cluster.backgroundPanelOpacity)
    setPrometheusUrl(cluster.prometheusUrl ?? cluster.settings?.metrics.endpointUrl ?? '')
    setSettings(mergeClusterSettings(cluster.settings))
    setPrometheusStatus(null)
    setLinkedVpnProfileId(getVpnLink(cluster.id) ?? null)
    if (cluster.status === 'connected') {
      void window.api.prometheus.getStatus({ clusterId: cluster.id }).then(setPrometheusStatus)
    }
  }, [cluster, getVpnLink])

  const vpnProfileOptions = useMemo(
    () => [
      { value: '', label: t('vpn.clusterLink.none') },
      ...vpnProfiles
        .filter((p) => p.hasConfig)
        .map((p) => ({ value: p.id, label: p.name }))
    ],
    [t, vpnProfiles]
  )

  const navItems: { id: NavId; label: string }[] = useMemo(
    () => [
      { id: 'appearance', label: t('clusterSettings.nav.appearance') },
      ...CLUSTER_SETTINGS_SECTIONS.map((id) => ({
        id,
        label: t(`clusterSettings.nav.${id}`)
      })),
      { id: 'kubeconfig', label: t('clusterEdit.kubeconfig') }
    ],
    [t]
  )

  const filteredNavItems = useMemo(() => {
    const q = navQuery.trim().toLowerCase()
    if (!q) return navItems
    return navItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [navItems, navQuery])

  useEffect(() => {
    if (filteredNavItems.length === 0) return
    if (!filteredNavItems.some((item) => item.id === section)) {
      setSection(filteredNavItems[0].id)
    }
  }, [filteredNavItems, section])

  function patchSettings<K extends keyof ClusterSettings>(key: K, patch: Partial<ClusterSettings[K]>): void {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropSource(await readFileAsDataUrl(file))
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
    const nextSettings = mergeClusterSettings({
      ...settings,
      metrics: { ...settings.metrics, endpointUrl: trimmedPrometheus || settings.metrics.endpointUrl },
      general: {
        ...settings.general,
        environment: settings.general.environment
      }
    })
    const environment = nextSettings.general.environment || undefined

    updateClusterMeta(cluster.id, {
      customName,
      logoUrl,
      prometheusUrl: trimmedPrometheus || undefined,
      backgroundId: backgroundId || undefined,
      backgroundCustomUrl: backgroundId === 'custom' ? backgroundCustomUrl : undefined,
      backgroundPanelOpacity: backgroundId ? backgroundPanelOpacity : undefined,
      settings: nextSettings,
      environment
    })
    await window.api.clusterStore.update({
      id: cluster.id,
      customName,
      contextName: cluster.contextName,
      source: cluster.source,
      endpoint: cluster.endpoint,
      authFingerprint: cluster.authFingerprint,
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
      environment,
      localKubeconfigPath: cluster.localKubeconfigPath,
      lastOpenedAt: cluster.lastOpenedAt,
      settings: nextSettings
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
    if (!cluster || !kubeconfigEditable) return
    if (kubeconfigDraft.trim() === kubeconfigYaml.trim()) {
      message.info(t('clusterEdit.noKubeconfigChanges'))
      return
    }
    setKubeconfigBusy(true)
    try {
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
        selectedResourceKind: cluster.selectedResourceKind,
        settings,
        environment: settings.general.environment || undefined
      })
      message.success(t('clusterEdit.kubeconfigSaved'))
      setKubeconfigYaml(kubeconfigDraft)
      if (cluster.status === 'connected') message.info(t('clusterEdit.reconnectHint'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setKubeconfigBusy(false)
    }
  }

  function renderBody(): React.JSX.Element | null {
    if (!cluster) return null
    if (section === 'appearance') {
      return (
        <div className="ml-cluster-settings-stack">
          <section className="ml-settings-section">
            <header className="ml-settings-section__head">
              <div className="ml-settings-section__copy">
                <Typography.Text strong>{t('clusterEdit.displayName')}</Typography.Text>
              </div>
            </header>
            <div className="ml-settings-section__body">
              <div className="ml-settings-row ml-settings-row--stacked">
                <Space align="start" size="middle" style={{ width: '100%' }}>
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
                      onChange={(e) => void handleLogoSelected(e)}
                    />
                  </div>
                </Space>
              </div>
            </div>
          </section>
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
      )
    }

    if (section === 'proxy') {
      return (
        <div className="ml-cluster-settings-stack">
          <ClusterSettingsSectionBody
            section="proxy"
            settings={settings}
            patch={patchSettings}
            cluster={cluster}
            prometheusUrl={prometheusUrl}
            setPrometheusUrl={setPrometheusUrl}
            onDiscover={() => void handleDiscover()}
            discovering={discovering}
          />
          <section className="ml-settings-section">
            <header className="ml-settings-section__head">
              <div className="ml-settings-section__copy">
                <Typography.Text strong>{t('vpn.clusterLink.title')}</Typography.Text>
                <Typography.Text type="secondary" className="ml-settings-section__desc">
                  {t('vpn.clusterLink.hint')}
                </Typography.Text>
              </div>
            </header>
            <div className="ml-settings-section__body">
              <div className="ml-settings-row ml-settings-row--stacked">
                <Select
                  allowClear
                  placeholder={t('vpn.clusterLink.placeholder')}
                  style={{ width: '100%' }}
                  value={linkedVpnProfileId ?? ''}
                  options={vpnProfileOptions}
                  onChange={(value) => setLinkedVpnProfileId(value ? value : null)}
                />
              </div>
            </div>
          </section>
        </div>
      )
    }

    if (section === 'kubeconfig') {
      return (
        <section className="ml-settings-section">
          <header className="ml-settings-section__head">
            <div className="ml-settings-section__copy">
              <Typography.Text strong>{t('clusterEdit.kubeconfig')}</Typography.Text>
              <Typography.Text type="secondary" className="ml-settings-section__desc">
                {t('clusterEdit.kubeconfigHint')}
              </Typography.Text>
            </div>
            <Tag>
              {cluster.source.type === 'file'
                ? t('clusterEdit.kubeconfigScopedFile')
                : t('clusterEdit.kubeconfigScopedInline')}
            </Tag>
          </header>
          <div className="ml-settings-section__body">
            <div className="ml-settings-row">
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
                  onClick={() => void openKubeconfig({ editable: true })}
                >
                  {t('clusterEdit.editYaml')}
                </Button>
              </Space>
            </div>
          </div>
        </section>
      )
    }

    if (section === 'metrics') {
      return (
        <div className="ml-cluster-settings-stack">
          <div className="ml-cluster-settings-metrics-status">{statusTag(prometheusStatus, t)}</div>
          <ClusterSettingsSectionBody
            section="metrics"
            settings={settings}
            patch={patchSettings}
            cluster={cluster}
            prometheusUrl={prometheusUrl}
            setPrometheusUrl={setPrometheusUrl}
            onDiscover={() => void handleDiscover()}
            discovering={discovering}
          />
        </div>
      )
    }

    return (
      <ClusterSettingsSectionBody
        section={section}
        settings={settings}
        patch={patchSettings}
        cluster={cluster}
        prometheusUrl={prometheusUrl}
        setPrometheusUrl={setPrometheusUrl}
        onDiscover={() => void handleDiscover()}
        discovering={discovering}
      />
    )
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
          body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
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
        <div className={`ml-cluster-settings${layoutMode === 'mobile' ? ' ml-cluster-settings--mobile' : ''}`}>
          <aside className="ml-cluster-settings-nav" aria-label={t('clusterEdit.title')}>
            <div className="ml-cluster-settings-nav__search">
              <Input.Search
                allowClear
                size="small"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder={t('clusterEdit.searchSections')}
                aria-label={t('clusterEdit.searchSections')}
              />
            </div>
            <div className="ml-cluster-settings-nav__list">
              {filteredNavItems.length === 0 ? (
                <div className="ml-cluster-settings-nav__empty">{t('clusterEdit.noSectionMatch')}</div>
              ) : (
                filteredNavItems.map((item) => {
                  const NavIcon = NAV_ICONS[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ml-cluster-settings-nav__item${section === item.id ? ' is-active' : ''}`}
                      onClick={() => setSection(item.id)}
                    >
                      <Icon icon={NavIcon} variant="detail" />
                      <span>{item.label}</span>
                    </button>
                  )
                })
              )}
            </div>
          </aside>
          <div className="ml-cluster-settings-main">
            <header className="ml-cluster-settings-main__header">
              <Typography.Title level={5} style={{ margin: 0 }}>
                {navItems.find((n) => n.id === section)?.label}
              </Typography.Title>
            </header>
            <div className="ml-cluster-settings-main__body">{renderBody()}</div>
          </div>
        </div>
      </Drawer>

      <LogoCropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onSave={(url) => { setLogoUrl(url); setCropSource(null) }} />

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
