import { useState } from 'react'
import { Alert, Popover } from 'antd'
import { AlertTriangle, Box, Server } from 'lucide-react'
import { DEFAULT_METRICS_TIME_RANGE, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { useClusterMetricsRange } from '../../queries/useMetricsRange'
import { formatBytes, formatCores, percentOf } from '../../format'
import { MetricsHistoryPopoverContent } from './MetricsHistoryPopoverContent'
import { MetricStatChip } from '../ui/MetricStatChip'
import { ProgressBar } from '../ui/ProgressBar'
import { MotionDiv, slideUp } from '../ui/Motion'

interface ClusterMetricsSummaryProps {
  clusterId: string
  isActiveTab: boolean
}

export function ClusterMetricsSummary({ clusterId, isActiveTab }: ClusterMetricsSummaryProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const [hoverMetric, setHoverMetric] = useState<'cpu' | 'memory' | null>(null)
  const { data, isLoading } = useClusterMetrics(clusterId, isActiveTab)
  const { data: rangeData, isLoading: rangeLoading } = useClusterMetricsRange(
    clusterId,
    timeRange,
    isActiveTab && hoverMetric !== null
  )

  if (isLoading || !data) {
    return (
      <div className="ml-nodes-dashboard ml-nodes-dashboard--loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ml-skeleton-row" style={{ height: 72 }} />
        ))}
      </div>
    )
  }

  const cpuPercent = percentOf(data.cpuUsageCores, data.cpuAllocatableCores)
  const memoryPercent = percentOf(data.memoryUsageBytes, data.memoryAllocatableBytes)
  const totalPods = data.runningPods + data.pendingPods + data.failedPods
  const podsPercent = percentOf(totalPods, data.podCapacity)

  function metricPopover(metric: 'cpu' | 'memory', title: string, formatValue: (v: number) => string, bar: React.ReactNode) {
    return (
      <Popover
        trigger="hover"
        mouseEnterDelay={0.35}
        placement="bottom"
        onOpenChange={(open) => setHoverMetric(open ? metric : null)}
        content={
          <MetricsHistoryPopoverContent
            title={title}
            metric={metric}
            rangeData={rangeData}
            isLoading={rangeLoading}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            formatValue={formatValue}
          />
        }
      >
        <div className="ml-nodes-dashboard-resource" style={{ cursor: 'default' }}>
          {bar}
        </div>
      </Popover>
    )
  }

  return (
    <MotionDiv className="ml-nodes-dashboard" {...slideUp}>
      {!data.metricsAvailable && (
        <Alert type="warning" showIcon className="ml-nodes-dashboard-alert" message="metrics-server unavailable — usage bars may be incomplete" />
      )}

      <section className="ml-nodes-dashboard-section">
        <h3 className="ml-nodes-dashboard-heading">Cluster Summary</h3>
        <div className="ml-nodes-dashboard-stats">
          <MetricStatChip icon={Server} label="Nodes" value={String(data.totalNodes)} />
          <MetricStatChip icon={Server} label="Ready" value={String(data.readyNodes)} accent="var(--ml-success)" />
          <MetricStatChip
            icon={AlertTriangle}
            label="Not Ready"
            value={String(data.notReadyNodes)}
            accent={data.notReadyNodes > 0 ? 'var(--ml-error)' : undefined}
          />
          <MetricStatChip icon={Box} label="Running Pods" value={String(data.runningPods)} accent="var(--ml-success)" />
          <MetricStatChip icon={Box} label="Pending" value={String(data.pendingPods)} accent="var(--ml-warning)" />
          <MetricStatChip
            icon={Box}
            label="Failed"
            value={String(data.failedPods)}
            accent={data.failedPods > 0 ? 'var(--ml-error)' : undefined}
          />
        </div>
      </section>

      <section className="ml-nodes-dashboard-section">
        <h3 className="ml-nodes-dashboard-heading">Cluster Resources</h3>
        <div className="ml-nodes-dashboard-resources">
          {metricPopover(
            'cpu',
            'Cluster CPU over time',
            formatCores,
            <ProgressBar
              label="CPU"
              percent={cpuPercent}
              detail={
                data.cpuUsageCores !== undefined
                  ? `${formatCores(data.cpuUsageCores)} / ${formatCores(data.cpuAllocatableCores)} cores`
                  : 'Usage unavailable'
              }
              accent="var(--ml-primary)"
            />
          )}
          {metricPopover(
            'memory',
            'Cluster memory over time',
            formatBytes,
            <ProgressBar
              label="Memory"
              percent={memoryPercent}
              detail={
                data.memoryUsageBytes !== undefined
                  ? `${formatBytes(data.memoryUsageBytes)} / ${formatBytes(data.memoryAllocatableBytes)}`
                  : 'Usage unavailable'
              }
              accent="#6366f1"
            />
          )}
          <ProgressBar
            label="Storage"
            percent={undefined}
            detail="Usage metrics unavailable"
            accent="var(--ml-text-tertiary)"
          />
          <ProgressBar
            label="Pods Capacity"
            percent={podsPercent}
            detail={`${totalPods} / ${data.podCapacity} scheduled`}
            accent="#38bdf8"
          />
        </div>
      </section>
    </MotionDiv>
  )
}
