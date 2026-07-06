import { useEffect, useMemo, useState } from 'react'
import { Input, Progress, Space, Splitter, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceKind } from '@shared/resourceKinds'
import { isNamespaceScoped } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { useNodeMetrics } from '../../queries/useNodeMetrics'
import { kindColumnDefs } from '../../resourceConfig/kinds.renderer'
import { formatBytes, formatCores, percentOf } from '../../format'
import { AgeCell } from './AgeCell'
import { StatusTag } from './StatusTag'
import { LiveRefreshControl } from './LiveRefreshControl'
import { WatchStatusBadge } from './WatchStatusBadge'
import { EmptyState, ErrorState, LoadingState } from './EmptyErrorStates'
import { ResourceDetailPanel } from './ResourceDetailPanel'
import { ClusterMetricsSummary } from '../Metrics/ClusterMetricsSummary'

interface ResourceTableProps {
  clusterId: string
  namespace: string
  kind: ResourceKind
  isActive: boolean
}

export function ResourceTable({ clusterId, namespace, kind, isActive }: ResourceTableProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<ResourceListItem | null>(null)
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useResourceList(
    clusterId,
    namespace,
    kind,
    isActive
  )
  const isNodesKind = kind === 'Nodes'
  const { data: nodeMetrics } = useNodeMetrics(isNodesKind ? clusterId : null, isActive)

  useEffect(() => {
    setSelectedItem(null)
  }, [clusterId, namespace, kind])

  const columns = useMemo<ColumnsType<ResourceListItem>>(() => {
    const cols: ColumnsType<ResourceListItem> = [
      { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) }
    ]
    if (namespace === 'ALL' && isNamespaceScoped(kind)) {
      cols.push({ title: 'Namespace', dataIndex: 'namespace', key: 'namespace' })
    }
    for (const col of kindColumnDefs[kind]) {
      cols.push({ title: col.title, key: col.key, render: (_, item) => item.columns[col.key] ?? '-' })
    }
    if (isNodesKind) {
      cols.push({
        title: 'CPU',
        key: 'cpu-metric',
        render: (_, item) => {
          const node = nodeMetrics?.nodes.find((n) => n.name === item.name)
          if (!nodeMetrics?.metricsAvailable || !node) return '-'
          const percent = percentOf(node.cpuUsageCores, node.cpuCapacityCores)
          return (
            <div style={{ minWidth: 140 }}>
              {percent !== undefined && <Progress percent={percent} size="small" />}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {node.cpuUsageCores !== undefined ? formatCores(node.cpuUsageCores) : '-'}
              </Typography.Text>
            </div>
          )
        }
      })
      cols.push({
        title: 'Memory',
        key: 'memory-metric',
        render: (_, item) => {
          const node = nodeMetrics?.nodes.find((n) => n.name === item.name)
          if (!nodeMetrics?.metricsAvailable || !node) return '-'
          const percent = percentOf(node.memoryUsageBytes, node.memoryCapacityBytes)
          return (
            <div style={{ minWidth: 140 }}>
              {percent !== undefined && <Progress percent={percent} size="small" />}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {node.memoryUsageBytes !== undefined ? formatBytes(node.memoryUsageBytes) : '-'}
              </Typography.Text>
            </div>
          )
        }
      })
    }
    cols.push({
      title: 'Status',
      key: 'status',
      render: (_, item) => <StatusTag text={item.statusText} color={item.statusColor} />
    })
    cols.push({
      title: 'Age',
      key: 'age',
      render: (_, item) => <AgeCell timestamp={item.ageTimestamp} />
    })
    return cols
  }, [kind, namespace, isNodesKind, nodeMetrics])

  const items = 'items' in (data ?? {}) ? (data as { items: ResourceListItem[] }).items : []
  const filtered = search ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())) : items

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message={error instanceof Error ? error.message : String(error)} onRetry={refetch} />
  if (data && 'error' in data) return <ErrorState message={data.error} onRetry={refetch} />

  const listPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', flexShrink: 0, marginBottom: 12 }} wrap>
        <Space>
          <Input.Search
            placeholder={`Search ${kind.toLowerCase()} by name`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <WatchStatusBadge isError={isError} />
        </Space>
        <LiveRefreshControl dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} onManualRefresh={() => refetch()} />
      </Space>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {isNodesKind && (
          <div style={{ marginBottom: 16 }}>
            <ClusterMetricsSummary clusterId={clusterId} isActiveTab={isActive} />
          </div>
        )}
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            size="middle"
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedItem ? [selectedItem.id] : [],
              onChange: (_, rows) => setSelectedItem(rows[0] ?? null)
            }}
            onRow={(record) => ({
              onClick: () => setSelectedItem(record)
            })}
          />
        )}
      </div>
    </div>
  )

  if (!selectedItem) {
    return <div style={{ height: '100%' }}>{listPanel}</div>
  }

  return (
    <Splitter style={{ height: '100%' }}>
      <Splitter.Panel defaultSize="58%" min="35%">
        {listPanel}
      </Splitter.Panel>
      <Splitter.Panel defaultSize="42%" min="25%">
        <ResourceDetailPanel
          clusterId={clusterId}
          kind={kind}
          item={selectedItem}
          isActive={isActive}
          onClose={() => setSelectedItem(null)}
        />
      </Splitter.Panel>
    </Splitter>
  )
}
