import { useMemo, useState } from 'react'
import { Button, Empty, Input, Tooltip, message } from 'antd'
import { ChevronRight, ExternalLink, RotateCw } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import type { VirtualPageKey } from '@shared/types/navigation'
import type { ArgoActivityEvent, ArgoApplication } from '@shared/types/argocd'
import { useArgoOverview, useArgoSyncMany } from '../../queries/useArgoCd'
import { ResizableTable } from '../../utils/ResizableTable'
import { AgeCell } from '../ResourceTable/AgeCell'
import { Icon } from '../ui/Icon'
import { ArgoHealthTag, ArgoSyncTag } from './argoStatus'
import { ArgoNotInstalled } from './ArgoNotInstalled'
import { ArgoPageHeader } from './ArgoPageHeader'
import { ArgoApplicationDrawer, type ArgoApplicationTarget } from './ArgoApplicationDrawer'

interface ArgoDashboardPageProps {
  clusterId: string
  onOpenPage?: (page: VirtualPageKey) => void
}

type StatTone = 'neutral' | 'ok' | 'warn' | 'error' | 'info'

const TONE_COLORS: Record<StatTone, string> = {
  neutral: 'var(--ml-text)',
  ok: 'var(--ml-success)',
  warn: 'var(--ml-warning)',
  error: 'var(--ml-error)',
  info: 'var(--ml-primary)'
}

function Stat({
  value,
  label,
  tone = 'neutral'
}: {
  value: number
  label: string
  tone?: StatTone
}): React.JSX.Element {
  // Zero counts of *bad* things are good news, so they're muted rather than shouting in red.
  const color = value === 0 && tone !== 'neutral' ? 'var(--ml-text-tertiary)' : TONE_COLORS[tone]
  return (
    <div className="ml-argo-stat">
      <span className="ml-argo-stat__value" style={{ color }}>
        {value}
      </span>
      <span className="ml-argo-stat__label">{label}</span>
    </div>
  )
}

/** Count card for the Application Sets / Projects tiles — a number plus a way through to it. */
function CountCard({
  title,
  value,
  hint,
  onOpen
}: {
  title: string
  value: number
  hint: string
  onOpen?: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="ml-argo-card ml-argo-card--action"
      onClick={onOpen}
      disabled={!onOpen}
    >
      <span className="ml-argo-card__title">{title}</span>
      <span className="ml-argo-card__value">{value}</span>
      <span className="ml-argo-card__hint">{hint}</span>
      {onOpen ? (
        <span className="ml-argo-card__chevron">
          <Icon icon={ChevronRight} variant="detail" />
        </span>
      ) : null}
    </button>
  )
}

