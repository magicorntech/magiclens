import { useTranslation } from 'react-i18next'
import type { MetricsRangeResponse } from '@shared/types/metrics'
import { formatBytes } from '../../format'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { PodMetricsChart } from '../Pod/PodMetricsChart'
import { DiskUsageSummary, latestDiskSnapshots } from './DiskUsageSummary'

interface ExtendedMetricsChartsProps {
  rangeData?: MetricsRangeResponse
  formatCount?: (value: number) => string
  /** Show node filesystem fullness cards + charts. */
  showNodeFilesystems?: boolean
  /** Show pod PVC volume fullness cards + charts. */
  showPodVolumes?: boolean
}

export function ExtendedMetricsCharts({
  rangeData,
  formatCount = (v) => String(Math.round(v)),
  showNodeFilesystems = false,
  showPodVolumes = false
}: ExtendedMetricsChartsProps): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!rangeData?.historicalAvailable) return null

  const networkRx = seriesToChartPoints(rangeData.networkReceive)
  const networkTx = seriesToChartPoints(rangeData.networkTransmit)
  const disk = seriesToChartPoints(rangeData.diskUsage)
  const restarts = seriesToChartPoints(rangeData.restartCount)
  const fsUsed = seriesToChartPoints(rangeData.filesystemUsageBytes)
  const fsPercent = seriesToChartPoints(rangeData.filesystemPercent)
  const volUsed = seriesToChartPoints(rangeData.volumeUsageBytes)
  const volPercent = seriesToChartPoints(rangeData.volumePercent)

  const nodeDisks = showNodeFilesystems
    ? latestDiskSnapshots(
        rangeData.filesystemPercent,
        rangeData.filesystemUsageBytes,
        rangeData.filesystemSizeBytes
      )
    : []
  const podVolumes = showPodVolumes
    ? latestDiskSnapshots(rangeData.volumePercent, rangeData.volumeUsageBytes, rangeData.volumeCapacityBytes)
    : []

  const hasAny =
    networkRx.points.length > 0 ||
    networkTx.points.length > 0 ||
    disk.points.length > 0 ||
    restarts.points.length > 0 ||
    fsUsed.points.length > 0 ||
    fsPercent.points.length > 0 ||
    volUsed.points.length > 0 ||
    volPercent.points.length > 0 ||
    nodeDisks.length > 0 ||
    podVolumes.length > 0
  if (!hasAny) return null

  const formatPercent = (v: number) => `${Math.round(v)}%`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showNodeFilesystems ? (
        <DiskUsageSummary
          title={t('metricsCharts.nodeDisks')}
          snapshots={nodeDisks}
          emptyHint={
            fsPercent.points.length === 0 && fsUsed.points.length === 0
              ? t('metricsCharts.nodeDisksUnavailable')
              : undefined
          }
        />
      ) : null}

      {showPodVolumes ? (
        <DiskUsageSummary
          title={t('metricsCharts.podVolumes')}
          snapshots={podVolumes}
          emptyHint={
            volPercent.points.length === 0 && volUsed.points.length === 0
              ? t('metricsCharts.podVolumesUnavailable')
              : undefined
          }
        />
      ) : null}

      {fsPercent.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.filesystemPercent')}
          points={fsPercent.points}
          seriesNames={fsPercent.seriesNames}
          formatValue={formatPercent}
        />
      )}
      {fsUsed.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.filesystemUsed')}
          points={fsUsed.points}
          seriesNames={fsUsed.seriesNames}
          formatValue={formatBytes}
        />
      )}
      {volPercent.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.volumePercent')}
          points={volPercent.points}
          seriesNames={volPercent.seriesNames}
          formatValue={formatPercent}
        />
      )}
      {volUsed.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.volumeUsed')}
          points={volUsed.points}
          seriesNames={volUsed.seriesNames}
          formatValue={formatBytes}
        />
      )}
      {networkRx.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.networkReceive')}
          points={networkRx.points}
          seriesNames={networkRx.seriesNames}
          formatValue={formatBytes}
        />
      )}
      {networkTx.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.networkTransmit')}
          points={networkTx.points}
          seriesNames={networkTx.seriesNames}
          formatValue={formatBytes}
        />
      )}
      {disk.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.containerDisk')}
          points={disk.points}
          seriesNames={disk.seriesNames}
          formatValue={formatBytes}
        />
      )}
      {restarts.points.length > 0 && (
        <PodMetricsChart
          title={t('metricsCharts.restarts')}
          points={restarts.points}
          seriesNames={restarts.seriesNames}
          formatValue={formatCount}
        />
      )}
    </div>
  )
}
