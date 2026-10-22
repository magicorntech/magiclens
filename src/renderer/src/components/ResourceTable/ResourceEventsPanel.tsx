import { Empty, Typography } from 'antd'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useResourceEvents } from '../../queries/useResourceEvents'
import { readPaginationChange, embeddedTablePagination, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { useEventColumns } from './eventColumns'

interface ResourceEventsPanelProps {
  clusterId: string
  namespace: string
  name: string
  target: ResourceMutationTarget
  isActive: boolean
  embedded?: boolean
}

export function ResourceEventsPanel({
  clusterId,
  namespace,
  name,
  target,
  isActive,
  embedded = false
}: ResourceEventsPanelProps): React.JSX.Element {
  const columns = useEventColumns()
  const { data, isLoading, isError, error } = useResourceEvents(clusterId, namespace, name, target, isActive)
  const { pagination, setPagination, paginationProps } = useTablePagination([
    clusterId,
    namespace,
    name,
    target
  ])

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
  const tableScroll = { x: 860 }

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
          pagination={embedded ? embeddedTablePagination(pagination, events.length) : paginationProps(events.length)}
          onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
          size="small"
          scroll={tableScroll}
          resizable={!embedded}
        />
      </div>
    </div>
  )
}
