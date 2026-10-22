import { useState } from 'react'
import { Popover } from 'antd'
import { usagePercent } from '@shared/quantity'
import { type MetricsTimeRange } from '@shared/metricsTimeRange'
import { usePodMetricsRange } from '../../queries/useMetricsRange'
import { ProgressBar } from '../ui/ProgressBar'
import { MetricsHistoryPopoverContent } from './MetricsHistoryPopoverContent'

export function UsageRequestCell({
  usage,
  request,
  formatUsage,
  formatRequest,
  clusterId,
  namespace,
  podName,
  metric,
  isActive = false
}: {
  usage?: number
  request?: number
  formatUsage: (n: number) => string
  formatRequest: (n: number) => string
  clusterId?: string
  namespace?: string
  podName?: string
  metric?: 'cpu' | 'memory'
  isActive?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>({ type: 'preset', preset: '1h' })
  if (usage == null) return <span>—</span>
  const req = request && request > 0 ? request : 0
  const pct = usagePercent(usage, req)
  const showHistory = !!clusterId && !!namespace && !!podName && !!metric
  const bar = (
    <div className="ml-node-metric-cell ml-node-metric-cell--table">
      {pct != null ? <ProgressBar label="" percent={Math.min(pct, 100)} size="sm" /> : null}
      <span className={`ml-node-metric-cell-pct${pct != null && pct > 100 ? ' is-over' : ''}`}>
        {pct != null ? `${Math.round(pct)}%` : '—'}
      </span>
      <span className="ml-node-metric-cell-detail">
        {formatUsage(usage)}
        {req > 0 ? ` / ${formatRequest(req)}` : ''}
      </span>
    </div>
  )

  if (!showHistory) return bar

  return (
    <Popover
      trigger="hover"
      mouseEnterDelay={0.2}
      mouseLeaveDelay={0.15}
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      getPopupContainer={() => document.body}
      zIndex={4000}
      classNames={{ container: 'ml-pod-metric-popover-shell' }}
      content={
        <PodUsageHistory
          clusterId={clusterId}
          namespace={namespace}
          podName={podName}
          metric={metric}
          isActive={isActive && open}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          formatValue={formatUsage}
        />
      }
    >
      <div className="ml-node-metric-cell-wrap" onClick={(event) => event.stopPropagation()}>
        {bar}
      </div>
    </Popover>
  )
}

function PodUsageHistory({
  clusterId,
  namespace,
  podName,
  metric,
  isActive,
  timeRange,
  onTimeRangeChange,
  formatValue
}: {
  clusterId: string
  namespace: string
  podName: string
  metric: 'cpu' | 'memory'
  isActive: boolean
  timeRange: MetricsTimeRange
  onTimeRangeChange: (range: MetricsTimeRange) => void
  formatValue: (value: number) => string
}): React.JSX.Element {
  const { data, isLoading } = usePodMetricsRange(clusterId, namespace, podName, timeRange, isActive)
  return (
    <MetricsHistoryPopoverContent
      compact
      title={metric === 'cpu' ? 'CPU' : 'Memory'}
      metric={metric}
      rangeData={data}
      isLoading={isLoading}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      formatValue={formatValue}
      caption={{ name: podName, namespace }}
    />
  )
}
