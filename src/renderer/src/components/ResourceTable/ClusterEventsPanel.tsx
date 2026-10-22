import { Empty, Typography } from 'antd'
import { useClusterEvents } from '../../queries/useClusterEvents'
import { readPaginationChange, embeddedTablePagination, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { useEventColumns } from './eventColumns'

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
  const columns = useEventColumns()
  const isOverview = overviewEmbed || (embedded && !compact)
  const { data, isLoading, isError, error } = useClusterEvents(
    clusterId,
    { involvedObjectKind, involvedObjectName },
    isActive
  )
  const { pagination, setPagination, paginationProps } = useTablePagination([
    clusterId,
    involvedObjectKind ?? null,
    involvedObjectName ?? null
  ])

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
            scroll={{ x: 860 }}
            resizable={!embedded && !isOverview}
            fitPageSize={embedded || isOverview}
          />
        </div>
      )}
    </div>
  )
}
