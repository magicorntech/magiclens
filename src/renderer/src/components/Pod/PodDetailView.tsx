import { useMemo, useState } from 'react'
import { Alert, Dropdown, Modal, Progress, Table, Tabs, Tag, Typography, message } from 'antd'
import type { MenuProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQueryClient } from '@tanstack/react-query'
import {
  Copy,
  Eye,
  EyeOff,
  FileCode2,
  RotateCw,
  ScrollText,
  TerminalSquare,
  Trash2
} from 'lucide-react'
import type {
  PodContainerInfo,
  PodDetailData,
  PodEnvVar,
  PodProbeInfo,
  PodResourceQuantities,
  PodVolumeInfo
} from '@shared/types/pod'
import { isPodDetailData } from '@shared/types/pod'
import type { ResourceListItem } from '@shared/types/resource'
import { DEFAULT_METRICS_TIME_RANGE } from '@shared/metricsTimeRange'
import { useTranslation } from 'react-i18next'
import { usePodDetail } from '../../queries/usePodDetail'
import { usePodMetricsRange } from '../../queries/useMetricsRange'
import { useResourceManifest } from '../../queries/useResourceManifest'
import { formatBytes } from '../../format'
import { AgeCell } from '../ResourceTable/AgeCell'
import { StatusTag } from '../ResourceTable/StatusTag'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { latestDiskSnapshots } from '../Metrics/DiskUsageSummary'
import { PodMetricsPanel } from './PodMetricsPanel'
import { PodNetworkPanel } from './PodNetworkPanel'
import { PodLogsPanel } from './PodLogsPanel'
import { PodExecPanel } from './PodExecPanel'
import { ResourceNotesTab } from '../Notes/ResourceNotesTab'
import { Icon } from '../ui/Icon'
import { computePodInsights } from './podInsights'

interface PodDetailViewProps {
  clusterId: string
  item: ResourceListItem
  isActive: boolean
  listQueryKey?: unknown[]
  onClose: () => void
}

function formatQuantities(q: PodResourceQuantities | undefined): string {
  if (!q) return '—'
  const parts: string[] = []
  if (q.cpu) parts.push(`CPU ${q.cpu}`)
  if (q.memory) parts.push(`Mem ${q.memory}`)
  if (q.ephemeralStorage) parts.push(`Eph ${q.ephemeralStorage}`)
  return parts.length ? parts.join(' · ') : '—'
}

function Section({
  title,
  extra,
  children
}: {
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="ml-pod-section">
      <div className="ml-pod-section__head">
        <span className="ml-pod-section__title">{title}</span>
        {extra}
      </div>
      <div className="ml-pod-section__body">{children}</div>
    </section>
  )
}

