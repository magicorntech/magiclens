import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input, Splitter } from 'antd'
import { Plus, Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
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
import { formatBytes, formatCores } from '../../format'
import { NodeMetricUsageBar } from '../Metrics/NodeMetricUsageBar'
import {
  columnValueSorter,
  compareAgeTimestamps,
  statusSorter,
  type TableSortState
} from '../../utils/tableSort'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable, resetStoredTableWidths } from '../../utils/ResizableTable'
import { useTableColumnPrefs } from '../../utils/useTableColumnPrefs'
import { TableColumnPicker } from '../ui/TableColumnPicker'
import { ResourceTableToolbar } from './ResourceTableToolbar'
import { ResourceDetailDrawer } from './ResourceDetailDrawer'
import { AgeCell } from './AgeCell'
import { StatusTag } from './StatusTag'
import { LiveRefreshControl } from './LiveRefreshControl'
import { useResourceWatchDisplayStore } from '../../stores/resourceWatchDisplayStore'
import { EmptyState, ErrorState } from './EmptyErrorStates'
import { ResourceDetailPanel } from './ResourceDetailPanel'
import { isWorkloadKind } from '@shared/types/workload'
import { ResourceRowActions } from './ResourceRowActions'
import { WorkloadResourceRowActions } from './WorkloadResourceRowActions'
import { columnUsesRichRender, renderNamespaceCell, renderResourceColumnCell } from './resourceColumnRender'
import { NodesOverviewPage } from '../Nodes/NodesOverviewPage'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { batchDeleteResources, confirmBatchDelete } from './batchDelete'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'

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
  const [tableLayoutEpoch, setTableLayoutEpoch] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ResourceListItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [sortState, setSortState] = useState<TableSortState>({})
  const queryClient = useQueryClient()
  const clearResourceFocus = useClusterStore((s) => s.clearResourceFocus)
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const resourceFocus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.resourceFocus ?? null)
  const selectedResourceKind = useClusterStore(
    (s) => s.clusters.find((c) => c.id === clusterId)?.selectedResourceKind ?? null
  )
  const setResourceWatchDisplay = useResourceWatchDisplayStore((s) => s.setDisplay)
  const { setPagination, paginationProps } = useTablePagination([clusterId, namespace, kind, search])
  const { openYamlEditor, openResourceDetail } = useBottomPanel()
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const layoutMode = useLayoutMode()
  const isNodesKind = kind === 'Nodes'
  const detailInSidebar = !isNodesKind && resourceDetailPlacement === 'right' && canUseSplitLayouts(layoutMode)
  const detailInDrawer =
    !isNodesKind &&
    (resourceDetailPlacement === 'drawer' ||
      (resourceDetailPlacement === 'right' && !canUseSplitLayouts(layoutMode)))
  const detailInBottom = !isNodesKind && resourceDetailPlacement === 'bottom'
  const listQueryKey = useMemo(() => ['resource-list', clusterId, namespace, kind], [clusterId, namespace, kind])
  const { data, isLoading, isError, error, refetch, isFetching, watchStatus } = useResourceList(
    clusterId,
    namespace,
    kind,
    isActive
  )
  const tableLoading = isLoading
  const { data: nodeMetrics } = useNodeMetrics(isNodesKind ? clusterId : null, isActive)

  useEffect(() => {
    setSelectedItem(null)
    setSelectedRowKeys([])
  }, [clusterId, namespace, kind])

  useEffect(() => {
    if (!isActive) {
      setResourceWatchDisplay(clusterId, null)
      return
    }
    if (kind !== selectedResourceKind) return
    setResourceWatchDisplay(clusterId, { kind, namespace, watchStatus, isError })
  }, [
    clusterId,
    namespace,
    kind,
    watchStatus,
    isError,
    isActive,
    selectedResourceKind,
    setResourceWatchDisplay
  ])

  const columns = useMemo<ColumnsType<ResourceListItem>>(() => {
    const columnActions = {
      onNamespaceFilter: (ns: string) => setSelectedNamespace(clusterId, ns),
      onNavigateToNode: (nodeName: string) =>
        navigateToResource(clusterId, { kind: 'Nodes', namespace: '', name: nodeName })
    }

    const cols: ColumnsType<ResourceListItem> = [
      applySortOrder(
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
          sorter: (a, b) => a.name.localeCompare(b.name),
          ellipsis: true
        },
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
            sorter: (a, b) => a.namespace.localeCompare(b.namespace),
            ellipsis: false,
            render: (_, item) => renderNamespaceCell(item.namespace, columnActions)
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
            ellipsis: !columnUsesRichRender(kind, col.key),
            render: (_, item) => renderResourceColumnCell(kind, col.key, item, columnActions)
          },
          sortState
        )
      )
    }
    if (isNodesKind) {
      cols.push({
        title: 'CPU',
        key: 'cpu-metric',
        width: 160,
        render: (_, item) => {
          const node = nodeMetrics?.nodes.find((n) => n.name === item.name)
          if (!nodeMetrics?.metricsAvailable || !node) return '-'
          return (
            <NodeMetricUsageBar
              usage={node.cpuUsageCores}
              allocatable={node.cpuAllocatableCores}
              capacity={node.cpuCapacityCores}
              formatValue={formatCores}
              clusterId={clusterId}
              nodeName={item.name}
              metric="cpu"
              isActive={isActive}
              variant="table"
            />
          )
        }
      })
      cols.push({
        title: 'Memory',
        key: 'memory-metric',
        width: 160,
        render: (_, item) => {
          const node = nodeMetrics?.nodes.find((n) => n.name === item.name)
          if (!nodeMetrics?.metricsAvailable || !node) return '-'
          return (
            <NodeMetricUsageBar
              usage={node.memoryUsageBytes}
              allocatable={node.memoryAllocatableBytes}
              capacity={node.memoryCapacityBytes}
              formatValue={formatBytes}
              clusterId={clusterId}
              nodeName={item.name}
              metric="memory"
              isActive={isActive}
              variant="table"
            />
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
          ellipsis: false,
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
          ellipsis: false,
          render: (_, item) => <AgeCell timestamp={item.ageTimestamp} />
        },
        sortState
      )
    )
    cols.push({
      title: '',
      key: 'actions',
      width: isWorkloadKind(kind) ? 96 : 56,
      ellipsis: false,
      render: (_, item) =>
        isWorkloadKind(kind) ? (
          <WorkloadResourceRowActions
            clusterId={clusterId}
            kind={kind}
            target={{ type: 'builtin', kind }}
            namespace={item.namespace}
            name={item.name}
            itemId={item.id}
            listQueryKey={listQueryKey}
          />
        ) : (
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
  }, [kind, namespace, isNodesKind, nodeMetrics, clusterId, listQueryKey, sortState, isActive, setSelectedNamespace, navigateToResource])

  const allColumnKeys = useMemo(
    () => columns.map((c) => String(c.key ?? '')).filter(Boolean),
    [columns]
  )
  const tableKeyFull = `resource-list-${kind}`
  const { visibleKeys, prefs, toggleColumn, reorderColumns, resetColumns: resetColumnPrefs } = useTableColumnPrefs(tableKeyFull, allColumnKeys)
  const resetColumns = useCallback(() => {
    resetColumnPrefs()
    resetStoredTableWidths(tableKeyFull)
    setTableLayoutEpoch((epoch) => epoch + 1)
  }, [resetColumnPrefs, tableKeyFull])
  const visibleColumns = useMemo(
    () =>
      visibleKeys
        .map((key) => columns.find((c) => String(c.key) === key))
        .filter((c): c is (typeof columns)[number] => !!c),
    [columns, visibleKeys]
  )
  const columnPickerItems = useMemo(
    () =>
      [...prefs]
        .sort((a, b) => a.order - b.order)
        .map((p) => {
          const col = columns.find((c) => String(c.key) === p.key)
          return { key: p.key, title: typeof col?.title === 'string' ? col.title : p.key, visible: p.visible }
        })
        .filter((c) => c.key !== 'actions'),
    [prefs, columns]
  )

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
  const liveSelectedItem = useMemo(() => {
    if (!selectedItem) return null
    return filtered.find((item) => item.id === selectedItem.id) ?? items.find((item) => item.id === selectedItem.id) ?? selectedItem
  }, [filtered, items, selectedItem])

  function selectResource(item: ResourceListItem): void {
    setSelectedItem(item)
    if (detailInBottom) {
      openResourceDetail({ clusterId, resourceKind: kind, namespace, item })
    }
  }

  useEffect(() => {
    if (!resourceFocus || resourceFocus.kind !== kind) return
    const match = filtered.find(
      (item) =>
        item.name === resourceFocus.name &&
        (!isNamespaceScoped(kind) || item.namespace === resourceFocus.namespace)
    )
    if (match) {
      setSelectedItem(match)
      if (detailInBottom) {
        openResourceDetail({ clusterId, resourceKind: kind, namespace, item: match })
      }
      clearResourceFocus(clusterId)
    }
  }, [resourceFocus, filtered, kind, clusterId, clearResourceFocus, detailInBottom, namespace, openResourceDetail])

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

  const nodesTableContent = (
    <NodesOverviewPage
      clusterId={clusterId}
      isActive={isActive}
      filtered={filtered}
      visibleColumns={visibleColumns}
      tableKey={tableKeyFull}
      tableLayoutEpoch={tableLayoutEpoch}
      tableLoading={tableLoading}
      selectedItem={selectedItem}
      selectedRowKeys={selectedRowKeys}
      onSelectItem={setSelectedItem}
      onSelectRowKeys={setSelectedRowKeys}
      onTableChange={handleTableChange}
      paginationProps={paginationProps}
      nodeMetrics={nodeMetrics}
    />
  )

  if (isError) return <ErrorState message={error instanceof Error ? error.message : String(error)} onRetry={refetch} />
  if (data && 'error' in data) return <ErrorState message={data.error} onRetry={refetch} />

  const listPanel = (
      <div className={`ml-resource-page${isNodesKind ? ' ml-resource-page--nodes' : ''}`}>
      <ResourceTableToolbar
        search={
          <>
            <Input.Search
              className="ml-resource-search"
              placeholder={`Search ${kind.toLowerCase()} by name`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </>
        }
        actions={
          <>
            {selectedRowKeys.length > 0 && (
              <button type="button" className="ml-btn ml-btn--ghost ml-btn--danger" onClick={handleBatchDelete}>
                <Icon icon={Trash2} variant="detail" />
                <span>Delete ({selectedRowKeys.length})</span>
              </button>
            )}
            <button
              type="button"
              className="ml-btn ml-btn--ghost"
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
              <Icon icon={Plus} variant="detail" />
              <span>Create</span>
            </button>
            <LiveRefreshControl isFetching={isFetching} onManualRefresh={() => refetch()} />
            <TableColumnPicker columns={columnPickerItems} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetColumns} />
          </>
        }
      />
      <div className="ml-resource-page-body">
        {isNodesKind ? (
          nodesTableContent
        ) : (
          <>
            {!tableLoading && filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <ResizableTable
                tableKey={tableKeyFull}
                layoutEpoch={tableLayoutEpoch}
                loading={tableLoading}
                rowKey="id"
                columns={visibleColumns}
                dataSource={filtered}
                pagination={paginationProps(filtered.length)}
                size="middle"
                virtualScroll={filtered.length > 60}
                onChange={handleTableChange}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[])
                }}
                onRow={(record) => ({
                  onClick: () => selectResource(record)
                })}
              />
            )}
          </>
        )}
      </div>
    </div>
  )

  if (!detailInSidebar || !liveSelectedItem) {
    return (
      <>
        <div style={{ height: '100%' }}>{listPanel}</div>
        {detailInDrawer && (
          <ResourceDetailDrawer
            open={!!liveSelectedItem}
            clusterId={clusterId}
            kind={kind}
            item={liveSelectedItem}
            isActive={isActive}
            listQueryKey={listQueryKey}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </>
    )
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
          item={liveSelectedItem}
          isActive={isActive}
          listQueryKey={listQueryKey}
          onClose={() => setSelectedItem(null)}
        />
      </Splitter.Panel>
    </Splitter>
  )
}
