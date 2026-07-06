import { Alert, Card, Col, Progress, Row, Skeleton, Statistic, Typography } from 'antd'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { formatBytes, formatCores, percentOf } from '../../format'

interface ClusterMetricsSummaryProps {
  clusterId: string
  isActiveTab: boolean
}

export function ClusterMetricsSummary({ clusterId, isActiveTab }: ClusterMetricsSummaryProps): React.JSX.Element {
  const { data, isLoading } = useClusterMetrics(clusterId, isActiveTab)

  if (isLoading || !data) return <Skeleton active paragraph={{ rows: 4 }} />

  const cpuPercent = percentOf(data.cpuUsageCores, data.cpuAllocatableCores)
  const memoryPercent = percentOf(data.memoryUsageBytes, data.memoryAllocatableBytes)

  return (
    <div>
      {!data.metricsAvailable && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="metrics-server is not available in this cluster. CPU and memory usage metrics cannot be displayed."
        />
      )}

      <Row gutter={16}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Total Nodes" value={data.totalNodes} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Ready" value={data.readyNodes} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="NotReady"
              value={data.notReadyNodes}
              valueStyle={data.notReadyNodes > 0 ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Running Pods" value={data.runningPods} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Pending Pods" value={data.pendingPods} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="Failed Pods"
              value={data.failedPods}
              valueStyle={data.failedPods > 0 ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card size="small" title="CPU">
            {cpuPercent !== undefined && <Progress percent={cpuPercent} />}
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {data.cpuUsageCores !== undefined && <>Usage: {formatCores(data.cpuUsageCores)} · </>}
              Allocatable: {formatCores(data.cpuAllocatableCores)} · Capacity: {formatCores(data.cpuCapacityCores)}
            </Typography.Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Memory">
            {memoryPercent !== undefined && <Progress percent={memoryPercent} />}
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {data.memoryUsageBytes !== undefined && <>Usage: {formatBytes(data.memoryUsageBytes)} · </>}
              Allocatable: {formatBytes(data.memoryAllocatableBytes)} · Capacity: {formatBytes(data.memoryCapacityBytes)}
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
