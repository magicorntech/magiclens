import { Button, Input, InputNumber, Select, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ClusterSettings, ClusterSettingsSectionId } from '@shared/types/clusterSettings'
import { DEFAULT_NODE_SHELL_IMAGE } from '@shared/types/clusterSettings'
import type { ClusterEntry } from '../../stores/clusterStore'
import { SettingsRow, SettingsSection, SettingsToggleRow } from '../Layout/SettingsPrimitives'

type PatchFn = <K extends keyof ClusterSettings>(
  section: K,
  patch: Partial<ClusterSettings[K]>
) => void

interface SectionProps {
  settings: ClusterSettings
  patch: PatchFn
  cluster: ClusterEntry
}

function GeneralSection({ settings, patch, cluster }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const g = settings.general
  return (
    <>
      <SettingsSection title={t('clusterSettings.general.infoTitle')} description={t('clusterSettings.general.infoHint')}>
        <SettingsRow title={t('clusterSettings.general.context')} control={<Tag>{cluster.contextName}</Tag>} />
        <SettingsRow
          title={t('clusterSettings.general.endpoint')}
          control={<span className="ml-cluster-settings-mono">{cluster.endpoint || '—'}</span>}
        />
        <SettingsRow
          title={t('clusterSettings.general.version')}
          control={<span>{cluster.serverVersion || '—'}</span>}
        />
        <SettingsRow title={t('clusterSettings.general.clusterId')} control={<Tag>{cluster.id.slice(0, 8)}…</Tag>} />
        <SettingsRow
          title={t('clusterSettings.general.status')}
          control={<Tag>{cluster.status}</Tag>}
        />
        <SettingsRow
          title={t('clusterSettings.general.lastOpened')}
          control={<span>{cluster.lastOpenedAt ? new Date(cluster.lastOpenedAt).toLocaleString() : '—'}</span>}
        />
      </SettingsSection>
      <SettingsSection title={t('clusterSettings.general.metaTitle')}>
        <SettingsRow
          title={t('clusterSettings.general.environment')}
          description={t('clusterSettings.general.environmentHint')}
          control={
            <Select
              style={{ width: 160 }}
              value={g.environment || undefined}
              allowClear
              placeholder="—"
              options={[
                { value: 'dev', label: 'Dev' },
                { value: 'staging', label: 'Staging' },
                { value: 'prod', label: 'Prod' },
                { value: 'other', label: 'Other' }
              ]}
              onChange={(v) => patch('general', { environment: (v ?? '') as typeof g.environment })}
            />
          }
        />
        <SettingsRow
          stacked
          title={t('clusterSettings.general.tags')}
          description={t('clusterSettings.general.tagsHint')}
          control={
            <Select
              mode="tags"
              style={{ width: '100%' }}
              value={g.tags}
              tokenSeparators={[',']}
              onChange={(tags) => patch('general', { tags })}
              placeholder={t('clusterSettings.general.tagsPlaceholder')}
            />
          }
        />
        <SettingsRow
          stacked
          title={t('clusterSettings.general.notes')}
          control={
            <Input.TextArea
              rows={3}
              value={g.notes}
              onChange={(e) => patch('general', { notes: e.target.value })}
            />
          }
        />
      </SettingsSection>
    </>
  )
}

function ProxySection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const p = settings.proxy
  return (
    <SettingsSection title={t('clusterSettings.proxy.title')} description={t('clusterSettings.proxy.hint')}>
      <SettingsRow
        stacked
        title="HTTP proxy"
        control={<Input value={p.httpProxy} onChange={(e) => patch('proxy', { httpProxy: e.target.value })} placeholder="http://proxy:8080" />}
      />
      <SettingsRow
        stacked
        title="HTTPS proxy"
        control={<Input value={p.httpsProxy} onChange={(e) => patch('proxy', { httpsProxy: e.target.value })} placeholder="http://proxy:8080" />}
      />
      <SettingsRow
        stacked
        title="No-proxy"
        description={t('clusterSettings.proxy.noProxyHint')}
        control={<Input value={p.noProxy} onChange={(e) => patch('proxy', { noProxy: e.target.value })} placeholder="localhost,127.0.0.1,.svc" />}
      />
      <SettingsRow
        title={t('clusterSettings.proxy.username')}
        control={<Input value={p.username} onChange={(e) => patch('proxy', { username: e.target.value })} style={{ width: 200 }} />}
      />
      <SettingsRow
        title={t('clusterSettings.proxy.password')}
        control={
          <Input.Password value={p.password} onChange={(e) => patch('proxy', { password: e.target.value })} style={{ width: 200 }} />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.proxy.failover')}
        description={t('clusterSettings.proxy.failoverHint')}
        checked={p.failoverEnabled}
        onChange={(failoverEnabled) => patch('proxy', { failoverEnabled })}
      />
    </SettingsSection>
  )
}

function TerminalSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const term = settings.terminal
  return (
    <SettingsSection title={t('clusterSettings.terminal.title')} description={t('clusterSettings.terminal.hint')}>
      <SettingsRow
        title={t('clusterSettings.terminal.shell')}
        control={
          <Select
            style={{ width: 180 }}
            value={term.defaultShell}
            options={[
              { value: '/bin/bash', label: '/bin/bash' },
              { value: '/bin/sh', label: '/bin/sh' },
              { value: '/bin/zsh', label: '/bin/zsh' }
            ]}
            onChange={(defaultShell) => patch('terminal', { defaultShell })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.terminal.cwd')}
        control={
          <Select
            style={{ width: 160 }}
            value={term.workingDirectory}
            options={[
              { value: 'home', label: '$HOME' },
              { value: 'custom', label: t('clusterSettings.terminal.cwdCustom') }
            ]}
            onChange={(workingDirectory) => patch('terminal', { workingDirectory })}
          />
        }
      />
      {term.workingDirectory === 'custom' ? (
        <SettingsRow
          stacked
          title={t('clusterSettings.terminal.cwdPath')}
          control={
            <Input
              value={term.customWorkingDirectory}
              onChange={(e) => patch('terminal', { customWorkingDirectory: e.target.value })}
            />
          }
        />
      ) : null}
      <SettingsRow
        title={t('clusterSettings.terminal.defaultNs')}
        control={
          <Input
            value={term.defaultNamespace}
            onChange={(e) => patch('terminal', { defaultNamespace: e.target.value })}
            placeholder="default"
            style={{ width: 180 }}
          />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.terminal.syncContext')}
        description={t('clusterSettings.terminal.syncContextHint')}
        checked={term.syncKubectlContext}
        onChange={(syncKubectlContext) => patch('terminal', { syncKubectlContext })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.terminal.history')}
        checked={term.keepHistory}
        onChange={(keepHistory) => patch('terminal', { keepHistory })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.terminal.autoComplete')}
        checked={term.autoComplete}
        onChange={(autoComplete) => patch('terminal', { autoComplete })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.terminal.rbac')}
        checked={term.validateRbac}
        onChange={(validateRbac) => patch('terminal', { validateRbac })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.terminal.multiTab')}
        checked={term.multiTab}
        onChange={(multiTab) => patch('terminal', { multiTab })}
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.terminal.env')}
        description={t('clusterSettings.terminal.envHint')}
        control={
          <Input.TextArea
            rows={3}
            value={term.extraEnv}
            onChange={(e) => patch('terminal', { extraEnv: e.target.value })}
            placeholder="KEY=value"
          />
        }
      />
    </SettingsSection>
  )
}

function NamespacesSection({ settings, patch, cluster }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const ns = settings.namespaces
  const available = cluster.namespaces ?? []
  return (
    <SettingsSection title={t('clusterSettings.namespaces.title')} description={t('clusterSettings.namespaces.hint')}>
      <SettingsRow
        title={t('clusterSettings.namespaces.accessible')}
        control={<Tag>{available.length || '—'}</Tag>}
      />
      <SettingsRow
        title={t('clusterSettings.namespaces.default')}
        control={
          <Select
            allowClear
            showSearch
            style={{ width: 200 }}
            value={ns.defaultNamespace || undefined}
            options={available.map((n) => ({ value: n, label: n }))}
            onChange={(v) => patch('namespaces', { defaultNamespace: v ?? '' })}
          />
        }
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.namespaces.pinned')}
        description={t('clusterSettings.namespaces.pinnedHint')}
        control={
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={ns.pinned}
            options={available.map((n) => ({ value: n, label: n }))}
            onChange={(pinned) => patch('namespaces', { pinned })}
          />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.namespaces.rbacFilter')}
        checked={ns.rbacFilter}
        onChange={(rbacFilter) => patch('namespaces', { rbacFilter })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.namespaces.labelGrouping')}
        checked={ns.labelGrouping}
        onChange={(labelGrouping) => patch('namespaces', { labelGrouping })}
      />
    </SettingsSection>
  )
}

function MetricsSection({
  settings,
  patch,
  prometheusUrl,
  setPrometheusUrl,
  onDiscover,
  discovering,
  connected
}: SectionProps & {
  prometheusUrl: string
  setPrometheusUrl: (v: string) => void
  onDiscover: () => void
  discovering: boolean
  connected: boolean
}): React.JSX.Element {
  const { t } = useTranslation()
  const m = settings.metrics
  return (
    <SettingsSection title={t('clusterSettings.metrics.title')} description={t('clusterSettings.metrics.hint')}>
      <SettingsRow
        title={t('clusterSettings.metrics.source')}
        control={
          <Select
            style={{ width: 160 }}
            value={m.source}
            options={[
              { value: 'auto', label: t('clusterSettings.metrics.sourceAuto') },
              { value: 'prometheus', label: 'Prometheus' },
              { value: 'custom', label: t('clusterSettings.metrics.sourceCustom') }
            ]}
            onChange={(source) => patch('metrics', { source })}
          />
        }
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.metrics.endpoint')}
        description={t('clusterEdit.prometheusHint')}
        control={
          <Input
            value={prometheusUrl || m.endpointUrl}
            onChange={(e) => {
              setPrometheusUrl(e.target.value)
              patch('metrics', { endpointUrl: e.target.value })
            }}
            placeholder={t('clusterEdit.prometheusPlaceholder')}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.metrics.scrape')}
        control={
          <InputNumber
            min={5}
            max={300}
            value={m.scrapeIntervalSec}
            onChange={(v) => patch('metrics', { scrapeIntervalSec: Number(v) || 30 })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.metrics.timeout')}
        control={
          <InputNumber
            min={5}
            max={120}
            value={m.queryTimeoutSec}
            onChange={(v) => patch('metrics', { queryTimeoutSec: Number(v) || 15 })}
          />
        }
      />
      <SettingsToggleRow title="HTTPS" checked={m.https} onChange={(https) => patch('metrics', { https })} />
      <SettingsRow
        title={t('clusterSettings.metrics.auth')}
        control={
          <Select
            style={{ width: 140 }}
            value={m.authType}
            options={[
              { value: 'none', label: t('clusterSettings.metrics.authNone') },
              { value: 'basic', label: 'Basic' },
              { value: 'bearer', label: 'Bearer' }
            ]}
            onChange={(authType) => patch('metrics', { authType })}
          />
        }
      />
      {m.authType === 'basic' ? (
        <>
          <SettingsRow
            title={t('clusterSettings.proxy.username')}
            control={<Input value={m.authUser} onChange={(e) => patch('metrics', { authUser: e.target.value })} style={{ width: 180 }} />}
          />
          <SettingsRow
            title={t('clusterSettings.proxy.password')}
            control={
              <Input.Password
                value={m.authPassword}
                onChange={(e) => patch('metrics', { authPassword: e.target.value })}
                style={{ width: 180 }}
              />
            }
          />
        </>
      ) : null}
      {m.authType === 'bearer' ? (
        <SettingsRow
          stacked
          title="Bearer token"
          control={<Input.TextArea rows={2} value={m.authBearer} onChange={(e) => patch('metrics', { authBearer: e.target.value })} />}
        />
      ) : null}
      <SettingsRow
        stacked
        title={t('clusterSettings.metrics.pathPrefix')}
        control={<Input value={m.pathPrefix} onChange={(e) => patch('metrics', { pathPrefix: e.target.value })} placeholder="/prometheus" />}
      />
      <SettingsToggleRow
        title={t('clusterSettings.metrics.hideUnused')}
        checked={m.hideUnused}
        onChange={(hideUnused) => patch('metrics', { hideUnused })}
      />
      <div className="ml-settings-row">
        <Button size="small" loading={discovering} disabled={!connected} onClick={onDiscover}>
          {t('clusterSettings.metrics.testQuery')}
        </Button>
      </div>
    </SettingsSection>
  )
}

function LensMetricsSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const lm = settings.lensMetrics
  return (
    <SettingsSection title={t('clusterSettings.lensMetrics.title')} description={t('clusterSettings.lensMetrics.hint')}>
      <SettingsToggleRow
        title={t('clusterSettings.lensMetrics.enabled')}
        checked={lm.enabled}
        onChange={(enabled) => patch('lensMetrics', { enabled })}
      />
      <SettingsToggleRow
        title="kube-state-metrics"
        checked={lm.kubeStateMetrics}
        onChange={(kubeStateMetrics) => patch('lensMetrics', { kubeStateMetrics })}
        disabled={!lm.enabled}
      />
      <SettingsToggleRow
        title="node-exporter"
        checked={lm.nodeExporter}
        onChange={(nodeExporter) => patch('lensMetrics', { nodeExporter })}
        disabled={!lm.enabled}
      />
      <SettingsToggleRow
        title={t('clusterSettings.lensMetrics.autoInstall')}
        checked={lm.autoInstall}
        onChange={(autoInstall) => patch('lensMetrics', { autoInstall })}
        disabled={!lm.enabled}
      />
      <SettingsToggleRow
        title={t('clusterSettings.lensMetrics.autoUpgrade')}
        checked={lm.autoUpgrade}
        onChange={(autoUpgrade) => patch('lensMetrics', { autoUpgrade })}
        disabled={!lm.enabled}
      />
    </SettingsSection>
  )
}

function NodeShellSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const ns = settings.nodeShell
  return (
    <SettingsSection title={t('clusterSettings.nodeShell.title')} description={t('clusterSettings.nodeShell.hint')}>
      <SettingsRow
        stacked
        title={t('clusterSettings.nodeShell.image')}
        description={t('clusterSettings.nodeShell.imageHint', { default: DEFAULT_NODE_SHELL_IMAGE })}
        control={
          <Input
            value={ns.image}
            onChange={(e) => patch('nodeShell', { image: e.target.value })}
            placeholder={DEFAULT_NODE_SHELL_IMAGE}
            addonAfter={
              <button
                type="button"
                className="ml-cluster-settings-reset"
                onClick={() => patch('nodeShell', { image: DEFAULT_NODE_SHELL_IMAGE })}
              >
                {t('clusterSettings.nodeShell.resetDefault')}
              </button>
            }
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.nodeShell.pullPolicy')}
        control={
          <Select
            style={{ width: 160 }}
            value={ns.pullPolicy}
            options={[
              { value: 'IfNotPresent', label: 'IfNotPresent' },
              { value: 'Always', label: 'Always' },
              { value: 'Never', label: 'Never' }
            ]}
            onChange={(pullPolicy) => patch('nodeShell', { pullPolicy })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.nodeShell.pullSecret')}
        control={
          <Input
            value={ns.pullSecret}
            onChange={(e) => patch('nodeShell', { pullSecret: e.target.value })}
            style={{ width: 200 }}
            placeholder="optional"
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.nodeShell.cpuLimit')}
        control={
          <Input value={ns.cpuLimit} onChange={(e) => patch('nodeShell', { cpuLimit: e.target.value })} style={{ width: 120 }} />
        }
      />
      <SettingsRow
        title={t('clusterSettings.nodeShell.memoryLimit')}
        control={
          <Input
            value={ns.memoryLimit}
            onChange={(e) => patch('nodeShell', { memoryLimit: e.target.value })}
            style={{ width: 120 }}
          />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.nodeShell.privileged')}
        checked={ns.privileged}
        onChange={(privileged) => patch('nodeShell', { privileged })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.nodeShell.runAsRoot')}
        checked={ns.runAsRoot}
        onChange={(runAsRoot) => patch('nodeShell', { runAsRoot })}
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.nodeShell.nodeSelector')}
        description={t('clusterSettings.nodeShell.nodeSelectorHint')}
        control={
          <Input
            value={ns.nodeSelector}
            onChange={(e) => patch('nodeShell', { nodeSelector: e.target.value })}
            placeholder='kubernetes.io/os=linux'
          />
        }
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.nodeShell.tolerations')}
        description={t('clusterSettings.nodeShell.tolerationsHint')}
        control={
          <Input.TextArea
            rows={3}
            value={ns.tolerationsJson}
            onChange={(e) => patch('nodeShell', { tolerationsJson: e.target.value })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.nodeShell.cleanupTtl')}
        control={
          <InputNumber
            min={0}
            max={86400}
            value={ns.cleanupTtlSec}
            onChange={(v) => patch('nodeShell', { cleanupTtlSec: Number(v) || 0 })}
          />
        }
      />
    </SettingsSection>
  )
}

function SecuritySection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const s = settings.security
  return (
    <SettingsSection title={t('clusterSettings.security.title')} description={t('clusterSettings.security.hint')}>
      <SettingsToggleRow
        title={t('clusterSettings.security.rbacViewer')}
        checked={s.showRbacViewer}
        onChange={(showRbacViewer) => patch('security', { showRbacViewer })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.security.encrypt')}
        description={t('clusterSettings.security.encryptHint')}
        checked={s.encryptKubeconfigAtRest}
        onChange={(encryptKubeconfigAtRest) => patch('security', { encryptKubeconfigAtRest })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.security.audit')}
        checked={s.clientAuditLog}
        onChange={(clientAuditLog) => patch('security', { clientAuditLog })}
      />
    </SettingsSection>
  )
}

function NetworkSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const n = settings.network
  return (
    <SettingsSection title={t('clusterSettings.network.title')} description={t('clusterSettings.network.hint')}>
      <SettingsRow
        title={t('clusterSettings.network.domain')}
        control={
          <Input value={n.clusterDomain} onChange={(e) => patch('network', { clusterDomain: e.target.value })} style={{ width: 200 }} />
        }
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.network.serviceCidr')}
        control={<Input value={n.serviceCidr} onChange={(e) => patch('network', { serviceCidr: e.target.value })} placeholder="10.96.0.0/12" />}
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.network.podCidr')}
        control={<Input value={n.podCidr} onChange={(e) => patch('network', { podCidr: e.target.value })} placeholder="10.244.0.0/16" />}
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.network.dnsNotes')}
        control={<Input.TextArea rows={2} value={n.dnsNotes} onChange={(e) => patch('network', { dnsNotes: e.target.value })} />}
      />
    </SettingsSection>
  )
}

function StorageSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const s = settings.storage
  return (
    <SettingsSection title={t('clusterSettings.storage.title')} description={t('clusterSettings.storage.hint')}>
      <SettingsRow
        title={t('clusterSettings.storage.defaultClass')}
        control={
          <Input
            value={s.defaultStorageClass}
            onChange={(e) => patch('storage', { defaultStorageClass: e.target.value })}
            style={{ width: 200 }}
          />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.storage.snapshots')}
        checked={s.volumeSnapshots}
        onChange={(volumeSnapshots) => patch('storage', { volumeSnapshots })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.storage.csi')}
        checked={s.showCsiDrivers}
        onChange={(showCsiDrivers) => patch('storage', { showCsiDrivers })}
      />
    </SettingsSection>
  )
}

function IntegrationsSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const i = settings.integrations
  return (
    <SettingsSection title={t('clusterSettings.integrations.title')} description={t('clusterSettings.integrations.hint')}>
      {(
        [
          ['grafanaUrl', 'Grafana'],
          ['lokiUrl', 'Loki'],
          ['jaegerUrl', 'Jaeger'],
          ['alertmanagerUrl', 'Alertmanager'],
          ['webhookUrl', 'Webhook']
        ] as const
      ).map(([key, label]) => (
        <SettingsRow
          key={key}
          stacked
          title={label}
          control={<Input value={i[key]} onChange={(e) => patch('integrations', { [key]: e.target.value })} placeholder="https://" />}
        />
      ))}
    </SettingsSection>
  )
}

function PerformanceSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const p = settings.performance
  return (
    <SettingsSection title={t('clusterSettings.performance.title')} description={t('clusterSettings.performance.hint')}>
      <SettingsRow
        title={t('clusterSettings.performance.rateLimit')}
        control={
          <InputNumber min={1} max={500} value={p.apiRateLimit} onChange={(v) => patch('performance', { apiRateLimit: Number(v) || 50 })} />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.performance.cache')}
        checked={p.cacheEnabled}
        onChange={(cacheEnabled) => patch('performance', { cacheEnabled })}
      />
      <SettingsRow
        title={t('clusterSettings.performance.refresh')}
        control={
          <InputNumber
            min={1}
            max={120}
            value={p.refreshIntervalSec}
            onChange={(v) => patch('performance', { refreshIntervalSec: Number(v) || 5 })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.performance.concurrency')}
        control={
          <InputNumber min={1} max={64} value={p.concurrency} onChange={(v) => patch('performance', { concurrency: Number(v) || 8 })} />
        }
      />
    </SettingsSection>
  )
}

function UiSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const ui = settings.ui
  return (
    <SettingsSection title={t('clusterSettings.ui.title')} description={t('clusterSettings.ui.hint')}>
      <SettingsRow
        title={t('clusterSettings.ui.density')}
        control={
          <Select
            style={{ width: 160 }}
            value={ui.tableDensity}
            options={[
              { value: 'comfortable', label: t('clusterSettings.ui.comfortable') },
              { value: 'compact', label: t('clusterSettings.ui.compact') }
            ]}
            onChange={(tableDensity) => patch('ui', { tableDensity })}
          />
        }
      />
      <SettingsRow
        title={t('clusterSettings.ui.defaultView')}
        control={
          <Input
            value={ui.defaultView}
            onChange={(e) => patch('ui', { defaultView: e.target.value })}
            placeholder="Pods"
            style={{ width: 160 }}
          />
        }
      />
      <SettingsToggleRow
        title={t('clusterSettings.ui.favoritesFirst')}
        checked={ui.favoritesFirst}
        onChange={(favoritesFirst) => patch('ui', { favoritesFirst })}
      />
    </SettingsSection>
  )
}

function DebugSection({ settings, patch }: SectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const d = settings.debug
  return (
    <SettingsSection title={t('clusterSettings.debug.title')} description={t('clusterSettings.debug.hint')}>
      <SettingsToggleRow
        title={t('clusterSettings.debug.kubectlProxy')}
        checked={d.kubectlProxy}
        onChange={(kubectlProxy) => patch('debug', { kubectlProxy })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.debug.apiInspector')}
        checked={d.apiInspector}
        onChange={(apiInspector) => patch('debug', { apiInspector })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.debug.clientLogs')}
        checked={d.clientLogs}
        onChange={(clientLogs) => patch('debug', { clientLogs })}
      />
      <SettingsToggleRow
        title={t('clusterSettings.debug.experimental')}
        checked={d.experimental}
        onChange={(experimental) => patch('debug', { experimental })}
      />
      <SettingsRow
        stacked
        title={t('clusterSettings.debug.featureFlags')}
        control={
          <Input.TextArea
            rows={2}
            value={d.featureFlags}
            onChange={(e) => patch('debug', { featureFlags: e.target.value })}
            placeholder="flag=true"
          />
        }
      />
    </SettingsSection>
  )
}

export function ClusterSettingsSectionBody(props: {
  section: ClusterSettingsSectionId
  settings: ClusterSettings
  patch: PatchFn
  cluster: ClusterEntry
  prometheusUrl: string
  setPrometheusUrl: (v: string) => void
  onDiscover: () => void
  discovering: boolean
}): React.JSX.Element {
  const base = {
    settings: props.settings,
    patch: props.patch,
    cluster: props.cluster
  }
  switch (props.section) {
    case 'general':
      return <GeneralSection {...base} />
    case 'proxy':
      return <ProxySection {...base} />
    case 'terminal':
      return <TerminalSection {...base} />
    case 'namespaces':
      return <NamespacesSection {...base} />
    case 'metrics':
      return (
        <MetricsSection
          {...base}
          prometheusUrl={props.prometheusUrl}
          setPrometheusUrl={props.setPrometheusUrl}
          onDiscover={props.onDiscover}
          discovering={props.discovering}
          connected={props.cluster.status === 'connected'}
        />
      )
    case 'lensMetrics':
      return <LensMetricsSection {...base} />
    case 'nodeShell':
      return <NodeShellSection {...base} />
    case 'security':
      return <SecuritySection {...base} />
    case 'network':
      return <NetworkSection {...base} />
    case 'storage':
      return <StorageSection {...base} />
    case 'integrations':
      return <IntegrationsSection {...base} />
    case 'performance':
      return <PerformanceSection {...base} />
    case 'ui':
      return <UiSection {...base} />
    case 'debug':
      return <DebugSection {...base} />
  }
}
