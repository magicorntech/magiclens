import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { Box, Cpu, MemoryStick, Server } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import type { ResourceListItem } from '@shared/types/resource'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { useResourceList } from '../../queries/useResourceList'
import { formatBytes, formatCores, percentOf } from '../../format'
import { ResourceUsageCard } from '../ui/ResourceUsageCard'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'
import { DetailSection, DetailFactGrid, DetailOverview } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'
import { NodesHealthBanner } from '../Nodes/NodesHealthBanner'

interface ClusterOverviewPageProps {
  clusterId: string
  isActive: boolean
  onOpenResourceKind: (kind: ResourceKind) => void
  onNavigateToResource: (focus: ResourceFocus, item?: ResourceListItem) => void
}

export function ClusterOverviewPage({
  clusterId,
  isActive,
  onOpenResourceKind,
  onNavigateToResource
}: ClusterOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data: metrics, isLoading: metricsLoading } = useClusterMetrics(clusterId, isActive)
  const { data: nsData } = useResourceList(clusterId, 'ALL', 'Namespaces', isActive)
  const { data: deployData } = useResourceList(clusterId, 'ALL', 'Deployments', isActive)
  const { data: svcData } = useResourceList(clusterId, 'ALL', 'Services', isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const nsCount = nsData && !('error' in nsData) ? nsData.items.length : 0
  const deployCount = deployData && !('error' in deployData) ? deployData.items.length : 0
  const svcCount = svcData && !('error' in svcData) ? svcData.items.length : 0
  const warningPods =
    podsData && !('error' in podsData)
      ? podsData.items.filter((p) => /crash|error|fail|pending|unknown/i.test(p.statusText))
      : []

  if (metricsLoading && !metrics) return <LoadingState />

  const totalPods = metrics
    ? metrics.runningPods + metrics.pendingPods + metrics.failedPods
    : 0

  return (
    <OverviewPage title={t('clusterOverview.title')} subtitle={t('clusterOverview.subtitle')}>
      <DetailOverview>
        {metrics ? <NodesHealthBanner data={metrics} /> : null}

        {!metrics?.metricsAvailable ? (
          <Alert type="warning" showIcon message={t('clusterOverview.metricsUnavailable')} />
        ) : null}

        <OverviewGrid>
          <OverviewStat
            label={t('clusterOverview.namespaces')}
            value={nsCount}
            onClick={() => onOpenResourceKind('Namespaces')}
          />
          <OverviewStat
            label={t('clusterOverview.deployments')}
            value={deployCount}
            onClick={() => onOpenResourceKind('Deployments')}
          />
          <OverviewStat
            label={t('clusterOverview.services')}
            value={svcCount}
            onClick={() => onOpenResourceKind('Services')}
          />
          <OverviewStat
            label={t('clusterOverview.problemPods')}
            value={warningPods.length}
            tone={warningPods.length > 0 ? 'warn' : 'ok'}
            onClick={() => {
              const first = warningPods[0]
              if (first) {
                onNavigateToResource(
                  {
                    kind: 'Pods',
                    namespace: first.namespace,
                    name: first.name
                  },
                  first
                )
              } else {
                onOpenResourceKind('Pods')
              }
            }}
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
            <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact embedded overviewEmbed />
          </div>
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
