import type { ColumnsType, TableProps } from 'antd/es/table'
import type { ResourceListItem } from '@shared/types/resource'
import type { NodeMetricsResponse } from '@shared/types/metrics'
import type { NodesDashboardSectionId } from '@shared/types/nodesDashboard'
import { useMemo, useState } from 'react'
import { Splitter } from 'antd'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { useResourceList } from '../../queries/useResourceList'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useClusterStore } from '../../stores/clusterStore'
import { NodesHealthBanner } from './NodesHealthBanner'
import { NodesResourceGrid } from './NodesResourceGrid'
import { NodesQuickInsights, NodesTopConsumers } from './NodesQuickInsights'
import { NodesEventsStrip } from './NodesEventsStrip'
import { NodeInspectorDrawer } from './NodeInspectorDrawer'
import { ResizableTable } from '../../utils/ResizableTable'
import { EmptyState } from '../ResourceTable/EmptyErrorStates'
import {
  aggregatePodStatsByNode,
  buildQuickInsights,
  topCpuNodes,
  topMemoryNodes,
  topPodNodes,
  topRestartNodes
} from './nodesOverviewUtils'
import { MotionDiv, slideUp } from '../ui/Motion'

interface NodesOverviewPageProps {
  clusterId: string
  isActive: boolean
  filtered: ResourceListItem[]
  visibleColumns: ColumnsType<ResourceListItem>
  tableKey: string
  tableLayoutEpoch?: number
  tableLoading?: boolean
  selectedItem: ResourceListItem | null
  selectedRowKeys: string[]
  onSelectItem: (item: ResourceListItem | null) => void
  onSelectRowKeys: (keys: string[]) => void
  onTableChange: TableProps<ResourceListItem>['onChange']
  paginationProps: (total: number) => TableProps<ResourceListItem>['pagination']
  nodeMetrics?: NodeMetricsResponse
}

const DASHBOARD_SECTIONS = new Set<NodesDashboardSectionId>([
  'health',
  'resources',
  'quickInsights',
  'topConsumers'
])

const NODES_TABLE_SPLIT_KEY = 'ml-nodes-table-split-dashboard'
const DEFAULT_DASHBOARD_SPLIT = '38%'

function readDashboardSplitSize(): string {
  try {
    const stored = localStorage.getItem(NODES_TABLE_SPLIT_KEY)
    if (stored && /^\d+(\.\d+)?%$/.test(stored)) return stored
  } catch {
    // ignore
  }
  return DEFAULT_DASHBOARD_SPLIT
}