function FactGrid({ facts }: { facts: { label: string; value: React.ReactNode }[] }): React.JSX.Element {
  return (
    <div className="ml-pod-facts">
      {facts.map((f) => (
        <div className="ml-pod-fact" key={f.label}>
          <span className="ml-pod-fact__label">{f.label}</span>
          <span className="ml-pod-fact__value">{f.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

function Chips({ data }: { data: Record<string, string> | undefined }): React.JSX.Element {
  const entries = Object.entries(data ?? {})
  if (!entries.length) return <span className="ml-pod-empty">—</span>
  return (
    <div className="ml-pod-chips">
      {entries.map(([k, v]) => (
        <span className="ml-pod-chip" key={k} title={v ? `${k}=${v}` : k}>
          {k}
          {v ? <span className="ml-pod-chip__v">{v}</span> : null}
        </span>
      ))}
    </div>
  )
}

function KVList({
  data,
  empty
}: {
  data: Record<string, string> | undefined
  empty: string
}): React.JSX.Element {
  const entries = Object.entries(data ?? {})
  if (!entries.length) return <span className="ml-pod-empty">{empty}</span>
  return (
    <dl className="ml-pod-kv">
      {entries.map(([k, v]) => (
        <div key={k} className="ml-pod-kv__row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function stateColor(state: string): string {
  if (state === 'Running') return 'green'
  if (state === 'Completed' || state === 'Succeeded') return 'blue'
  if (state === 'Waiting' || state === 'PodInitializing' || state === 'ContainerCreating') return 'gold'
  return 'red'
}

function ContainerCard({
  c,
  t
}: {
  c: PodContainerInfo
  t: (k: string, v?: Record<string, unknown>) => string
}): React.JSX.Element {
  const ports = c.ports ?? []
  const probes = c.probes ?? []
  const env = c.env ?? []
  const mounts = c.mounts ?? []

  return (
    <div className="ml-pod-container-card">
      <div className="ml-pod-container-card__head">
        <span className="ml-pod-container-card__name">{c.name}</span>
        {c.isInit ? <Tag>{t('podDetail.containers.init')}</Tag> : null}
        <Tag color={stateColor(c.state)}>{c.state}</Tag>
        <Tag color={c.ready ? 'green' : 'default'}>
          {c.ready ? t('podDetail.containers.ready') : t('podDetail.containers.notReady')}
        </Tag>
        {(c.restartCount ?? 0) > 0 ? (
          <Tag color={(c.restartCount ?? 0) >= 5 ? 'red' : 'gold'}>
            {t('podDetail.containers.restarts', { count: c.restartCount })}
          </Tag>
        ) : null}
      </div>

      <FactGrid
        facts={[
          { label: t('podDetail.containers.image'), value: <span className="ml-pod-mono">{c.image}</span> },
          { label: t('podDetail.containers.pullPolicy'), value: c.imagePullPolicy },
          { label: t('podDetail.containers.requests'), value: formatQuantities(c.requests) },
          { label: t('podDetail.containers.limits'), value: formatQuantities(c.limits) },
          ...(c.stateMessage ? [{ label: t('podDetail.containers.message'), value: c.stateMessage }] : []),
          ...(c.lastTerminatedReason
            ? [
                {
                  label: t('podDetail.containers.lastState'),
                  value: `${c.lastTerminatedReason}${
                    c.lastTerminatedExitCode !== undefined ? ` (exit ${c.lastTerminatedExitCode})` : ''
                  }`
                }
              ]
            : [])
        ]}
      />

      {ports.length > 0 ? (
        <div className="ml-pod-subblock">
          <span className="ml-pod-subblock__label">{t('podDetail.containers.ports')}</span>
          <div className="ml-pod-chips">
            {ports.map((p) => (
              <span className="ml-pod-chip" key={`${p.containerPort}-${p.protocol}`}>
                {p.name ? `${p.name} ` : ''}
                {p.containerPort}/{p.protocol}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {probes.length > 0 ? (
        <div className="ml-pod-subblock">
          <span className="ml-pod-subblock__label">{t('podDetail.health.title')}</span>
          <div className="ml-pod-probes">
            {probes.map((p) => (
              <ProbeRow key={p.type} p={p} t={t} />
            ))}
          </div>
        </div>
      ) : null}

      {env.length > 0 ? (
        <div className="ml-pod-subblock">
          <span className="ml-pod-subblock__label">
            {t('podDetail.containers.env')} ({env.length})
          </span>
          <div className="ml-pod-scroll">
            <EnvList env={env} />
          </div>
        </div>
      ) : null}

      {mounts.length > 0 ? (
        <div className="ml-pod-subblock">
          <span className="ml-pod-subblock__label">{t('podDetail.storage.mounts')}</span>
          <dl className="ml-pod-kv">
            {mounts.map((m) => (
              <div key={`${m.name}-${m.mountPath}`} className="ml-pod-kv__row">
                <dt>{m.name}</dt>
                <dd>
                  <span className="ml-pod-mono">{m.mountPath}</span>
                  {m.readOnly ? <Tag style={{ marginLeft: 6 }}>ro</Tag> : null}
                  {m.subPath ? (
                    <Typography.Text type="secondary"> · subPath {m.subPath}</Typography.Text>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {c.securityContext ? (
        <div className="ml-pod-subblock">
          <span className="ml-pod-subblock__label">{t('podDetail.security.container')}</span>
          <SecurityFacts sc={c.securityContext} t={t} />
        </div>
      ) : null}
    </div>
  )
}

function ProbeRow({
  p,
  t
}: {
  p: PodProbeInfo
  t: (k: string, v?: Record<string, unknown>) => string
}): React.JSX.Element {
  const timing = [
    p.initialDelaySeconds !== undefined ? `delay ${p.initialDelaySeconds}s` : null,
    p.periodSeconds !== undefined ? `period ${p.periodSeconds}s` : null,
    p.timeoutSeconds !== undefined ? `timeout ${p.timeoutSeconds}s` : null,
    p.failureThreshold !== undefined ? `fail ×${p.failureThreshold}` : null
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="ml-pod-probe">
      <Tag color="geekblue">{t(`podDetail.health.${p.type}`)}</Tag>
      <span className="ml-pod-mono">{p.handler}</span>
      {timing ? <Typography.Text type="secondary">{timing}</Typography.Text> : null}
    </div>
  )
}

function EnvList({ env }: { env: PodEnvVar[] }): React.JSX.Element {
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())

  function toggle(name: string): void {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <dl className="ml-pod-kv">
      {env.map((e) => {
        const isSource = !!e.source
        const open = revealed.has(e.name)
        const secretText = e.source ?? e.value ?? '""'
        return (
          <div key={e.name} className="ml-pod-kv__row">
            <dt>{e.name}</dt>
            <dd className="ml-pod-env-value">
              {isSource && open ? (
                <Typography.Text type="secondary" italic>
                  {e.source}
                </Typography.Text>
              ) : open ? (
                <span className="ml-pod-mono">{secretText}</span>
              ) : (
                <span className="ml-pod-mono ml-pod-env-masked">••••••••</span>
              )}
              <button
                type="button"
                className="ml-pod-env-reveal"
                aria-label={open ? 'Hide value' : 'Show value'}
                aria-pressed={open}
                onClick={() => toggle(e.name)}
              >
                <Icon icon={open ? EyeOff : Eye} variant="micro" />
              </button>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function SecurityFacts({
  sc,
  t
}: {
  sc: NonNullable<PodDetailData['securityContext']>
  t: (k: string, v?: Record<string, unknown>) => string
}): React.JSX.Element {
  const facts: { label: string; value: React.ReactNode }[] = []
  if (sc.runAsUser !== undefined) facts.push({ label: 'runAsUser', value: String(sc.runAsUser) })
  if (sc.runAsGroup !== undefined) facts.push({ label: 'runAsGroup', value: String(sc.runAsGroup) })
  if (sc.fsGroup !== undefined) facts.push({ label: 'fsGroup', value: String(sc.fsGroup) })
  if (sc.runAsNonRoot !== undefined)
    facts.push({ label: 'runAsNonRoot', value: sc.runAsNonRoot ? '✓' : '✗' })
  if (sc.readOnlyRootFilesystem !== undefined)
    facts.push({ label: 'readOnlyRootFS', value: sc.readOnlyRootFilesystem ? '✓' : '✗' })
  if (sc.privileged !== undefined)
    facts.push({
      label: 'privileged',
      value: sc.privileged ? <Tag color="red">true</Tag> : 'false'
    })
  if (sc.allowPrivilegeEscalation !== undefined)
    facts.push({ label: 'allowPrivEsc', value: sc.allowPrivilegeEscalation ? 'true' : 'false' })
  if (sc.seccompProfile) facts.push({ label: 'seccomp', value: sc.seccompProfile })
  if (sc.capabilitiesAdd?.length) facts.push({ label: 'cap.add', value: sc.capabilitiesAdd.join(', ') })
  if (sc.capabilitiesDrop?.length) facts.push({ label: 'cap.drop', value: sc.capabilitiesDrop.join(', ') })
  if (!facts.length) return <span className="ml-pod-empty">{t('podDetail.security.none')}</span>
  return <FactGrid facts={facts} />
}

export function PodDetailView({
  clusterId,
  item,
  isActive,
  listQueryKey,
  onClose
}: PodDetailViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const namespace = item.namespace
  const podName = item.name

  const { data: detail, isLoading } = usePodDetail(clusterId, namespace, podName, isActive)
  const { data: volumeRange } = usePodMetricsRange(
    clusterId,
    namespace,
    podName,
    DEFAULT_METRICS_TIME_RANGE,
    isActive && activeTab === 'overview'
  )
  const volumeSnapshots = useMemo(
    () =>
      latestDiskSnapshots(
        volumeRange?.volumePercent,
        volumeRange?.volumeUsageBytes,
        volumeRange?.volumeCapacityBytes
      ),
    [volumeRange]
  )
  const volumeByPvc = useMemo(() => {
    const map = new Map(volumeSnapshots.map((s) => [s.name, s]))
    return map
  }, [volumeSnapshots])
  const yamlEnabled = isActive && activeTab === 'yaml'
  const { data: manifest, isLoading: manifestLoading, error: manifestError } = useResourceManifest(
    clusterId,
    'Pods',
    podName,
    namespace,
    yamlEnabled
  )

  const insights = useMemo(
    () => (isPodDetailData(detail) ? computePodInsights(detail, t) : []),
    [detail, t]
  )

  const target = { type: 'builtin' as const, kind: 'Pods' as const }

  async function runDelete(): Promise<void> {
    try {
      const res = await window.api.resource.delete({ clusterId, namespace, name: podName, target })
      if ('error' in res) {
        message.error(t('podDetail.actions.deleteFailed', { error: res.error }))
        return
      }
      message.success(t('podDetail.actions.deleted', { name: podName }))
      if (listQueryKey) await queryClient.invalidateQueries({ queryKey: listQueryKey })
      onClose()
    } catch (err) {
      message.error(t('podDetail.actions.deleteFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  function confirmDelete(): void {
    Modal.confirm({
      title: t('podDetail.actions.deleteTitle', { name: podName }),
      content: t('podDetail.actions.deleteBody'),
      okText: t('podDetail.actions.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: runDelete
    })
  }

  function confirmRestart(): void {
    const controlled =
      isPodDetailData(detail) && (detail.ownerReferences ?? []).some((o) => o.controller)
    Modal.confirm({
      title: t('podDetail.actions.restartTitle', { name: podName }),
      content: controlled
        ? t('podDetail.actions.restartBody')
        : t('podDetail.actions.restartBodyOrphan'),
      okText: t('podDetail.actions.restart'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: runDelete
    })
  }

  async function copyCmd(cmd: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(cmd)
      message.success(t('podDetail.actions.copied'))
    } catch {
      message.error(t('podDetail.actions.copyFailed'))
    }
  }

  const kubectlItems: MenuProps['items'] = [
    { key: 'get', label: t('podDetail.actions.copyGet') },
    { key: 'describe', label: t('podDetail.actions.copyDescribe') },
    { key: 'logs', label: t('podDetail.actions.copyLogs') },
    { key: 'exec', label: t('podDetail.actions.copyExec') },
    { key: 'delete', label: t('podDetail.actions.copyDelete') }
  ]

  function onKubectlClick(key: string): void {
    const ns = `-n ${namespace}`
    const map: Record<string, string> = {
      get: `kubectl get pod ${podName} ${ns} -o yaml`,
      describe: `kubectl describe pod ${podName} ${ns}`,
      logs: `kubectl logs ${podName} ${ns} --all-containers`,
      exec: `kubectl exec -it ${podName} ${ns} -- sh`,
      delete: `kubectl delete pod ${podName} ${ns}`
    }
    void copyCmd(map[key])
  }

  const toolbar = (
    <div className="ml-pod-toolbar">
      <button type="button" className="ml-pod-tool" onClick={() => setActiveTab('logs')}>
        <Icon icon={ScrollText} variant="detail" />
        {t('podDetail.tabs.logs')}
      </button>
      <button type="button" className="ml-pod-tool" onClick={() => setActiveTab('exec')}>
        <Icon icon={TerminalSquare} variant="detail" />
        {t('podDetail.tabs.exec')}
      </button>
      <button type="button" className="ml-pod-tool" onClick={() => setActiveTab('yaml')}>
        <Icon icon={FileCode2} variant="detail" />
        {t('podDetail.tabs.yaml')}
      </button>
      <Dropdown
        menu={{ items: kubectlItems, onClick: ({ key }) => onKubectlClick(key) }}
        trigger={['click']}
      >
        <button type="button" className="ml-pod-tool">
          <Icon icon={Copy} variant="detail" />
          {t('podDetail.actions.kubectl')}
        </button>
      </Dropdown>
      <span className="ml-pod-toolbar__spacer" />
      <button type="button" className="ml-pod-tool ml-pod-tool--warn" onClick={confirmRestart}>
        <Icon icon={RotateCw} variant="detail" />
        {t('podDetail.actions.restart')}
      </button>
      <button type="button" className="ml-pod-tool ml-pod-tool--danger" onClick={confirmDelete}>
        <Icon icon={Trash2} variant="detail" />
        {t('podDetail.actions.delete')}
      </button>
    </div>
  )

  const volumeColumns: ColumnsType<PodVolumeInfo> = [
    { title: t('podDetail.storage.volume'), dataIndex: 'name', key: 'name' },
    { title: t('podDetail.storage.type'), dataIndex: 'type', key: 'type', width: 160 },
    {
      title: t('podDetail.storage.source'),
      dataIndex: 'detail',
      key: 'detail',
      render: (v: string | undefined) => (v ? <span className="ml-pod-mono">{v}</span> : '—')
    },
    {
      title: t('podDetail.storage.usage'),
      key: 'usage',
      width: 180,
      render: (_, vol) => {
        if (vol.type !== 'PersistentVolumeClaim' || !vol.detail) return '—'
        const snap = volumeByPvc.get(vol.detail)
        if (!snap) return '—'
        return (
          <div>
            <Progress
              percent={Math.round(snap.percent)}
              size="small"
              status={snap.percent >= 90 ? 'exception' : undefined}
              format={(p) => `${p}%`}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {snap.usedBytes !== undefined ? formatBytes(snap.usedBytes) : '—'}
              {' / '}
              {snap.sizeBytes !== undefined ? formatBytes(snap.sizeBytes) : '—'}
            </Typography.Text>
          </div>
        )
      }
    }
  ]

  function renderOverview(d: PodDetailData): React.JSX.Element {
    const owners = d.ownerReferences ?? []
    const conditions = d.conditions ?? []
    const affinity = d.affinitySummary ?? []
    const tolerations = d.tolerations ?? []
    const volumes = d.volumes ?? []

    return (
      <div className="ml-pod-overview">
        {insights.length > 0 ? (
          <div className="ml-pod-insights">
            {insights.map((ins) => (
              <Alert key={ins.id} type={ins.level} showIcon message={ins.message} />
            ))}
          </div>
        ) : null}

        <Section title={t('podDetail.overview.title')}>
          <FactGrid
            facts={[
              {
                label: t('podDetail.overview.status'),
                value: <StatusTag text={d.statusText} color={d.statusColor} detail={d.statusDetail} />
              },
              { label: t('podDetail.overview.ready'), value: d.ready ?? '—' },
              {
                label: t('podDetail.overview.restarts'),
                value: String(d.totalRestarts ?? 0)
              },
              { label: t('podDetail.overview.age'), value: <AgeCell timestamp={item.ageTimestamp} /> },
              { label: t('podDetail.overview.node'), value: d.nodeName },
              { label: t('podDetail.overview.podIP'), value: d.podIP },
              { label: t('podDetail.overview.hostIP'), value: d.hostIP },
              { label: t('podDetail.overview.qos'), value: d.qosClass },
              { label: t('podDetail.overview.serviceAccount'), value: d.serviceAccount },
              { label: t('podDetail.overview.priorityClass'), value: d.priorityClass },
              { label: t('podDetail.overview.restartPolicy'), value: d.restartPolicy }
            ]}
          />
        </Section>

        <Section title={t('podDetail.metadata.title')}>
          <FactGrid
            facts={[
              {
                label: t('podDetail.metadata.controlledBy'),
                value: owners.length > 0 ? owners.map((o) => `${o.kind}/${o.name}`).join(', ') : '—'
              },
              { label: 'UID', value: <span className="ml-pod-mono">{d.uid ?? '—'}</span> }
            ]}
          />
          <div className="ml-pod-subblock">
            <span className="ml-pod-subblock__label">{t('podDetail.metadata.labels')}</span>
            <Chips data={d.labels} />
          </div>
          <div className="ml-pod-subblock">
            <span className="ml-pod-subblock__label">{t('podDetail.metadata.annotations')}</span>
            <KVList data={d.annotations} empty="—" />
          </div>
        </Section>

        {conditions.length > 0 ? (
          <Section title={t('podDetail.conditions.title')}>
            <dl className="ml-pod-kv">
              {conditions.map((c) => (
                <div key={c.type} className="ml-pod-kv__row">
                  <dt>
                    {c.type} <Tag color={c.status === 'True' ? 'green' : 'red'}>{c.status}</Tag>
                  </dt>
                  <dd>{c.reason || c.message || '—'}</dd>
                </div>
              ))}
            </dl>
          </Section>
        ) : null}

        <Section title={t('podDetail.scheduling.title')}>
          <FactGrid
            facts={[
              { label: t('podDetail.scheduling.node'), value: d.nodeName },
              {
                label: t('podDetail.scheduling.affinity'),
                value: affinity.length ? affinity.join(', ') : t('podDetail.scheduling.none')
              }
            ]}
          />
          <div className="ml-pod-subblock">
            <span className="ml-pod-subblock__label">{t('podDetail.scheduling.nodeSelector')}</span>
            <Chips data={d.nodeSelector} />
          </div>
          <div className="ml-pod-subblock">
            <span className="ml-pod-subblock__label">{t('podDetail.scheduling.tolerations')}</span>
            {tolerations.length ? (
              <div className="ml-pod-chips">
                {tolerations.map((tol, i) => (
                  <span className="ml-pod-chip" key={i}>
                    {tol.key ?? '*'}
                    {tol.operator ? ` ${tol.operator}` : ''}
                    {tol.value ? `=${tol.value}` : ''}
                    {tol.effect ? ` (${tol.effect})` : ''}
                  </span>
                ))}
              </div>
            ) : (
              <span className="ml-pod-empty">{t('podDetail.scheduling.none')}</span>
            )}
          </div>
        </Section>

        <Section title={t('podDetail.security.title')}>
          <FactGrid facts={[{ label: t('podDetail.overview.serviceAccount'), value: d.serviceAccount }]} />
          <div className="ml-pod-subblock">
            <span className="ml-pod-subblock__label">{t('podDetail.security.pod')}</span>
            {d.securityContext ? (
              <SecurityFacts sc={d.securityContext} t={t} />
            ) : (
              <span className="ml-pod-empty">{t('podDetail.security.none')}</span>
            )}
          </div>
        </Section>

        <Section title={t('podDetail.storage.title')}>
          {volumes.length ? (
            <Table<PodVolumeInfo>
              rowKey="name"
              size="small"
              pagination={false}
              columns={volumeColumns}
              dataSource={volumes}
            />
          ) : (
            <span className="ml-pod-empty">{t('podDetail.storage.none')}</span>
          )}
        </Section>
      </div>
    )
  }

  function renderContainers(d: PodDetailData): React.JSX.Element {
    const containers = d.containers ?? []
    const initContainers = d.initContainers ?? []
    return (
      <div className="ml-pod-overview">
        {initContainers.length > 0 ? (
          <Section title={t('podDetail.containers.initTitle')}>
            <div className="ml-pod-container-list">
              {initContainers.map((c) => (
                <ContainerCard key={c.name} c={c} t={t} />
              ))}
            </div>
          </Section>
        ) : null}
        <Section title={t('podDetail.containers.title')}>
          <div className="ml-pod-container-list">
            {containers.map((c) => (
              <ContainerCard key={c.name} c={c} t={t} />
            ))}
          </div>
        </Section>
      </div>
    )
  }

  const paddedPane = (content: React.ReactNode): React.ReactNode => (
    <div className="ml-pod-pane">{content}</div>
  )
  const fullBleedPane = (content: React.ReactNode): React.ReactNode => (
    <div className="ml-pod-pane ml-pod-pane--full">{content}</div>
  )

  const detailReady = isPodDetailData(detail)

  const tabItems = [
    {
      key: 'overview',
      label: t('podDetail.tabs.overview'),
      children: paddedPane(
        isLoading ? (
          <LoadingState />
        ) : detailReady ? (
          renderOverview(detail)
        ) : (
          <Alert type="error" showIcon message={detail && 'error' in detail ? detail.error : t('podDetail.loadError')} />
        )
      )
    },
    {
      key: 'containers',
      label: t('podDetail.tabs.containers'),
      children: paddedPane(
        isLoading ? <LoadingState /> : detailReady ? renderContainers(detail) : <Alert type="error" showIcon message={t('podDetail.loadError')} />
      )
    },
    {
      key: 'metrics',
      label: t('podDetail.tabs.metrics'),
      children: paddedPane(
        <PodMetricsPanel
          clusterId={clusterId}
          namespace={namespace}
          podName={podName}
          podUid={item.id}
          ageTimestamp={item.ageTimestamp}
          isActive={isActive}
        />
      )
    },
    {
      key: 'network',
      label: t('podDetail.tabs.network'),
      children: paddedPane(
        <PodNetworkPanel clusterId={clusterId} namespace={namespace} podName={podName} isActive={isActive} />
      )
    },
    {
      key: 'logs',
      label: t('podDetail.tabs.logs'),
      children: fullBleedPane(
        <PodLogsPanel
          clusterId={clusterId}
          namespace={namespace}
          podName={podName}
          isActive={isActive && activeTab === 'logs'}
        />
      )
    },
    {
      key: 'exec',
      label: t('podDetail.tabs.exec'),
      children: fullBleedPane(
        <PodExecPanel
          clusterId={clusterId}
          namespace={namespace}
          podName={podName}
          isActive={isActive && activeTab === 'exec'}
        />
      )
    },
    {
      key: 'events',
      label: t('podDetail.tabs.events'),
      children: paddedPane(
        <ResourceEventsPanel
          clusterId={clusterId}
          namespace={namespace}
          name={podName}
          target={target}
          isActive={isActive}
        />
      )
    },
    {
      key: 'notes',
      label: t('podDetail.tabs.notes'),
      children: paddedPane(
        <ResourceNotesTab
          clusterId={clusterId}
          resourceKind="Pods"
          namespace={namespace}
          resourceName={podName}
          isActive={isActive && activeTab === 'notes'}
        />
      )
    },
    {
      key: 'yaml',
      label: t('podDetail.tabs.yaml'),
      children: paddedPane(
        manifestLoading ? (
          <LoadingState />
        ) : manifestError ? (
          <Alert type="error" showIcon message={String(manifestError)} />
        ) : (
          <pre className="ml-pod-yaml">{manifest ?? ''}</pre>
        )
      )
    }
  ]

  return (
    <div className="ml-pod-detail">
      {toolbar}
      <div className="ml-pod-detail__tabs">
        <Tabs
          size="small"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
          tabBarStyle={{ margin: '0 16px' }}
          destroyOnHidden
        />
      </div>
    </div>
  )
}
