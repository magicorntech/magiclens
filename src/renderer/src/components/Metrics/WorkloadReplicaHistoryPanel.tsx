import { useState } from 'react'
import { Alert, Empty } from 'antd'
import { DEFAULT_METRICS_TIME_RANGE, HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useDeploymentMetricsRange, useHpaMetricsRange } from '../../queries/useMetricsRange'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { MetricsTimeRangeSelect } from './MetricsTimeRangeSelect'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface WorkloadReplicaHistoryPanelProps {
  clusterId: string
  namespace: string
  resourceName: string
  kind: 'Deployments' | 'HorizontalPodAutoscalers'
  isActive: boolean
}

export function WorkloadReplicaHistoryPanel({
  clusterId,
  namespace,
  resourceName,
  kind,
  isActive
}: WorkloadReplicaHistoryPanelProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const deploymentQuery = useDeploymentMetricsRange(
    kind === 'Deployments' ? clusterId : null,
    namespace,
    kind === 'Deployments' ? resourceName : null,
    timeRange,
    isActive && kind === 'Deployments'
  )
  const hpaQuery = useHpaMetricsRange(
    kind === 'HorizontalPodAutoscalers' ? clusterId : null,
    namespace,
    kind === 'HorizontalPodAutoscalers' ? resourceName : null,
    timeRange,
    isActive && kind === 'HorizontalPodAutoscalers'
  )
  const { data, isLoading } = kind === 'Deployments' ? deploymentQuery : hpaQuery

  if (isLoading) return <LoadingState />
  if (!data?.historicalAvailable) {
    return (
      <div>
        <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />
        <Alert type="warning" showIcon message={data?.warning ?? HISTORICAL_METRICS_WARNING} />
      </div>
    )
  }

  const chart = seriesToChartPoints(data.replicaCount)
  return (
    <div>
      <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />
      {data.error ? <Alert type="error" showIcon message={data.error} style={{ marginBottom: 12 }} /> : null}
      {chart.points.length < 2 ? (
        <Empty description="No replica history in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <PodMetricsChart title="Replica count" points={chart.points} seriesNames={chart.seriesNames} formatValue={(v) => String(Math.round(v))} />
      )}
    </div>
  )
}