function renderDashboardBatch(batch: NodesDashboardSectionId[], renderSection: (id: NodesDashboardSectionId) => React.ReactNode): React.ReactNode {
  if (batch.length === 0) return null

  const widgetIds = batch.filter((id) => id === 'quickInsights' || id === 'topConsumers')
  const cardIds = batch.filter((id) => id === 'health' || id === 'resources')

  return (
    <section key={`dash-${batch.join('-')}`} className="ml-nodes-overview-dashboard">
      {cardIds.map((id) => (
        <div key={id} className="ml-nodes-overview-dashboard-block">
          {renderSection(id)}
        </div>
      ))}
      {widgetIds.length > 0 && (
        <div className="ml-nodes-overview-widgets">
          {widgetIds.map((id) => (
            <div key={id} className="ml-nodes-overview-dashboard-block">
              {renderSection(id)}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function NodesOverviewPage({
  clusterId,
  isActive,
  filtered,
  visibleColumns,
  tableKey,
  tableLayoutEpoch = 0,
  tableLoading = false,
  selectedItem,
  selectedRowKeys,
  onSelectItem,
  onSelectRowKeys,
  onTableChange,
  paginationProps,
  nodeMetrics
}: NodesOverviewPageProps): React.JSX.Element {
  const dashboardPrefs = useDisplaySettingsStore((s) => s.nodesDashboard)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const [dashboardSplitSize, setDashboardSplitSize] = useState(readDashboardSplitSize)
  const { data: clusterMetrics, isLoading: metricsLoading } = useClusterMetrics(clusterId, isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const visibleSections = dashboardPrefs.order.filter((id) => dashboardPrefs.visible[id])

  const podStats = (() => {
    if (!podsData || 'error' in podsData) return new Map()
    return aggregatePodStatsByNode(podsData.items)
  })()

  const insights =
    nodeMetrics?.nodes ? buildQuickInsights(filtered, nodeMetrics.nodes, podStats) : []

  const topConsumers = {
    cpu: topCpuNodes(nodeMetrics?.nodes ?? []),
    memory: topMemoryNodes(nodeMetrics?.nodes ?? []),
    pods: topPodNodes(podStats),
    restarts: topRestartNodes(podStats)
  }

  function handleNavigateToNode(nodeName: string): void {
    navigateToResource(clusterId, { kind: 'Nodes', namespace: '', name: nodeName })
    const match = filtered.find((n) => n.name === nodeName)
    if (match) onSelectItem(match)
  }

  function renderDashboardSection(id: NodesDashboardSectionId): React.ReactNode {
    switch (id) {
      case 'health':
        return metricsLoading || !clusterMetrics ? (
          <div className="ml-skeleton-row" style={{ height: 48 }} />
        ) : (
          <NodesHealthBanner data={clusterMetrics} />
        )
      case 'resources':
        return metricsLoading || !clusterMetrics ? (
          <div className="ml-skeleton-row" style={{ height: 88 }} />
        ) : (
          <NodesResourceGrid clusterId={clusterId} data={clusterMetrics} isActive={isActive} />
        )
      case 'quickInsights':
        return <NodesQuickInsights insights={insights} onNavigateToNode={handleNavigateToNode} />
      case 'topConsumers':
        return <NodesTopConsumers {...topConsumers} onNavigateToNode={handleNavigateToNode} />
      default:
        return null
    }
  }

  function renderMainSection(id: NodesDashboardSectionId): React.ReactNode {
    if (id === 'table') {
      return (
        <MotionDiv key="table" className="ml-nodes-overview-table-section" {...slideUp}>
          <div className="ml-nodes-overview-table-header">
            <h4 className="ml-nodes-section-title">Nodes</h4>
            <span className="ml-nodes-overview-table-count">{filtered.length} total</span>
          </div>
          <div className="ml-nodes-overview-table-wrap">
            {!tableLoading && filtered.length === 0 ? (
              <EmptyState
                title="No nodes found"
                description="This cluster has no registered nodes, or your search filter excluded all results."
                variant="default"
              />
            ) : (
              <ResizableTable
                tableKey={tableKey}
                layoutEpoch={tableLayoutEpoch}
                loading={tableLoading}
                rowKey="id"
                columns={visibleColumns}
                dataSource={filtered}
                pagination={paginationProps(filtered.length)}
                size="small"
                className="ml-nodes-table"
                virtualScroll={filtered.length > 40}
                onChange={onTableChange}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => onSelectRowKeys(keys as string[])
                }}
                onRow={(record) => ({
                  onClick: () => onSelectItem(record)
                })}
                rowClassName={(record) =>
                  selectedItem?.id === record.id ? 'ml-nodes-table-row--selected' : ''
                }
              />
            )}
          </div>
        </MotionDiv>
      )
    }

    if (id === 'events') {
      return (
        <NodesEventsStrip
          key="events"
          clusterId={clusterId}
          isActive={isActive}
          selectedNodeName={selectedItem?.name}
        />
      )
    }

    return null
  }

  function handleSplitResizeEnd(sizes: number[]): void {
    const total = sizes.reduce((sum, size) => sum + size, 0)
    if (total <= 0) return
    const pct = Math.min(78, Math.max(12, Math.round((sizes[0] / total) * 100)))
    const next = `${pct}%`
    setDashboardSplitSize(next)
    try {
      localStorage.setItem(NODES_TABLE_SPLIT_KEY, next)
    } catch {
      // ignore
    }
  }

  const layout = useMemo(() => {
    const aboveTable: React.ReactNode[] = []
    const belowTable: React.ReactNode[] = []
    let tableSection: React.ReactNode | null = null
    let target = aboveTable
    let dashboardBatch: NodesDashboardSectionId[] = []
    let dashIndex = 0

    function flushDashboard(): void {
      if (dashboardBatch.length === 0) return
      const section = renderDashboardBatch(dashboardBatch, renderDashboardSection)
      if (section) {
        target.push(
          <div key={`dash-wrap-${dashIndex++}`} className="ml-nodes-overview-dashboard-wrap">
            {section}
          </div>
        )
      }
      dashboardBatch = []
    }

    for (const id of visibleSections) {
      if (id === 'table') {
        flushDashboard()
        tableSection = renderMainSection('table')
        target = belowTable
        continue
      }

      if (DASHBOARD_SECTIONS.has(id)) {
        dashboardBatch.push(id)
        continue
      }

      flushDashboard()
      const section = renderMainSection(id)
      if (section) target.push(section)
    }
    flushDashboard()

    return { aboveTable, tableSection, belowTable }
  }, [
    visibleSections,
    metricsLoading,
    clusterMetrics,
    insights,
    topConsumers,
    filtered,
    selectedItem,
    selectedRowKeys,
    tableKey,
    visibleColumns,
    nodeMetrics,
    isActive,
    clusterId
  ])

  const { aboveTable, tableSection, belowTable } = layout
  const useTableSplitter = tableSection !== null && aboveTable.length > 0

  let mainContent: React.ReactNode

  if (useTableSplitter) {
    mainContent = (
      <Splitter
        layout="vertical"
        className="ml-nodes-overview-split"
        onResizeEnd={handleSplitResizeEnd}
      >
        <Splitter.Panel defaultSize={dashboardSplitSize} min="12%" max="78%">
          <div className="ml-nodes-overview-dashboard-pane">{aboveTable}</div>
        </Splitter.Panel>
        <Splitter.Panel min="18%">
          <div className="ml-nodes-overview-lower-pane">
            {tableSection}
            {belowTable}
          </div>
        </Splitter.Panel>
      </Splitter>
    )
  } else if (tableSection !== null) {
    mainContent = (
      <>
        {aboveTable}
        {tableSection}
        {belowTable}
      </>
    )
  } else if (aboveTable.length > 0 || belowTable.length > 0) {
    mainContent = (
      <>
        {aboveTable}
        {belowTable}
      </>
    )
  } else {
    mainContent = (
      <EmptyState
        title="Nodes dashboard hidden"
        description="Enable sections in Settings → Display → Nodes page layout."
      />
    )
  }

  return (
    <div className="ml-nodes-overview">
      {mainContent}

      <NodeInspectorDrawer
        open={!!selectedItem}
        clusterId={clusterId}
        item={selectedItem}
        isActive={isActive}
        onClose={() => onSelectItem(null)}
      />
    </div>
  )
}
