import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Progress, Space, Splitter, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnsType, TableProps } from 'antd/es/table'
import type { SorterResult } from 'antd/es/table/interface'
import type { ResourceKind } from '@shared/resourceKinds'
import { isNamespaceScoped } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { useNodeMetrics } from '../../queries/useNodeMetrics'
import { kindColumnDefs } from '../../resourceConfig/kinds.renderer'
import { buildCreateTemplate } from '../../resourceConfig/manifestTemplates'
import { formatBytes, formatCores, percentOf } from '../../format'
import {
  columnValueSorter,
  compareAgeTimestamps,
  statusSorter,
  type TableSortState
} from '../../utils/tableSort'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { AgeCell } from './AgeCell'
import { StatusTag } from './StatusTag'
import { LiveRefreshControl } from './LiveRefreshControl'
import { WatchStatusBadge } from './WatchStatusBadge'
import { EmptyState, ErrorState, LoadingState } from './EmptyErrorStates'
import { ResourceDetailPanel } from './ResourceDetailPanel'
import { ResourceRowActions } from './ResourceRowActions'
import { IngressHostsCell } from './IngressHostsCell'
import { ClusterMetricsSummary } from '../Metrics/ClusterMetricsSummary'
import { NodesEventsFooter } from '../Metrics/NodesEventsFooter'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { batchDeleteResources, confirmBatchDelete } from './batchDelete'
import { useClusterStore } from '../../stores/clusterStore'

interface ResourceTableProps {
  clusterId: string
  namespace: string
  kind: ResourceKind
  isActive: boolean
}

function applySortOrder(
  col: ColumnsType<ResourceListItem>[number],
  sortState: TableSortState
): ColumnsType<ResourceListItem>[number] {
  if (!col.key || sortState.columnKey !== col.key) return col
  return { ...col, sortOrder: sortState.order ?? null }
}

export function ResourceTable({ clusterId, namespace, kind, isActive }: ResourceTableProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<ResourceListItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [sortState, setSortState] = useState<TableSortState>({})
  const queryClient = useQueryClient()
  const clearResourceFocus = useClusterStore((s) => s.clearResourceFocus)
  const resourceFocus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.resourceFocus ?? null)
  const { setPagination, paginationProps } = useTablePagination([clusterId, namespace, kind, search])
  const { openYamlEditor } = useBottomPanel()
  const listQueryKey = useMemo(() => ['resource-list', clusterId, namespace, kind], [clusterId, namespace, kind])
  const { data, isLoading, isError, error, refetch, isFetching, watchStatus } = useResourceList(
    clusterId,
    namespace,
    kind,
    isActive
  )
  const isNodesKind = kind === 'Nodes'
  const { data: nodeMetrics } = useNodeMetrics(isNodesKind ? clusterId : null, isActive)

  useEffect(() => {
    setSelectedItem(null)
    setSelectedRowKeys([])
  }, [clusterId, namespace, kind])

  const columns = useMemo<ColumnsType<ResourceListItem>>(() => {
    const cols: ColumnsType<ResourceListItem> = [
      applySortOrder(
        { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        sortState
      )
    ]
    if (namespace === 'ALL' && isNamespaceScoped(kind)) {
      cols.push(
        applySortOrder(
          {
            title: 'Namespace',
            dataIndex: 'namespace',
            key: 'namespace',
            sorter: (a, b) => a.namespace.localeCompare(b.namespace)
          },
          sortState
        )
      )
    }
    for (const col of kindColumnDefs[kind]) {
      cols.push(
        applySortOrder(
          {
            title: col.title,
            key: col.key,
            sorter: columnValueSorter(col.key),
            render: (_, item) => {
              if (kind === 'Ingresses' && col.key === 'hosts') {
                return (
                  <IngressHostsCell hosts={item.columns.hosts} tlsHosts={item.columns.tlsHosts} />
                )
              }
              return item.columns[col.key] ?? '-'
            }
          },
          sortState
        )
      )
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
    cols.push(
      applySortOrder(
        {
          title: 'Status',
          key: 'status',
          sorter: statusSorter,
          render: (_, item) => (
            <StatusTag text={item.statusText} color={item.statusColor} detail={item.statusDetail} />
          )
        },
        sortState
      )
    )
    cols.push(
      applySortOrder(
        {
          title: 'Age',
          key: 'age',
          sorter: (a, b) => compareAgeTimestamps(a.ageTimestamp, b.ageTimestamp),
          render: (_, item) => <AgeCell timestamp={item.ageTimestamp} />
        },
        sortState
      )
    )
    cols.push({
      title: '',
      key: 'actions',
      width: 56,
      render: (_, item) => (
        <ResourceRowActions
          clusterId={clusterId}
          target={{ type: 'builtin', kind }}
          namespace={item.namespace}
          name={item.name}
          itemId={item.id}
          listQueryKey={listQueryKey}
        />
      )
    })
    return cols
  }, [kind, namespace, isNodesKind, nodeMetrics, clusterId, listQueryKey, sortState])

  const handleTableChange: TableProps<ResourceListItem>['onChange'] = (paginationConfig, _filters, sorter) => {
    setPagination(readPaginationChange(paginationConfig))
    const active = (Array.isArray(sorter) ? sorter[0] : sorter) as SorterResult<ResourceListItem>
    setSortState({
      columnKey: (active.columnKey as string) ?? active.field?.toString(),
      order: active.order ?? null
    })
  }

  const items = 'items' in (data ?? {}) ? (data as { items: ResourceListItem[] }).items : []
  const filtered = search ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())) : items

  useEffect(() => {
    if (!resourceFocus || resourceFocus.kind !== kind) return
    const match = filtered.find(
      (item) =>
        item.name === resourceFocus.name &&
        (!isNamespaceScoped(kind) || item.namespace === resourceFocus.namespace)
    )
    if (match) {
      setSelectedItem(match)
      clearResourceFocus(clusterId)
    }
  }, [resourceFocus, filtered, kind, clusterId, clearResourceFocus])

  const selectedForDelete = useMemo(
    () => filtered.filter((item) => selectedRowKeys.includes(item.id)),
    [filtered, selectedRowKeys]
  )

  function handleBatchDelete(): void {
    if (selectedForDelete.length === 0) return
    confirmBatchDelete(kind, selectedForDelete, async () => {
      const result = await batchDeleteResources(
        queryClient,
        listQueryKey,
        clusterId,
        { type: 'builtin', kind },
        selectedForDelete
      )
      if (result.failed.length === 0) {
        setSelectedRowKeys([])
        if (selectedItem && selectedForDelete.some((i) => i.id === selectedItem.id)) {
          setSelectedItem(null)
        }
      }
      return result
    })
  }

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
          <WatchStatusBadge isError={isError} watchStatus={watchStatus} />
        </Space>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
              Delete ({selectedRowKeys.length})
            </Button>
          )}
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              openYamlEditor({
                title: `New ${kind}`,
                clusterId,
                mode: 'create',
                namespace,
                initialYaml: buildCreateTemplate(kind, namespace),
                listQueryKey
              })
            }
          >
            Create
          </Button>
          <LiveRefreshControl isFetching={isFetching} onManualRefresh={() => refetch()} />
        </Space>
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
            pagination={paginationProps(filtered.length)}
            size="middle"
            onChange={handleTableChange}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[])
            }}
            onRow={(record) => ({
              onClick: () => setSelectedItem(record)
            })}
          />
        )}
      </div>
      {isNodesKind && (
        <NodesEventsFooter clusterId={clusterId} isActive={isActive} selectedNodeName={selectedItem?.name} />
      )}
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
