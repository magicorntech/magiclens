import { useEffect, useMemo } from 'react'
import { Alert, Card, Col, Empty, Progress, Row, Typography } from 'antd'
import dayjs from 'dayjs'
import { useNodeMetrics } from '../../queries/useNodeMetrics'
import { formatBytes, formatCores, percentOf } from '../../format'
import { useNodeMetricsHistoryStore } from '../../stores/nodeMetricsHistoryStore'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { PodMetricsChart } from '../Pod/PodMetricsChart'

interface NodeMetricsPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

export function NodeMetricsPanel({ clusterId, nodeName, isActive }: NodeMetricsPanelProps): React.JSX.Element {
  const { data, isLoading, dataUpdatedAt } = useNodeMetrics(clusterId, isActive)
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

  const cpuPoints = useMemo(
    () => (history ?? []).map((s) => ({ t: s.t, values: { Usage: s.cpuUsageCores } })),
    [history]
  )
  const memoryPoints = useMemo(
    () => (history ?? []).map((s) => ({ t: s.t, values: { Usage: s.memoryUsageBytes } })),
    [history]
  )

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

  if (!node) {
    return <Empty description="No metrics found for this node" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const cpuPercent = percentOf(node.cpuUsageCores, node.cpuCapacityCores)
  const memoryPercent = percentOf(node.memoryUsageBytes, node.memoryCapacityBytes)
  const firstSampleAt = history?.[0]?.t

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="CPU">
            {cpuPercent !== undefined && <Progress percent={cpuPercent} />}
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {node.cpuUsageCores !== undefined && <>Usage: {formatCores(node.cpuUsageCores)} · </>}
              Capacity: {formatCores(node.cpuCapacityCores)}
            </Typography.Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Memory">
            {memoryPercent !== undefined && <Progress percent={memoryPercent} />}
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {node.memoryUsageBytes !== undefined && <>Usage: {formatBytes(node.memoryUsageBytes)} · </>}
              Capacity: {formatBytes(node.memoryCapacityBytes)}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PodMetricsChart title="CPU usage over time" points={cpuPoints} seriesNames={['Usage']} formatValue={formatCores} />
        <PodMetricsChart
          title="Memory usage over time"
          points={memoryPoints}
          seriesNames={['Usage']}
          formatValue={formatBytes}
        />
        {firstSampleAt && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Recording since {dayjs(firstSampleAt).format('HH:mm:ss')} — charts show samples collected while MagicLens is
            observing this node.
          </Typography.Text>
        )}
      </div>
    </div>
  )
}
