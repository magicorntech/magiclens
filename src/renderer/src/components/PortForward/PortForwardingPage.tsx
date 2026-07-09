import { useState } from 'react'
import { Button, Empty, Space, Tag, Tooltip, Typography, message } from 'antd'
import { Link, Square } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import type { PortForwardSession } from '@shared/types/portForward'
import { usePortForwards } from '../../queries/usePortForwards'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '../ui/Icon'
import { ResizableTable } from '../../utils/ResizableTable'

interface PortForwardingPageProps {
  clusterId: string
}

export function PortForwardingPage({ clusterId }: PortForwardingPageProps): React.JSX.Element {
  const { data, isLoading } = usePortForwards(clusterId)
  const queryClient = useQueryClient()
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  async function handleStop(id: string): Promise<void> {
    setStoppingId(id)
    try {
      await window.api.portForward.stop({ id })
      await queryClient.invalidateQueries({ queryKey: ['port-forwards', clusterId] })
      message.success('Port forward stopped')
    } finally {
      setStoppingId(null)
    }
  }

  const columns: ColumnsType<PortForwardSession> = [
    { title: 'Label', dataIndex: 'label', key: 'label', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
    {
      title: 'Source',
      key: 'source',
      render: (_, s) => (
        <Space size="small">
          <Tag color={s.sourceKind === 'pod' ? 'geekblue' : 'purple'}>{s.sourceKind}</Tag>
          <Typography.Text>{s.sourceName}</Typography.Text>
          <Typography.Text type="secondary">:{s.sourcePort}</Typography.Text>
        </Space>
      )
    },
    { title: 'Pod', dataIndex: 'resolvedPodName', key: 'resolvedPodName' },
    {
      title: 'Local address',
      key: 'local',
      render: (_, s) => <Tag color="green">localhost:{s.localPort}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, s) => (
        <Space size="small">
          <Tooltip title={`Open http://localhost:${s.localPort}`}>
            <Button
              size="small"
              icon={<Icon icon={Link} variant="detail" />}
              onClick={() => window.open(`http://localhost:${s.localPort}`, '_blank')}
            />
          </Tooltip>
          <Button
            size="small"
            danger
            icon={<Icon icon={Square} variant="detail" />}
            loading={stoppingId === s.id}
            onClick={() => handleStop(s.id)}
          >
            Stop
          </Button>
        </Space>
      )
    }
  ]

  const sessions = data?.sessions ?? []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Port Forwarding
      </Typography.Title>
      {!isLoading && sessions.length === 0 ? (
        <Empty
          description="No active port forwards. Start one from a Pod's Network tab or a Service's Port Forward tab."
          style={{ marginTop: 48 }}
        />
      ) : (
        <ResizableTable
          tableKey="port-forwards"
          rowKey="id"
          columns={columns}
          dataSource={sessions}
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      )}
    </div>
  )
}
