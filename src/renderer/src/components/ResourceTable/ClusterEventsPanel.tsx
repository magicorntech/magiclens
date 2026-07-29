import { Empty, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import { useClusterEvents } from '../../queries/useClusterEvents'
import { readPaginationChange, embeddedTablePagination, EMBEDDED_TABLE_PAGE_SIZE, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { AgeCell } from './AgeCell'

interface ClusterEventsPanelProps {
  clusterId: string
  isActive: boolean
  involvedObjectKind?: string
  involvedObjectName?: string
  title?: string
  compact?: boolean
  /** Fixed-height scroll region for Nodes page footer (avoids nested flex / tabs layout issues). */
  embedded?: boolean
  /** Overview page: bounded height, scrollable body, visible pagination from 20/page. */
  overviewEmbed?: boolean
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
  embedded = false,
  overviewEmbed = false
}: ClusterEventsPanelProps): React.JSX.Element {
  const isOverview = overviewEmbed || (embedded && !compact)
  const { data, isLoading, isError, error } = useClusterEvents(
    clusterId,
    { involvedObjectKind, involvedObjectName },
    isActive
  )
  const { pagination, setPagination, paginationProps } = useTablePagination(
    [clusterId, involvedObjectKind ?? null, involvedObjectName ?? null],
    { defaultPageSize: isOverview ? EMBEDDED_TABLE_PAGE_SIZE : embedded ? EMBEDDED_TABLE_PAGE_SIZE : undefined }
  )

  if (isError) {
    return <Typography.Text type="danger">{error instanceof Error ? error.message : String(error)}</Typography.Text>
  }

  if (data && 'error' in data) {
    return <Typography.Text type="danger">{data.error}</Typography.Text>
  }

  const events = data?.events ?? []
  const wrapperClass = isOverview ? 'ml-cluster-events-embedded ml-cluster-events-embedded--overview' : embedded ? 'ml-cluster-events-embedded' : undefined

  return (
    <div
      className={wrapperClass}
      style={!embedded && !isOverview ? { height: '100%', minHeight: 120, display: 'flex', flexDirection: 'column' } : undefined}
    >
      {title ? (
        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: compact ? 12 : 14 }}>
          {title}
        </Typography.Text>
      ) : null}
      {!isLoading && events.length === 0 ? (
        <Empty description="No events" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          className={isOverview || embedded ? 'ml-cluster-events-embedded__table' : undefined}
          style={!embedded && !isOverview ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}
        >
          <ResizableTable
            tableKey={`cluster-events${involvedObjectKind ? `-${involvedObjectKind}` : ''}${isOverview ? '-overview' : ''}`}
            rowKey="id"
            columns={columns}
            dataSource={events}
            loading={isLoading}
            pagination={
              embedded || isOverview
                ? embeddedTablePagination(pagination, events.length)
                : paginationProps(events.length)
            }
            onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
            size="small"
            scroll={{ x: 720 }}
            resizable={!embedded && !isOverview}
            fitPageSize={embedded || isOverview}
          />
        </div>
      )}
    </div>
  )
}
