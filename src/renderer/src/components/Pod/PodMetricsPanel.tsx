import { useEffect, useMemo, useState } from 'react'
import { Alert, Progress, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { PodContainerMetric } from '@shared/types/pod'
import { DEFAULT_METRICS_TIME_RANGE, HISTORICAL_METRICS_WARNING, type MetricsTimeRange } from '@shared/metricsTimeRange'
import { usePodMetrics } from '../../queries/usePodMetrics'
import { usePodMetricsRange } from '../../queries/useMetricsRange'
import { isPodDetailData } from '@shared/types/pod'
import { usePodDetail } from '../../queries/usePodDetail'
import { formatBytes, formatCores } from '../../format'
import { usePodMetricsHistoryStore } from '../../stores/podMetricsHistoryStore'
import { seriesToChartPoints } from '../../utils/metricsChart'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'
import { MetricsTimeRangeSelect } from '../Metrics/MetricsTimeRangeSelect'
import { ExtendedMetricsCharts } from '../Metrics/ExtendedMetricsCharts'
import { PodMetricsChart } from './PodMetricsChart'

interface PodMetricsPanelProps {
  clusterId: string
  namespace: string
  podName: string
  podUid: string
  ageTimestamp: string | null
  isActive: boolean
}

export function PodMetricsPanel({
  clusterId,
  namespace,
  podName,
  podUid,
  ageTimestamp,
  isActive
}: PodMetricsPanelProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>(DEFAULT_METRICS_TIME_RANGE)
  const { data: metrics, isLoading: metricsLoading, dataUpdatedAt } = usePodMetrics(
    clusterId,
    namespace,
    podName,
    isActive
  )
  const { data: rangeData, isLoading: rangeLoading } = usePodMetricsRange(
    clusterId,
    namespace,
    podName,
    timeRange,
    isActive
  )
  const { data: detail, isLoading: detailLoading } = usePodDetail(clusterId, namespace, podName, isActive)

  const historyKey = `${clusterId}:${podUid}`
  const addSample = usePodMetricsHistoryStore((s) => s.addSample)
  const history = usePodMetricsHistoryStore((s) => s.historyByPod.get(historyKey))

  useEffect(() => {
    if (!metrics?.metricsAvailable || !dataUpdatedAt) return
    const containers: Record<string, { cpuUsageCores: number; memoryUsageBytes: number }> = {}
    for (const c of metrics.containers) {
      containers[c.name] = { cpuUsageCores: c.cpuUsageCores, memoryUsageBytes: c.memoryUsageBytes }
    }
    addSample(historyKey, {
      t: dataUpdatedAt,
      totalCpuUsageCores: metrics.totalCpuUsageCores,
      totalMemoryUsageBytes: metrics.totalMemoryUsageBytes,
      containers
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  const containerNames = useMemo(() => metrics?.containers.map((c) => c.name) ?? [], [metrics])

  const historicalCpu = useMemo(() => seriesToChartPoints(rangeData?.cpu), [rangeData?.cpu])
  const historicalMemory = useMemo(() => seriesToChartPoints(rangeData?.memory), [rangeData?.memory])

  const sessionCpuPoints = useMemo(
    () =>
      (history ?? []).map((s) => ({
        t: s.t,
        values: Object.fromEntries(containerNames.map((name) => [name, s.containers[name]?.cpuUsageCores ?? 0]))
      })),
    [history, containerNames]
  )
  const sessionMemoryPoints = useMemo(
    () =>
      (history ?? []).map((s) => ({
        t: s.t,
        values: Object.fromEntries(containerNames.map((name) => [name, s.containers[name]?.memoryUsageBytes ?? 0]))
      })),
    [history, containerNames]
  )

  const useHistorical = rangeData?.historicalAvailable === true
  const cpuChart = useHistorical ? historicalCpu : { points: sessionCpuPoints, seriesNames: containerNames }
  const memoryChart = useHistorical ? historicalMemory : { points: sessionMemoryPoints, seriesNames: containerNames }

  if (metricsLoading || detailLoading || rangeLoading) return <LoadingState />

  if (!metrics?.metricsAvailable) {
    return (
      <Alert
        type="info"
        showIcon
        message="Metrics unavailable"
        description="The metrics-server does not appear to be installed on this cluster, or usage data isn't ready yet."
      />
    )
  }

  const columns: ColumnsType<PodContainerMetric> = [
    { title: 'Container', dataIndex: 'name', key: 'name' },
    {
      title: 'CPU usage',
      key: 'cpu',
      render: (_, c) => <Typography.Text>{formatCores(c.cpuUsageCores)}</Typography.Text>
    },
    {
      title: 'Memory usage',
      key: 'memory',
      render: (_, c) => <Typography.Text>{formatBytes(c.memoryUsageBytes)}</Typography.Text>
    }
  ]

  const firstSampleAt = history?.[0]?.t
  const recordingSincePodStart = firstSampleAt && ageTimestamp && firstSampleAt - new Date(ageTimestamp).getTime() < 5000

  return (
    <div>
      <MetricsTimeRangeSelect value={timeRange} onChange={setTimeRange} />

      {!useHistorical && (
        <Alert type="warning" showIcon message={HISTORICAL_METRICS_WARNING} style={{ marginBottom: 12 }} />
      )}
      {rangeData?.error ? (
        <Alert type="error" showIcon message="Prometheus query failed" description={rangeData.error} style={{ marginBottom: 12 }} />
      ) : null}

      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <Typography.Text type="secondary">Total CPU</Typography.Text>
          <Progress percent={Math.min(100, metrics.totalCpuUsageCores * 100)} size="small" showInfo={false} />
          <Typography.Text strong>{formatCores(metrics.totalCpuUsageCores)}</Typography.Text>
        </div>
        <div style={{ flex: 1 }}>
          <Typography.Text type="secondary">Total Memory</Typography.Text>
          <Progress
            percent={Math.min(100, (metrics.totalMemoryUsageBytes / (1024 * 1024 * 1024)) * 20)}
            size="small"
            showInfo={false}
          />
          <Typography.Text strong>{formatBytes(metrics.totalMemoryUsageBytes)}</Typography.Text>
        </div>
      </div>

      <ResizableTable
        tableKey="pod-metrics-containers"
        rowKey="name"
        columns={columns}
        dataSource={metrics.containers}
        pagination={false}
        size="small"
      />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PodMetricsChart
          title="CPU usage over time"
          points={cpuChart.points}
          seriesNames={cpuChart.seriesNames.length > 0 ? cpuChart.seriesNames : containerNames}
          formatValue={formatCores}
        />
        <PodMetricsChart
          title="Memory usage over time"
          points={memoryChart.points}
          seriesNames={memoryChart.seriesNames.length > 0 ? memoryChart.seriesNames : containerNames}
          formatValue={formatBytes}
        />
        {!useHistorical && firstSampleAt && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {recordingSincePodStart
              ? `Showing the full pod lifetime, recorded since it started at ${dayjs(firstSampleAt).format('HH:mm:ss')}.`
              : `Recording since ${dayjs(firstSampleAt).format('HH:mm:ss')} — this pod started earlier, but Kubernetes' metrics API has no historical data from before MagicLens began observing it.`}
          </Typography.Text>
        )}
        <ExtendedMetricsCharts rangeData={rangeData} />
      </div>

      {isPodDetailData(detail) && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Node: {detail.nodeName} · Pod IP: {detail.podIP} · QoS: {detail.qosClass}
          </Typography.Text>
        </div>
      )}
    </div>
  )
}
