import { useState } from 'react'
import { Popover, Progress, Typography } from 'antd'
import { DEFAULT_METRICS_TIME_RANGE, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useNodeMetricsRange } from '../../queries/useMetricsRange'
import { nodeResourcePercent } from '../../format'
import { MetricsHistoryPopoverContent } from './MetricsHistoryPopoverContent'

interface NodeMetricUsageBarProps {
  usage?: number
  allocatable: number
  capacity: number
  formatValue: (value: number) => string
  compact?: boolean
  clusterId?: string
  nodeName?: string
  metric?: 'cpu' | 'memory'
  isActive?: boolean
}

export function NodeMetricUsageBar({
  usage,
  allocatable,
  capacity,
  formatValue,
  compact = false,
  clusterId,
  nodeName,
  metric,
  isActive = false
}: NodeMetricUsageBarProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const [open, setOpen] = useState(false)
  const showHistory = !!clusterId && !!nodeName && !!metric
  const { data: rangeData, isLoading } = useNodeMetricsRange(
    showHistory ? clusterId : null,
    showHistory ? nodeName : null,
    timeRange,
    isActive && open
  )

  const total = allocatable > 0 ? allocatable : capacity
  const percent = nodeResourcePercent(usage, allocatable, capacity)

  const bar = (
    <div style={{ minWidth: compact ? 150 : undefined }}>
      {percent !== undefined ? (
        <Progress
          percent={percent}
          size={compact ? 'small' : 'default'}
          format={(p) => `${p}%`}
          status={percent >= 90 ? 'exception' : undefined}
        />
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
        {usage !== undefined ? `${formatValue(usage)} / ${formatValue(total)}` : '-'}
      </Typography.Text>
    </div>
  )

  if (!showHistory) return bar

  const title = metric === 'cpu' ? 'CPU over time' : 'Memory over time'

  return (
    <Popover
      trigger="hover"
      mouseEnterDelay={0.35}
      placement="left"
      open={open}
      onOpenChange={setOpen}
      content={
        <MetricsHistoryPopoverContent
          title={title}
          metric={metric}
          rangeData={rangeData}
          isLoading={isLoading}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          formatValue={formatValue}
        />
      }
    >
      <div style={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
        {bar}
      </div>
    </Popover>
  )
}
