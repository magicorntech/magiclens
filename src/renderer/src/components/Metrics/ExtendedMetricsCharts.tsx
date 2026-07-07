import type { MetricsRangeResponse } from '@shared/types/metrics'
import { formatBytes } from '../../format'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface ExtendedMetricsChartsProps {
  rangeData?: MetricsRangeResponse
  formatCount?: (value: number) => string
}

export function ExtendedMetricsCharts({
  rangeData,
  formatCount = (v) => String(Math.round(v))
}: ExtendedMetricsChartsProps): React.JSX.Element | null {
  if (!rangeData?.historicalAvailable) return null

  const networkRx = seriesToChartPoints(rangeData.networkReceive)
  const networkTx = seriesToChartPoints(rangeData.networkTransmit)
  const disk = seriesToChartPoints(rangeData.diskUsage)
  const restarts = seriesToChartPoints(rangeData.restartCount)

  const hasAny =
    networkRx.points.length > 0 ||
    networkTx.points.length > 0 ||
    disk.points.length > 0 ||
    restarts.points.length > 0
  if (!hasAny) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {networkRx.points.length > 0 && (
        <PodMetricsChart title="Network receive" points={networkRx.points} seriesNames={networkRx.seriesNames} formatValue={formatBytes} />
      )}
      {networkTx.points.length > 0 && (
        <PodMetricsChart title="Network transmit" points={networkTx.points} seriesNames={networkTx.seriesNames} formatValue={formatBytes} />
      )}
      {disk.points.length > 0 && (
        <PodMetricsChart title="Disk usage" points={disk.points} seriesNames={disk.seriesNames} formatValue={formatBytes} />
      )}
      {restarts.points.length > 0 && (
        <PodMetricsChart title="Restart count" points={restarts.points} seriesNames={restarts.seriesNames} formatValue={formatCount} />
      )}
    </div>
  )
}
