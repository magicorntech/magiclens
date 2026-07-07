import { Empty, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import { useClusterEvents } from '../../queries/useClusterEvents'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { AgeCell } from './AgeCell'
import { LoadingState } from './EmptyErrorStates'

interface ClusterEventsPanelProps {
  clusterId: string
  isActive: boolean
  involvedObjectKind?: string
  involvedObjectName?: string
  title?: string
  compact?: boolean
  /** Fixed-height scroll region for Nodes page footer (avoids nested flex / tabs layout issues). */
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
  { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 140, ellipsis: true },
  { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
  { title: 'Count', dataIndex: 'count', key: 'count', width: 64 },
  {
    title: 'Last seen',
    dataIndex: 'lastTimestamp',
    key: 'lastTimestamp',
    width: 100,
    render: (v: string | null) => <AgeCell timestamp={v} />
  },
  { title: 'Source', dataIndex: 'source', key: 'source', width: 120, ellipsis: true }
]

export function ClusterEventsPanel({
  clusterId,
  isActive,
  involvedObjectKind,
  involvedObjectName,
  title,
  compact = false,
  embedded = false
}: ClusterEventsPanelProps): React.JSX.Element {
  const { data, isLoading, isError, error } = useClusterEvents(
    clusterId,
    { involvedObjectKind, involvedObjectName },
    isActive
  )
  const { setPagination, paginationProps } = useTablePagination([
    clusterId,
    involvedObjectKind ?? null,
    involvedObjectName ?? null
  ])

  if (isLoading) return <LoadingState />

  if (isError) {
    return <Typography.Text type="danger">{error instanceof Error ? error.message : String(error)}</Typography.Text>
  }

  if (data && 'error' in data) {
    return <Typography.Text type="danger">{data.error}</Typography.Text>
  }

  const events = data?.events ?? []
  const tableScroll = embedded ? { y: 220, x: 720 } : undefined

  return (
    <div style={embedded ? undefined : { height: '100%', minHeight: 120, display: 'flex', flexDirection: 'column' }}>
      {title ? (
        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: compact ? 12 : 14 }}>
          {title}
        </Typography.Text>
      ) : null}
      {events.length === 0 ? (
        <Empty description="No events" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={embedded ? undefined : { flex: 1, minHeight: 0, overflow: 'auto' }}>
          <ResizableTable
            tableKey={`cluster-events${involvedObjectKind ? `-${involvedObjectKind}` : ''}`}
            rowKey="id"
            columns={columns}
            dataSource={events}
            pagination={embedded ? { pageSize: 10, size: 'small', hideOnSinglePage: true } : paginationProps(events.length)}
            onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
            size="small"
            scroll={tableScroll}
            resizable={!embedded}
          />
        </div>
      )}
    </div>
  )
}
