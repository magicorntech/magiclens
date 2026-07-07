import { useEffect, useMemo } from 'react'
import { Alert, Progress, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { PodContainerMetric } from '@shared/types/pod'
import { usePodMetrics } from '../../queries/usePodMetrics'
import { isPodDetailData } from '@shared/types/pod'
import { usePodDetail } from '../../queries/usePodDetail'
import { formatBytes, formatCores } from '../../format'
import { usePodMetricsHistoryStore } from '../../stores/podMetricsHistoryStore'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'
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
  const { data: metrics, isLoading: metricsLoading, dataUpdatedAt } = usePodMetrics(
    clusterId,
    namespace,
    podName,
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
    // `historyKey`/`addSample` are stable for the lifetime of this panel instance; only new data matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  const containerNames = useMemo(() => metrics?.containers.map((c) => c.name) ?? [], [metrics])

  const cpuPoints = useMemo(
    () =>
      (history ?? []).map((s) => ({
        t: s.t,
        values: Object.fromEntries(containerNames.map((name) => [name, s.containers[name]?.cpuUsageCores ?? 0]))
      })),
    [history, containerNames]
  )
  const memoryPoints = useMemo(
    () =>
      (history ?? []).map((s) => ({
        t: s.t,
        values: Object.fromEntries(containerNames.map((name) => [name, s.containers[name]?.memoryUsageBytes ?? 0]))
      })),
    [history, containerNames]
  )

  if (metricsLoading || detailLoading) return <LoadingState />

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

      <ResizableTable tableKey="pod-metrics-containers" rowKey="name" columns={columns} dataSource={metrics.containers} pagination={false} size="small" />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PodMetricsChart title="CPU usage over time" points={cpuPoints} seriesNames={containerNames} formatValue={formatCores} />
        <PodMetricsChart
          title="Memory usage over time"
          points={memoryPoints}
          seriesNames={containerNames}
          formatValue={formatBytes}
        />
        {firstSampleAt && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {recordingSincePodStart
              ? `Showing the full pod lifetime, recorded since it started at ${dayjs(firstSampleAt).format('HH:mm:ss')}.`
              : `Recording since ${dayjs(firstSampleAt).format('HH:mm:ss')} — this pod started earlier, but Kubernetes' metrics API has no historical data from before MagicLens began observing it.`}
          </Typography.Text>
        )}
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
