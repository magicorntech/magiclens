import { Alert, Card, Col, Empty, Progress, Row, Typography } from 'antd'
import { useNodeMetrics } from '../../queries/useNodeMetrics'
import { formatBytes, formatCores, percentOf } from '../../format'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface NodeMetricsPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

export function NodeMetricsPanel({ clusterId, nodeName, isActive }: NodeMetricsPanelProps): React.JSX.Element {
  const { data, isLoading } = useNodeMetrics(clusterId, isActive)

  if (isLoading || !data) return <LoadingState />

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

  const node = data.nodes.find((n) => n.name === nodeName)
  if (!node) {
    return <Empty description="No metrics found for this node" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const cpuPercent = percentOf(node.cpuUsageCores, node.cpuCapacityCores)
  const memoryPercent = percentOf(node.memoryUsageBytes, node.memoryCapacityBytes)

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card size="small" title="CPU">
          {cpuPercent !== undefined && <Progress percent={cpuPercent} />}
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {node.cpuUsageCores !== undefined && <>Usage: {formatCores(node.cpuUsageCores)} · </>}
            Capacity: {formatCores(node.cpuCapacityCores)}
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
            {node.memoryUsageBytes !== undefined && <>Usage: {formatBytes(node.memoryUsageBytes)} · </>}
            Capacity: {formatBytes(node.memoryCapacityBytes)}
          </Typography.Text>
        </Card>
      </Col>
    </Row>
  )
}