export function ArgoDashboardPage({
  clusterId,
  onOpenPage
}: ArgoDashboardPageProps): React.JSX.Element {
  const { data, isLoading } = useArgoOverview(clusterId)
  const syncMany = useArgoSyncMany(clusterId)
  const [activityFilter, setActivityFilter] = useState('')
  const [detailTarget, setDetailTarget] = useState<ArgoApplicationTarget | null>(null)

  const summary = data?.summary
  const installation = data?.installation
  const attention = useMemo(() => data?.needsAttention ?? [], [data])
  const activity = useMemo(() => data?.activity ?? [], [data])

  const filteredActivity = useMemo(() => {
    const q = activityFilter.trim().toLowerCase()
    if (!q) return activity
    return activity.filter((e) =>
      [e.kind, e.namespace, e.name, e.type, e.message].some((v) => v.toLowerCase().includes(q))
    )
  }, [activity, activityFilter])

  const outOfSyncCount = summary?.outOfSync ?? 0

  const syncOutOfSync = (): void => {
    const targets = attention
      .filter((a) => a.syncStatus === 'OutOfSync')
      .map((a) => ({ namespace: a.namespace, name: a.name }))

    if (targets.length === 0) {
      void message.info('Nothing is out of sync.')
      return
    }

    syncMany.mutate(targets, {
      onSuccess: (res) => {
        if (res.error) {
          void message.error(res.error)
          return
        }
        const failed = res.failures?.length ?? 0
        if (failed > 0) void message.warning(`Synced ${res.succeeded ?? 0}, ${failed} failed.`)
        else void message.success(`Sync requested for ${res.succeeded ?? 0} application(s).`)
      },
      onError: (err) => void message.error(err instanceof Error ? err.message : String(err))
    })
  }

  const attentionColumns: ColumnsType<ArgoApplication> = [
    { title: 'Application', dataIndex: 'name', key: 'name', width: 240, ellipsis: true },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 140, ellipsis: true },
    {
      title: 'Sync',
      key: 'sync',
      width: 120,
      render: (_v, r) => <ArgoSyncTag status={r.syncStatus} />
    },
    {
      title: 'Health',
      key: 'health',
      width: 130,
      render: (_v, r) => <ArgoHealthTag status={r.healthStatus} />
    },
    {
      title: 'Details',
      key: 'message',
      ellipsis: true,
      // Prefer Argo's own explanation; fall back to the destination so the row is never blank.
      render: (_v, r) => (
        <span className="ml-argo-muted">
          {r.healthMessage || r.lastOperationMessage || `→ ${r.destNamespace || 'unknown'}`}
        </span>
      )
    }
  ]

  const activityColumns: ColumnsType<ArgoActivityEvent> = [
    { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 130, ellipsis: true },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 210, ellipsis: true },
    { title: 'Reason', dataIndex: 'type', key: 'type', width: 170, ellipsis: true },
    { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: 'Age',
      key: 'age',
      width: 80,
      render: (_v, r) => <AgeCell timestamp={r.timestamp} />
    }
  ]

  if (data?.error) return <Empty description={data.error} />
  if (!isLoading && installation && !installation.installed) return <ArgoNotInstalled />

  const subtitle = installation?.namespace
    ? `${installation.namespace}${installation.version ? ` · ${installation.version}` : ''}`
    : 'Continuous delivery state for this cluster'

  return (
    <div className="ml-argo-page">
      <ArgoPageHeader
        title="Argo CD"
        subtitle={subtitle}
        actions={
          installation?.url ? (
            <Tooltip title={installation.url}>
              <Button
                icon={<Icon icon={ExternalLink} variant="detail" />}
                onClick={() => window.open(installation.url, '_blank', 'noopener,noreferrer')}
              >
                Open Argo UI
              </Button>
            </Tooltip>
          ) : null
        }
      />

      <div className="ml-argo-statband">
        <Stat value={summary?.applications ?? 0} label="Applications" />
        <Stat value={summary?.synced ?? 0} label="Synced" tone="ok" />
        <Stat value={summary?.healthy ?? 0} label="Healthy" tone="ok" />
        <Stat value={summary?.outOfSync ?? 0} label="Out of sync" tone="warn" />
        <Stat value={summary?.degraded ?? 0} label="Degraded" tone="error" />
        <Stat value={summary?.missing ?? 0} label="Missing" tone="error" />
        <Stat value={summary?.progressing ?? 0} label="Progressing" tone="info" />
      </div>

      <div className="ml-argo-cards">
        <div className="ml-argo-card">
          <span className="ml-argo-card__title">Applications</span>
          <span className="ml-argo-card__value">
            {summary?.healthy ?? 0}
            <span className="ml-argo-card__unit">/{summary?.applications ?? 0} healthy</span>
          </span>
          <div className="ml-argo-card__meta">
            <span style={{ color: TONE_COLORS.warn }}>{outOfSyncCount} out of sync</span>
            <span style={{ color: TONE_COLORS.error }}>{summary?.degraded ?? 0} degraded</span>
            <span style={{ color: TONE_COLORS.info }}>
              {summary?.progressing ?? 0} progressing
            </span>
          </div>
          <div className="ml-argo-card__actions">
            <Button
              size="small"
              type="primary"
              icon={<Icon icon={RotateCw} variant="detail" />}
              loading={syncMany.isPending}
              disabled={outOfSyncCount === 0}
              onClick={syncOutOfSync}
            >
              Sync {outOfSyncCount > 0 ? `(${outOfSyncCount})` : ''}
            </Button>
            <Button size="small" onClick={() => onOpenPage?.('argoApplications')}>
              View all
            </Button>
          </div>
        </div>

        <CountCard
          title="Application Sets"
          value={summary?.applicationSets ?? 0}
          hint="Generators producing applications"
          onOpen={onOpenPage ? () => onOpenPage('argoApplicationSets') : undefined}
        />
        <CountCard
          title="Projects"
          value={summary?.projects ?? 0}
          hint="Repo and destination boundaries"
          onOpen={onOpenPage ? () => onOpenPage('argoProjects') : undefined}
        />
      </div>

      <section className="ml-argo-section">
        <div className="ml-argo-section__head">
          <h3 className="ml-argo-section__title">Needs attention</h3>
          <span className="ml-argo-count">{attention.length}</span>
        </div>
        {attention.length === 0 && !isLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Everything is synced and healthy"
          />
        ) : (
          <ResizableTable
            tableKey="argo-attention"
            rowKey="id"
            columns={attentionColumns}
            dataSource={attention}
            loading={isLoading}
            pagination={false}
            size="small"
            scroll={{ y: 220 }}
            rowClassName={() => 'ml-argo-row--clickable'}
            onRow={(r) => ({
              onClick: () => setDetailTarget({ namespace: r.namespace, name: r.name })
            })}
          />
        )}
      </section>

      <section className="ml-argo-section">
        <div className="ml-argo-section__head">
          <h3 className="ml-argo-section__title">Recent activity</h3>
          <span className="ml-argo-count">{activity.length}</span>
          <Input
            className="ml-argo-filter"
            size="small"
            placeholder="Filter by kind, name or reason…"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            allowClear
          />
        </div>
        {activity.length === 0 && !isLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent Argo CD events" />
        ) : (
          <ResizableTable
            tableKey="argo-activity"
            rowKey="id"
            columns={activityColumns}
            dataSource={filteredActivity}
            loading={isLoading}
            pagination={false}
            size="small"
            /* Only Application events have an Application drawer to open. */
            rowClassName={(r) => (r.kind === 'Application' ? 'ml-argo-row--clickable' : '')}
            onRow={(r) => ({
              onClick: () => {
                if (r.kind !== 'Application') return
                setDetailTarget({ namespace: r.namespace, name: r.name })
              }
            })}
            scroll={{ y: 300 }}
          />
        )}
      </section>

      <ArgoApplicationDrawer
        clusterId={clusterId}
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  )
}
