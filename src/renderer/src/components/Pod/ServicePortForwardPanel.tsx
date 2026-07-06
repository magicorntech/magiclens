import { Alert, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ServicePortInfo } from '@shared/types/service'
import { useServiceDetail } from '../../queries/useServiceDetail'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { PortForwardControl } from './PortForwardControl'

interface ServicePortForwardPanelProps {
  clusterId: string
  namespace: string
  serviceName: string
  isActive: boolean
}

export function ServicePortForwardPanel({
  clusterId,
  namespace,
  serviceName,
  isActive
}: ServicePortForwardPanelProps): React.JSX.Element {
  const { data, isLoading } = useServiceDetail(clusterId, namespace, serviceName, isActive)

  if (isLoading) return <LoadingState />

  if (!data?.ports.length) {
    return <Alert type="info" showIcon message="This service does not declare any ports" />
  }

  const columns: ColumnsType<ServicePortInfo> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => v ?? '-' },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Target', dataIndex: 'targetPort', key: 'targetPort' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (v) => <Tag>{v}</Tag> },
    {
      title: 'Forward',
      key: 'forward',
      render: (_, port) => (
        <PortForwardControl
          clusterId={clusterId}
          namespace={namespace}
          label={`${serviceName}:${port.port}`}
          target={{ mode: 'service', serviceName, port: port.port }}
        />
      )
    }
  ]

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Forwards a local port to a pod behind this service ({data.type} · {data.clusterIP}). Kubernetes has no direct
        service port-forward API, so a running pod matching the service's selector is resolved automatically.
      </Typography.Paragraph>
      <Table
        rowKey={(row) => `${row.name ?? ''}-${row.port}`}
        columns={columns}
        dataSource={data.ports}
        pagination={false}
        size="small"
      />
    </div>
  )
}
