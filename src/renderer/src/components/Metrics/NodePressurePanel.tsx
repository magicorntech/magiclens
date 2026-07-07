import { useState } from 'react'
import { Alert, Empty } from 'antd'
import dayjs from 'dayjs'
import { DEFAULT_METRICS_TIME_RANGE, HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useNodePressureMetrics } from '../../queries/useMetricsRange'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { MetricsTimeRangeSelect } from './MetricsTimeRangeSelect'

interface NodePressurePanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

export function NodePressurePanel({ clusterId, nodeName, isActive }: NodePressurePanelProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const { data, isLoading } = useNodePressureMetrics(clusterId, nodeName, timeRange, isActive)

  if (isLoading) return <LoadingState />

  return (
    <div>
      <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />
      {!data?.historicalAvailable ? (
        <Alert type="warning" showIcon message={data?.warning ?? HISTORICAL_METRICS_WARNING} />
      ) : data.pressureEvents && data.pressureEvents.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {data.pressureEvents.map((event, idx) => (
            <li key={`${event.timestamp}-${event.condition}-${idx}`}>
              {dayjs(event.timestamp).format('YYYY-MM-DD HH:mm:ss')} — {event.condition}
            </li>
          ))}
        </ul>
      ) : (
        <Empty description="No pressure events in this range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )
}
