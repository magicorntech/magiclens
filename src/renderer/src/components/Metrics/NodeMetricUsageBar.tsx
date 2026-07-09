import { useState } from 'react'
import { Popover } from 'antd'
import { DEFAULT_METRICS_TIME_RANGE, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useNodeMetricsRange } from '../../queries/useMetricsRange'
import { nodeResourcePercent } from '../../format'
import { MetricsHistoryPopoverContent } from './MetricsHistoryPopoverContent'
import { ProgressBar } from '../ui/ProgressBar'

interface NodeMetricUsageBarProps {
  usage?: number
  allocatable: number
  capacity: number
  formatValue: (value: number) => string
  label?: string
  clusterId?: string
  nodeName?: string
  metric?: 'cpu' | 'memory'
  isActive?: boolean
  variant?: 'default' | 'table'
}

export function NodeMetricUsageBar({
  usage,
  allocatable,
  capacity,
  formatValue,
  label,
  clusterId,
  nodeName,
  metric,
  isActive = false,
  variant = 'default'
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

  const bar =
    variant === 'table' ? (
      <div className="ml-node-metric-cell ml-node-metric-cell--table">
        <ProgressBar label="" percent={percent} accent={metric === 'memory' ? '#6366f1' : 'var(--ml-primary)'} size="sm" />
        <span className="ml-node-metric-cell-pct">{percent !== undefined ? `${Math.round(percent)}%` : '—'}</span>
        <span className="ml-node-metric-cell-detail">
          {usage !== undefined ? `${formatValue(usage)} / ${formatValue(total)}` : '—'}
        </span>
      </div>
    ) : (
      <ProgressBar
        size="sm"
        label={label ?? ''}
        percent={percent}
        detail={usage !== undefined ? `${formatValue(usage)} / ${formatValue(total)}` : '—'}
        accent={metric === 'memory' ? '#6366f1' : 'var(--ml-primary)'}
      />
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
      <div className="ml-node-metric-cell-wrap" onClick={(e) => e.stopPropagation()}>
        {bar}
      </div>
    </Popover>
  )
}
