import { useMemo } from 'react'
import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { useClusterStore } from '../../stores/clusterStore'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'

interface WorkloadsOverviewPageProps {
  clusterId: string
  isActive: boolean
}

const WORKLOAD_KINDS: ResourceKind[] = [
  'Deployments',
  'StatefulSets',
  'DaemonSets',
  'ReplicaSets',
  'Jobs',
  'CronJobs'
]

function isUnhealthy(item: ResourceListItem): boolean {
  return /unavailable|failed|error|crash|backoff|progressing|unknown|pending/i.test(
    `${item.statusText} ${item.statusDetail ?? ''}`
  )
}

function countByNamespace(items: ResourceListItem[]): { ns: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const ns = item.namespace || '(cluster)'
    map.set(ns, (map.get(ns) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([ns, count]) => ({ ns, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export function WorkloadsOverviewPage({
  clusterId,
  isActive
}: WorkloadsOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)

  const deploy = useResourceList(clusterId, 'ALL', 'Deployments', isActive)
  const sts = useResourceList(clusterId, 'ALL', 'StatefulSets', isActive)
  const ds = useResourceList(clusterId, 'ALL', 'DaemonSets', isActive)
  const rs = useResourceList(clusterId, 'ALL', 'ReplicaSets', isActive)
  const jobs = useResourceList(clusterId, 'ALL', 'Jobs', isActive)
  const cron = useResourceList(clusterId, 'ALL', 'CronJobs', isActive)
  const pods = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const lists = useMemo(() => {
    const pick = (data: typeof deploy.data): ResourceListItem[] =>
      data && !('error' in data) ? data.items : []
    return {
      Deployments: pick(deploy.data),
      StatefulSets: pick(sts.data),
      DaemonSets: pick(ds.data),
      ReplicaSets: pick(rs.data),
      Jobs: pick(jobs.data),
      CronJobs: pick(cron.data),
      Pods: pick(pods.data)
    }
  }, [deploy.data, sts.data, ds.data, rs.data, jobs.data, cron.data, pods.data])

  const loading =
    deploy.isLoading || sts.isLoading || ds.isLoading || rs.isLoading || jobs.isLoading || cron.isLoading

  const allWorkloads = useMemo(
    () => WORKLOAD_KINDS.flatMap((k) => lists[k as keyof typeof lists] ?? []),
    [lists]
  )

  const unhealthy = useMemo(
    () =>
      WORKLOAD_KINDS.flatMap((kind) =>
        (lists[kind as keyof typeof lists] ?? [])
          .filter(isUnhealthy)
          .map((item) => ({ kind, item }))
      ).slice(0, 25),
    [lists]
  )

  const highRestartPods = useMemo(() => {
    return lists.Pods.filter((p) => {
      const restarts = Number(p.columns.restarts ?? 0)
      return Number.isFinite(restarts) && restarts >= 5
    })
      .sort((a, b) => Number(b.columns.restarts ?? 0) - Number(a.columns.restarts ?? 0))
      .slice(0, 12)
  }, [lists.Pods])

  const nsDist = useMemo(() => countByNamespace(allWorkloads), [allWorkloads])

  const healthyCount = allWorkloads.length - unhealthy.length

  if (loading && allWorkloads.length === 0) return <LoadingState />

  return (
    <OverviewPage title={t('workloadsOverview.title')} subtitle={t('workloadsOverview.subtitle')}>
      <DetailOverview>
        <OverviewGrid>
          {WORKLOAD_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="ml-overview-stat ml-overview-stat--clickable"
              onClick={() => openResourceKind(clusterId, kind)}
            >
              <span className="ml-overview-stat__label">{kind}</span>
              <span className="ml-overview-stat__value">{lists[kind as keyof typeof lists].length}</span>
            </button>
          ))}
          <OverviewStat
            label={t('workloadsOverview.healthy')}
            value={healthyCount}
            tone="ok"
          />
          <OverviewStat
            label={t('workloadsOverview.unhealthy')}
            value={unhealthy.length}
            tone={unhealthy.length > 0 ? 'warn' : 'ok'}
          />
        </OverviewGrid>

        <DetailSection title={t('workloadsOverview.byNamespace')}>
          {nsDist.length === 0 ? (
            <span className="ml-detail-empty">{t('workloadsOverview.empty')}</span>
          ) : (
            <div className="ml-overview-bars">
              {nsDist.map((row) => {
                const max = nsDist[0]?.count || 1
                const pct = Math.round((row.count / max) * 100)
                return (
                  <div key={row.ns} className="ml-overview-bar">
                    <span className="ml-overview-bar__label">{row.ns}</span>
                    <div className="ml-overview-bar__track">
                      <div className="ml-overview-bar__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ml-overview-bar__value">{row.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('workloadsOverview.problems')}>
          {unhealthy.length === 0 ? (
            <span className="ml-detail-empty">{t('workloadsOverview.noProblems')}</span>
          ) : (
            <div className="ml-overview-list">
              {unhealthy.map(({ kind, item }) => (
                <button
                  key={`${kind}-${item.id}`}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    navigateToResource(clusterId, {
                      kind,
                      namespace: item.namespace,
                      name: item.name
                    })
                  }
                >
                  <Tag>{kind}</Tag>
                  <strong>
                    {item.namespace ? `${item.namespace}/` : ''}
                    {item.name}
                  </strong>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('workloadsOverview.highRestarts')}>
          {highRestartPods.length === 0 ? (
            <span className="ml-detail-empty">{t('workloadsOverview.noRestarts')}</span>
          ) : (
            <div className="ml-overview-list">
              {highRestartPods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    navigateToResource(clusterId, {
                      kind: 'Pods',
                      namespace: item.namespace,
                      name: item.name
                    })
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <span className="ml-overview-list__meta">
                    {t('workloadsOverview.restarts', { count: item.columns.restarts ?? '0' })}
                  </span>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
