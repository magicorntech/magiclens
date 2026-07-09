import { useState } from 'react'
import { Alert, Popover } from 'antd'
import { Box, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { DEFAULT_METRICS_TIME_RANGE, type MetricsTimeRange } from '@shared/metricsTimeRange'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import { useClusterMetricsRange } from '../../queries/useMetricsRange'
import { formatBytes, formatCores, percentOf } from '../../format'
import { MetricsHistoryPopoverContent } from '../Metrics/MetricsHistoryPopoverContent'
import { ResourceUsageCard } from '../ui/ResourceUsageCard'
import { MotionDiv, slideUp } from '../ui/Motion'

interface NodesResourceGridProps {
  clusterId: string
  data: ClusterMetricsSummary
  isActive: boolean
}

export function NodesResourceGrid({ clusterId, data, isActive }: NodesResourceGridProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const [hoverMetric, setHoverMetric] = useState<'cpu' | 'memory' | null>(null)
  const { data: rangeData, isLoading: rangeLoading } = useClusterMetricsRange(
    clusterId,
    timeRange,
    isActive && hoverMetric !== null
  )

  const cpuPercent = percentOf(data.cpuUsageCores, data.cpuAllocatableCores)
  const memoryPercent = percentOf(data.memoryUsageBytes, data.memoryAllocatableBytes)
  const totalPods = data.runningPods + data.pendingPods + data.failedPods
  const podsPercent = percentOf(totalPods, data.podCapacity)

  function wrapMetric(
    metric: 'cpu' | 'memory',
    title: string,
    formatValue: (v: number) => string,
    card: React.ReactNode
  ): React.ReactNode {
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
        <div>{card}</div>
      </Popover>
    )
  }

  return (
    <MotionDiv className="ml-nodes-resource-grid-wrap" {...slideUp}>
      {!data.metricsAvailable && (
        <Alert
          type="warning"
          showIcon
          className="ml-nodes-dashboard-alert"
          message="metrics-server unavailable — usage data may be incomplete"
        />
      )}
      <div className="ml-nodes-resource-grid">
        {wrapMetric(
          'cpu',
          'Cluster CPU over time',
          formatCores,
          <ResourceUsageCard
            icon={Cpu}
            label="CPU"
            percent={cpuPercent}
            usage={data.cpuUsageCores !== undefined ? formatCores(data.cpuUsageCores) : '—'}
            capacity={formatCores(data.cpuAllocatableCores)}
            accent="var(--ml-primary)"
            unavailable={data.cpuUsageCores === undefined}
          />
        )}
        {wrapMetric(
          'memory',
          'Cluster memory over time',
          formatBytes,
          <ResourceUsageCard
            icon={MemoryStick}
            label="Memory"
            percent={memoryPercent}
            usage={data.memoryUsageBytes !== undefined ? formatBytes(data.memoryUsageBytes) : '—'}
            capacity={formatBytes(data.memoryAllocatableBytes)}
            accent="#6366f1"
            unavailable={data.memoryUsageBytes === undefined}
          />
        )}
        <ResourceUsageCard
          icon={HardDrive}
          label="Storage"
          usage="—"
          capacity="—"
          unavailable
          accent="var(--ml-text-tertiary)"
        />
        <ResourceUsageCard
          icon={Box}
          label="Pods Capacity"
          percent={podsPercent}
          usage={String(totalPods)}
          capacity={String(data.podCapacity)}
          accent="#38bdf8"
        />
      </div>
    </MotionDiv>
  )
}
