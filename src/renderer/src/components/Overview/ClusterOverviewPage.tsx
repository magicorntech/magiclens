import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { Box, Cpu, MemoryStick, Server } from 'lucide-react'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { useResourceList } from '../../queries/useResourceList'
import { formatBytes, formatCores, percentOf } from '../../format'
import { ResourceUsageCard } from '../ui/ResourceUsageCard'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'
import { DetailSection, DetailFactGrid, DetailOverview } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'
import { clusterHealthStatus } from '../Nodes/nodesOverviewUtils'

interface ClusterOverviewPageProps {
  clusterId: string
  isActive: boolean
}

export function ClusterOverviewPage({ clusterId, isActive }: ClusterOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data: metrics, isLoading: metricsLoading } = useClusterMetrics(clusterId, isActive)
  const { data: nsData } = useResourceList(clusterId, 'ALL', 'Namespaces', isActive)
  const { data: deployData } = useResourceList(clusterId, 'ALL', 'Deployments', isActive)
  const { data: svcData } = useResourceList(clusterId, 'ALL', 'Services', isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const health = metrics ? clusterHealthStatus(metrics) : null
  const nsCount = nsData && !('error' in nsData) ? nsData.items.length : 0
  const deployCount = deployData && !('error' in deployData) ? deployData.items.length : 0
  const svcCount = svcData && !('error' in svcData) ? svcData.items.length : 0
  const warningPods =
    podsData && !('error' in podsData)
      ? podsData.items.filter((p) => /crash|error|fail|pending|unknown/i.test(p.statusText)).length
      : 0

  if (metricsLoading && !metrics) return <LoadingState />

  const totalPods = metrics
    ? metrics.runningPods + metrics.pendingPods + metrics.failedPods
    : 0

  return (
    <OverviewPage title={t('clusterOverview.title')} subtitle={t('clusterOverview.subtitle')}>
      <DetailOverview>
        {health ? (
          <div className={`ml-overview-health ml-overview-health--${health.tone}`}>
            <span className="ml-overview-health__dot" />
            <div>
              <strong>{health.label}</strong>
              <p>{health.message}</p>
            </div>
          </div>
        ) : null}

        {!metrics?.metricsAvailable ? (
          <Alert type="warning" showIcon message={t('clusterOverview.metricsUnavailable')} />
        ) : null}

        <OverviewGrid>
          <OverviewStat
            label={t('clusterOverview.nodes')}
            value={metrics?.totalNodes ?? '—'}
            hint={
              metrics
                ? t('clusterOverview.nodesHint', {
                    ready: metrics.readyNodes,
                    notReady: metrics.notReadyNodes
                  })
                : undefined
            }
            tone={metrics && metrics.notReadyNodes > 0 ? 'warn' : 'ok'}
          />
          <OverviewStat
            label={t('clusterOverview.pods')}
            value={totalPods}
            hint={
              metrics
                ? t('clusterOverview.podsHint', {
                    running: metrics.runningPods,
                    pending: metrics.pendingPods,
                    failed: metrics.failedPods
                  })
                : undefined
            }
            tone={metrics && metrics.failedPods > 0 ? 'error' : 'ok'}
          />
          <OverviewStat label={t('clusterOverview.namespaces')} value={nsCount} />
          <OverviewStat label={t('clusterOverview.deployments')} value={deployCount} />
          <OverviewStat label={t('clusterOverview.services')} value={svcCount} />
          <OverviewStat
            label={t('clusterOverview.problemPods')}
            value={warningPods}
            tone={warningPods > 0 ? 'warn' : 'ok'}
          />
        </OverviewGrid>

        {metrics ? (
          <DetailSection title={t('clusterOverview.resources')}>
            <div className="ml-overview-usage">
              <ResourceUsageCard
                icon={Cpu}
                label="CPU"
                percent={percentOf(metrics.cpuUsageCores, metrics.cpuAllocatableCores)}
                usage={
                  metrics.cpuUsageCores !== undefined ? formatCores(metrics.cpuUsageCores) : '—'
                }
                capacity={formatCores(metrics.cpuAllocatableCores)}
                accent="var(--ml-primary)"
                unavailable={metrics.cpuUsageCores === undefined}
              />
              <ResourceUsageCard
                icon={MemoryStick}
                label="Memory"
                percent={percentOf(metrics.memoryUsageBytes, metrics.memoryAllocatableBytes)}
                usage={
                  metrics.memoryUsageBytes !== undefined
                    ? formatBytes(metrics.memoryUsageBytes)
                    : '—'
                }
                capacity={formatBytes(metrics.memoryAllocatableBytes)}
                accent="#6366f1"
                unavailable={metrics.memoryUsageBytes === undefined}
              />
              <ResourceUsageCard
                icon={Box}
                label="Pods"
                percent={percentOf(totalPods, metrics.podCapacity)}
                usage={String(totalPods)}
                capacity={String(metrics.podCapacity)}
                accent="#38bdf8"
              />
              <ResourceUsageCard
                icon={Server}
                label="Nodes"
                percent={percentOf(metrics.readyNodes, metrics.totalNodes)}
                usage={String(metrics.readyNodes)}
                capacity={String(metrics.totalNodes)}
                accent="#22c55e"
              />
            </div>
            <DetailFactGrid
              facts={[
                {
                  label: t('clusterOverview.cpuCapacity'),
                  value: formatCores(metrics.cpuCapacityCores)
                },
                {
                  label: t('clusterOverview.memCapacity'),
                  value: formatBytes(metrics.memoryCapacityBytes)
                },
                {
                  label: t('clusterOverview.cpuAlloc'),
                  value: formatCores(metrics.cpuAllocatableCores)
                },
                {
                  label: t('clusterOverview.memAlloc'),
                  value: formatBytes(metrics.memoryAllocatableBytes)
                }
              ]}
            />
          </DetailSection>
        ) : null}

        <DetailSection title={t('clusterOverview.recentEvents')}>
          <div className="ml-overview-events-embed">
            <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact embedded />
          </div>
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
