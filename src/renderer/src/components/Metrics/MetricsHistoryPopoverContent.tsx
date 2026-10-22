import { Alert, Empty, Select } from 'antd'
import {
  HISTORICAL_METRICS_WARNING,
  METRICS_PRESET_OPTIONS,
  type MetricsPresetRange,
  type MetricsTimeRange
} from '@shared/metricsTimeRange'
import type { MetricsRangeResponse } from '@shared/types/metrics'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { MetricsTimeRangeSelect } from './MetricsTimeRangeSelect'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface MetricsHistoryPopoverContentProps {
  title: string
  metric: 'cpu' | 'memory'
  rangeData?: MetricsRangeResponse
  isLoading: boolean
  timeRange: MetricsTimeRange
  onTimeRangeChange: (range: MetricsTimeRange) => void
  formatValue: (value: number) => string
  compact?: boolean
  caption?: { name: string; namespace?: string }
}

export function MetricsHistoryPopoverContent({
  title,
  metric,
  rangeData,
  isLoading,
  timeRange,
  onTimeRangeChange,
  formatValue,
  compact = false,
  caption
}: MetricsHistoryPopoverContentProps): React.JSX.Element {
  const series = metric === 'cpu' ? rangeData?.cpu : rangeData?.memory
  const chart = seriesToChartPoints(series)
  const useHistorical = rangeData?.historicalAvailable === true
  const preset = timeRange.type === 'preset' ? timeRange.preset : '1h'

  const body = isLoading ? (
    <Empty description="Loading history…" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
  ) : !useHistorical ? (
    <Alert type="warning" showIcon message={rangeData?.warning ?? HISTORICAL_METRICS_WARNING} />
  ) : rangeData?.error ? (
    <Alert type="error" showIcon message={rangeData.error} />
  ) : chart.points.length < 2 ? (
    <Empty description="No history in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
  ) : (
    <PodMetricsChart title={compact ? '' : title} points={chart.points} seriesNames={chart.seriesNames} formatValue={formatValue} />
  )

  if (!compact) {
    return (
      <div style={{ width: 360 }}>
        <MetricsTimeRangeSelect value={timeRange} onChange={onTimeRangeChange} />
        <div style={{ marginTop: 8 }}>{body}</div>
      </div>
    )
  }

  return (
    <div className="ml-pod-metric-popover">
      <div className="ml-pod-metric-popover__head">
        <span className="ml-pod-metric-popover__title">{title}</span>
        <Select
          size="small"
          variant="borderless"
          value={preset}
          popupMatchSelectWidth={false}
          className="ml-pod-metric-popover__range"
          options={METRICS_PRESET_OPTIONS}
          onChange={(next: MetricsPresetRange) => onTimeRangeChange({ type: 'preset', preset: next })}
        />
      </div>
      <div className="ml-pod-metric-popover__chart">{body}</div>
      {caption ? (
        <div className="ml-pod-metric-popover__foot">
          <span className="ml-pod-metric-popover__name" title={caption.name}>
            {caption.name}
          </span>
          {caption.namespace ? (
            <span className="ml-pod-metric-popover__ns" title={caption.namespace}>
              {caption.namespace}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
