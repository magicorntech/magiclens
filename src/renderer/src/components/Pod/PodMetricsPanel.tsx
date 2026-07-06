import { Alert, Progress, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PodContainerMetric } from '@shared/types/pod'
import { usePodMetrics } from '../../queries/usePodMetrics'
import { usePodDetail } from '../../queries/usePodDetail'
import { formatBytes, formatCores } from '../../format'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface PodMetricsPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

export function PodMetricsPanel({ clusterId, namespace, podName, isActive }: PodMetricsPanelProps): React.JSX.Element {
  const { data: metrics, isLoading: metricsLoading } = usePodMetrics(clusterId, namespace, podName, isActive)
  const { data: detail, isLoading: detailLoading } = usePodDetail(clusterId, namespace, podName, isActive)

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
      render: (_, c) => (
        <Typography.Text>
          {formatCores(c.cpuUsageCores)}
        </Typography.Text>
      )
    },
    {
      title: 'Memory usage',
      key: 'memory',
      render: (_, c) => <Typography.Text>{formatBytes(c.memoryUsageBytes)}</Typography.Text>
    }
  ]

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
          <Progress percent={Math.min(100, (metrics.totalMemoryUsageBytes / (1024 * 1024 * 1024)) * 20)} size="small" showInfo={false} />
          <Typography.Text strong>{formatBytes(metrics.totalMemoryUsageBytes)}</Typography.Text>
        </div>
      </div>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={metrics.containers}
        pagination={false}
        size="small"
      />
      {detail && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Node: {detail.nodeName} · Pod IP: {detail.podIP} · QoS: {detail.qosClass}
          </Typography.Text>
        </div>
      )}
    </div>
  )
}
