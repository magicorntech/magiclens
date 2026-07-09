import { Empty, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import { useResourceEvents } from '../../queries/useResourceEvents'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { AgeCell } from './AgeCell'

interface ResourceEventsPanelProps {
  clusterId: string
  namespace: string
  name: string
  target: ResourceMutationTarget
  isActive: boolean
  embedded?: boolean
}

const columns: ColumnsType<ResourceEventItem> = [
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    width: 90,
    render: (v: string) => <Tag color={v === 'Warning' ? 'gold' : 'blue'}>{v}</Tag>
  },
  { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 160, ellipsis: true },
  { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
  { title: 'Count', dataIndex: 'count', key: 'count', width: 70 },
  {
    title: 'Last seen',
    dataIndex: 'lastTimestamp',
    key: 'lastTimestamp',
    width: 110,
    render: (v: string | null) => <AgeCell timestamp={v} />
  },
  { title: 'Source', dataIndex: 'source', key: 'source', width: 140, ellipsis: true }
]

export function ResourceEventsPanel({
  clusterId,
  namespace,
  name,
  target,
  isActive,
  embedded = false
}: ResourceEventsPanelProps): React.JSX.Element {
  const { data, isLoading, isError, error } = useResourceEvents(clusterId, namespace, name, target, isActive)
  const { setPagination, paginationProps } = useTablePagination([clusterId, namespace, name, target])

  if (isError) {
    return (
      <Typography.Text type="danger">
        {error instanceof Error ? error.message : String(error)}
      </Typography.Text>
    )
  }

  if (data && 'error' in data) {
    return <Typography.Text type="danger">{data.error}</Typography.Text>
  }

  const events = data?.events ?? []
  const tableScroll = embedded ? { y: 220, x: 720 } : undefined

  if (!isLoading && events.length === 0) {
    return <Empty description="No events for this resource" />
  }

  return (
    <div style={embedded ? undefined : { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={embedded ? undefined : { flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ResizableTable
          tableKey="resource-events"
          rowKey="id"
          columns={columns}
          dataSource={events}
          loading={isLoading}
          pagination={embedded ? { pageSize: 10, size: 'small', hideOnSinglePage: true } : paginationProps(events.length)}
          onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
          size="small"
          scroll={tableScroll}
          resizable={!embedded}
        />
      </div>
    </div>
  )
}
