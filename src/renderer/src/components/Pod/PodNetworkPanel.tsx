import { Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PodContainerInfo, PodServiceBinding } from '@shared/types/pod'
import { usePodNetwork } from '../../queries/usePodNetwork'
import { usePodDetail } from '../../queries/usePodDetail'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { PortForwardControl } from './PortForwardControl'

interface PodNetworkPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

function resolveTargetPort(targetPort: string, containers: PodContainerInfo[]): number {
  const asNumber = Number(targetPort)
  if (!Number.isNaN(asNumber)) return asNumber
  for (const c of containers) {
    const match = c.ports.find((p) => p.name === targetPort)
    if (match) return match.containerPort
  }
  return asNumber
}

export function PodNetworkPanel({ clusterId, namespace, podName, isActive }: PodNetworkPanelProps): React.JSX.Element {
  const { data: network, isLoading: networkLoading } = usePodNetwork(clusterId, namespace, podName, isActive)
  const { data: detail, isLoading: detailLoading } = usePodDetail(clusterId, namespace, podName, isActive)

  if (networkLoading || detailLoading) return <LoadingState />

  const containers = detail?.containers ?? []

  const serviceColumns: ColumnsType<PodServiceBinding> = [
    { title: 'Service', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Cluster IP', dataIndex: 'clusterIP', key: 'clusterIP' },
    {
      title: 'Ports',
      key: 'ports',
      render: (_, svc) => (
        <Space orientation="vertical" size="small">
          {svc.ports.map((p) => {
            const numericTargetPort = resolveTargetPort(p.targetPort, containers)
            return (
              <Space key={`${svc.name}-${p.port}`} size="small" wrap>
                <Typography.Text style={{ fontSize: 12 }}>
                  {p.name ? `${p.name}: ` : ''}
                  {p.port} → {p.targetPort}/{p.protocol}
                </Typography.Text>
                {Number.isFinite(numericTargetPort) && (
                  <PortForwardControl
                    clusterId={clusterId}
                    namespace={namespace}
                    label={`${svc.name}:${p.port}`}
                    target={{ mode: 'pod', podName, targetPort: numericTargetPort }}
                  />
                )}
              </Space>
            )
          })}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Typography.Title level={5}>Services</Typography.Title>
      {!network?.services.length ? (
        <Empty description="No services route traffic to this pod" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          rowKey="name"
          columns={serviceColumns}
          dataSource={network.services}
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
        />
      )}

      <Typography.Title level={5}>Container ports</Typography.Title>
      {!containers.some((c) => c.ports.length > 0) ? (
        <Empty description="No container ports declared" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          rowKey={(row) => `${row.container}-${row.containerPort}-${row.protocol}`}
          columns={[
            { title: 'Container', dataIndex: 'container', key: 'container' },
            { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => v ?? '-' },
            { title: 'Port', dataIndex: 'containerPort', key: 'containerPort' },
            { title: 'Protocol', dataIndex: 'protocol', key: 'protocol' },
            {
              title: 'Forward',
              key: 'forward',
              render: (_, row) => (
                <PortForwardControl
                  clusterId={clusterId}
                  namespace={namespace}
                  label={`${podName}:${row.containerPort}`}
                  target={{ mode: 'pod', podName, targetPort: row.containerPort }}
                />
              )
            }
          ]}
          dataSource={containers.flatMap((c) => c.ports.map((p) => ({ container: c.name, ...p })))}
          pagination={false}
          size="small"
        />
      )}
    </div>
  )
}
