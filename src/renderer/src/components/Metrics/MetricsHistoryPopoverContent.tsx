import { Alert, Empty } from 'antd'
import { HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
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
}

export function MetricsHistoryPopoverContent({
  title,
  metric,
  rangeData,
  isLoading,
  timeRange,
  onTimeRangeChange,
  formatValue
}: MetricsHistoryPopoverContentProps): React.JSX.Element {
  const series = metric === 'cpu' ? rangeData?.cpu : rangeData?.memory
  const chart = seriesToChartPoints(series)
  const useHistorical = rangeData?.historicalAvailable === true

  return (
    <div style={{ width: 360 }}>
      <MetricsTimeRangeSelect value={timeRange} onChange={onTimeRangeChange} />
      {isLoading ? (
        <Empty description="Loading history…" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '12px 0' }} />
      ) : !useHistorical ? (
        <Alert type="warning" showIcon message={rangeData?.warning ?? HISTORICAL_METRICS_WARNING} style={{ marginTop: 8 }} />
      ) : rangeData?.error ? (
        <Alert type="error" showIcon message={rangeData.error} style={{ marginTop: 8 }} />
      ) : chart.points.length < 2 ? (
        <Empty description="No history in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '12px 0' }} />
      ) : (
        <div style={{ marginTop: 8 }}>
          <PodMetricsChart title={title} points={chart.points} seriesNames={chart.seriesNames} formatValue={formatValue} />
        </div>
      )}
    </div>
  )
}
