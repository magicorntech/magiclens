import { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Col, Empty, Progress, Row, Typography } from 'antd'
import dayjs from 'dayjs'
import { DEFAULT_METRICS_TIME_RANGE, HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { useNodeMetrics } from '../../queries/useNodeMetrics'
import { useNodeMetricsRange } from '../../queries/useMetricsRange'
import { formatBytes, formatCores, nodeResourcePercent } from '../../format'
import { useNodeMetricsHistoryStore } from '../../stores/nodeMetricsHistoryStore'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { MetricsTimeRangeSelect } from './MetricsTimeRangeSelect'
import { ExtendedMetricsCharts } from './ExtendedMetricsCharts'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface NodeMetricsPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

export function NodeMetricsPanel({ clusterId, nodeName, isActive }: NodeMetricsPanelProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const { data, isLoading, dataUpdatedAt } = useNodeMetrics(clusterId, isActive)
  const { data: rangeData, isLoading: rangeLoading } = useNodeMetricsRange(clusterId, nodeName, timeRange, isActive)
  const historyKey = `${clusterId}:${nodeName}`
  const addSample = useNodeMetricsHistoryStore((s) => s.addSample)
  const history = useNodeMetricsHistoryStore((s) => s.historyByNode.get(historyKey))

  const node = data?.nodes.find((n) => n.name === nodeName)

  useEffect(() => {
    if (!data?.metricsAvailable || !node || node.cpuUsageCores === undefined || node.memoryUsageBytes === undefined) {
      return
    }
    if (!dataUpdatedAt) return
    addSample(historyKey, {
      t: dataUpdatedAt,
      cpuUsageCores: node.cpuUsageCores,
      memoryUsageBytes: node.memoryUsageBytes
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt, node?.cpuUsageCores, node?.memoryUsageBytes])

  const historicalCpu = useMemo(() => seriesToChartPoints(rangeData?.cpu), [rangeData?.cpu])
  const historicalMemory = useMemo(() => seriesToChartPoints(rangeData?.memory), [rangeData?.memory])

  const sessionCpuPoints = useMemo(
    () => (history ?? []).map((s) => ({ t: s.t, values: { Usage: s.cpuUsageCores } })),
    [history]
  )
  const sessionMemoryPoints = useMemo(
    () => (history ?? []).map((s) => ({ t: s.t, values: { Usage: s.memoryUsageBytes } })),
    [history]
  )

  const useHistorical = rangeData?.historicalAvailable === true
  const cpuChart = useHistorical ? historicalCpu : { points: sessionCpuPoints, seriesNames: ['Usage'] as string[] }
  const memoryChart = useHistorical ? historicalMemory : { points: sessionMemoryPoints, seriesNames: ['Usage'] as string[] }

  if (isLoading || !data || rangeLoading) return <LoadingState />

  if (!data.metricsAvailable) {
    return (
      <Alert
        type="info"
        showIcon
        message="Metrics unavailable"
        description="The metrics-server does not appear to be installed on this cluster, or usage data isn't ready yet."
      />
    )
  }

  if (!node) {
    return <Empty description="No metrics found for this node" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const cpuPercent = nodeResourcePercent(node.cpuUsageCores, node.cpuAllocatableCores, node.cpuCapacityCores)
  const memoryPercent = nodeResourcePercent(
    node.memoryUsageBytes,
    node.memoryAllocatableBytes,
    node.memoryCapacityBytes
  )
  const firstSampleAt = history?.[0]?.t

  return (
    <div>
      <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />

      {!useHistorical && (
        <Alert type="warning" showIcon message={HISTORICAL_METRICS_WARNING} style={{ marginBottom: 12 }} />
      )}
      {rangeData?.error ? (
        <Alert type="error" showIcon message="Prometheus query failed" description={rangeData.error} style={{ marginBottom: 12 }} />
      ) : null}

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="CPU">
            {cpuPercent !== undefined && (
              <Progress percent={cpuPercent} format={(p) => `${p}%`} status={cpuPercent >= 90 ? 'exception' : undefined} />
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {node.cpuUsageCores !== undefined && <>Usage: {formatCores(node.cpuUsageCores)} · </>}
              Allocatable: {formatCores(node.cpuAllocatableCores)} · Capacity: {formatCores(node.cpuCapacityCores)}
            </Typography.Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Memory">
            {memoryPercent !== undefined && (
              <Progress
                percent={memoryPercent}
                format={(p) => `${p}%`}
                status={memoryPercent >= 90 ? 'exception' : undefined}
              />
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {node.memoryUsageBytes !== undefined && <>Usage: {formatBytes(node.memoryUsageBytes)} · </>}
              Allocatable: {formatBytes(node.memoryAllocatableBytes)} · Capacity:{' '}
              {formatBytes(node.memoryCapacityBytes)}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PodMetricsChart
          title="CPU usage over time"
          points={cpuChart.points}
          seriesNames={cpuChart.seriesNames}
          formatValue={formatCores}
        />
        <PodMetricsChart
          title="Memory usage over time"
          points={memoryChart.points}
          seriesNames={memoryChart.seriesNames}
          formatValue={formatBytes}
        />
        {!useHistorical && firstSampleAt ? (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Recording since {dayjs(firstSampleAt).format('HH:mm:ss')} — charts show samples collected while MagicLens is
            observing this node.
          </Typography.Text>
        ) : null}
        <ExtendedMetricsCharts rangeData={rangeData} />
      </div>
    </div>
  )
}
