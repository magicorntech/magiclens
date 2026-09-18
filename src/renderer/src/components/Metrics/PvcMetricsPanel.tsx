import { useState } from 'react'
import { Alert, Card, Col, Progress, Row, Typography } from 'antd'
import { DEFAULT_METRICS_TIME_RANGE, HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../../format'
import { usePvcMetricsRange } from '../../queries/useMetricsRange'
import { pvcMetricsKey, usePvcTableMetrics } from '../../queries/usePvcTableMetrics'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { DiskUsageSummary, latestDiskSnapshots } from './DiskUsageSummary'
import { MetricsTimeRangeSelect } from './MetricsTimeRangeSelect'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface PvcMetricsPanelProps {
  clusterId: string
  namespace: string
  pvcName: string
  isActive: boolean
}

export function PvcMetricsPanel({
  clusterId,
  namespace,
  pvcName,
  isActive
}: PvcMetricsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const usageByKey = usePvcTableMetrics(clusterId, namespace, isActive)
  const { data: rangeData, isLoading: rangeLoading } = usePvcMetricsRange(
    clusterId,
    namespace,
    pvcName,
    timeRange,
    isActive
  )

  const snapshot = usageByKey.get(pvcMetricsKey(namespace, pvcName))
  const historical = rangeData?.historicalAvailable === true
  const snapshots = latestDiskSnapshots(
    rangeData?.volumePercent,
    rangeData?.volumeUsageBytes,
    rangeData?.volumeCapacityBytes
  )
  const volPercent = seriesToChartPoints(rangeData?.volumePercent)
  const volUsed = seriesToChartPoints(rangeData?.volumeUsageBytes)
  const formatPercent = (v: number) => `${Math.round(v)}%`

  if (rangeLoading && !snapshot && !historical) return <LoadingState />

  if (!snapshot && !historical) {
    return (
      <Alert
        type="info"
        showIcon
        message={t('pvcMetrics.unavailableTitle')}
        description={t('metricsCharts.podVolumesUnavailable')}
      />
    )
  }

  const percent = snapshot?.percent
  const used = snapshot?.usedBytes
  const capacity = snapshot?.capacityBytes
  const available = snapshot?.availableBytes

  return (
    <div>
      <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />

      {!historical ? (
        <Alert type="warning" showIcon message={HISTORICAL_METRICS_WARNING} style={{ marginBottom: 12 }} />
      ) : null}
      {rangeData?.error ? (
        <Alert
          type="error"
          showIcon
          message={t('pvcMetrics.queryFailed')}
          description={rangeData.error}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {snapshot ? (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card size="small" title={t('pvcMetrics.usage')}>
              {percent !== undefined ? (
                <Progress
                  percent={Math.round(percent)}
                  status={percent >= 90 ? 'exception' : percent >= 75 ? 'active' : undefined}
                  format={(p) => `${p}%`}
                />
              ) : null}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {used !== undefined ? t('pvcMetrics.usedValue', { value: formatBytes(used) }) : t('pvcMetrics.usedUnknown')}
                {' · '}
                {capacity !== undefined
                  ? t('pvcMetrics.capacityValue', { value: formatBytes(capacity) })
                  : t('pvcMetrics.capacityUnknown')}
                {available !== undefined ? ` · ${t('pvcMetrics.availableValue', { value: formatBytes(available) })}` : ''}
              </Typography.Text>
            </Card>
          </Col>
        </Row>
      ) : null}

      <DiskUsageSummary
        title={t('metricsCharts.podVolumes')}
        snapshots={snapshots}
        emptyHint={
          historical && snapshots.length === 0 ? t('metricsCharts.podVolumesUnavailable') : undefined
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {volPercent.points.length > 0 ? (
          <PodMetricsChart
            title={t('metricsCharts.volumePercent')}
            points={volPercent.points}
            seriesNames={volPercent.seriesNames}
            formatValue={formatPercent}
          />
        ) : null}
        {volUsed.points.length > 0 ? (
          <PodMetricsChart
            title={t('metricsCharts.volumeUsed')}
            points={volUsed.points}
            seriesNames={volUsed.seriesNames}
            formatValue={formatBytes}
          />
        ) : null}
      </div>
    </div>
  )
}
