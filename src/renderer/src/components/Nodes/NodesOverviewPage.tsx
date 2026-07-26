import type { ColumnsType, TableProps } from 'antd/es/table'
import type { ResourceListItem } from '@shared/types/resource'
import type { NodeMetricsResponse } from '@shared/types/metrics'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClusterMetrics } from '../../queries/useClusterMetrics'
import { useResourceList } from '../../queries/useResourceList'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useClusterStore } from '../../stores/clusterStore'
import { NodesHealthBanner } from './NodesHealthBanner'
import { NodesResourceGrid } from './NodesResourceGrid'
import { NodesQuickInsights, NodesTopConsumers } from './NodesQuickInsights'
import { NodesEventsStrip } from './NodesEventsStrip'
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

/**
 * Cleaner Nodes page: compact health + usage strip on top, table as the main
 * surface, optional hotspots, events below. No nested splitter dashboard.
 */
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
  const { t } = useTranslation()
  const dashboardPrefs = useDisplaySettingsStore((s) => s.nodesDashboard)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const [hotspotsOpen, setHotspotsOpen] = useState(false)
  const { data: clusterMetrics, isLoading: metricsLoading } = useClusterMetrics(clusterId, isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const showHealth = dashboardPrefs.visible.health
  const showResources = dashboardPrefs.visible.resources
  const showInsights = dashboardPrefs.visible.quickInsights
  const showTopConsumers = dashboardPrefs.visible.topConsumers
  const showTable = dashboardPrefs.visible.table
  const showEvents = dashboardPrefs.visible.events

  const podStats = useMemo(() => {
    if (!podsData || 'error' in podsData) return new Map()
    return aggregatePodStatsByNode(podsData.items)
  }, [podsData])

  const insights = useMemo(
    () => (nodeMetrics?.nodes ? buildQuickInsights(filtered, nodeMetrics.nodes, podStats) : []),
    [nodeMetrics, filtered, podStats]
  )

  const topConsumers = useMemo(
    () => ({
      cpu: topCpuNodes(nodeMetrics?.nodes ?? []),
      memory: topMemoryNodes(nodeMetrics?.nodes ?? []),
      pods: topPodNodes(podStats),
      restarts: topRestartNodes(podStats)
    }),
    [nodeMetrics, podStats]
  )

  function handleNavigateToNode(nodeName: string): void {
    navigateToResource(clusterId, { kind: 'Nodes', namespace: '', name: nodeName })
    const match = filtered.find((n) => n.name === nodeName)
    if (match) onSelectItem(match)
  }

  const hasHotspots = (showInsights && insights.length > 0) || showTopConsumers

  if (!showTable && !showHealth && !showResources && !showEvents && !hasHotspots) {
    return (
      <EmptyState
        title={t('nodesOverview.hiddenTitle')}
        description={t('nodesOverview.hiddenHint')}
      />
    )
  }

  return (
    <div className="ml-nodes-page">
      {(showHealth || showResources) && (
        <header className="ml-nodes-page__hero">
          {showHealth ? (
            metricsLoading || !clusterMetrics ? (
              <div className="ml-skeleton-row" style={{ height: 44 }} />
            ) : (
              <NodesHealthBanner data={clusterMetrics} />
            )
          ) : null}
          {showResources ? (
            metricsLoading || !clusterMetrics ? (
              <div className="ml-skeleton-row" style={{ height: 72 }} />
            ) : (
              <NodesResourceGrid clusterId={clusterId} data={clusterMetrics} isActive={isActive} />
            )
          ) : null}
        </header>
      )}

      {hasHotspots ? (
        <div className="ml-nodes-page__hotspots">
          <button
            type="button"
            className="ml-nodes-page__hotspots-toggle"
            onClick={() => setHotspotsOpen((v) => !v)}
            aria-expanded={hotspotsOpen}
          >
            <span>{t('nodesOverview.hotspots')}</span>
            <span className="ml-nodes-page__hotspots-meta">
              {insights.length > 0
                ? t('nodesOverview.hotspotsCount', { count: insights.length })
                : t('nodesOverview.topConsumers')}
            </span>
            <span aria-hidden>{hotspotsOpen ? '▾' : '▸'}</span>
          </button>
          {hotspotsOpen ? (
            <div className="ml-nodes-page__hotspots-body">
              {showInsights ? (
                <NodesQuickInsights insights={insights} onNavigateToNode={handleNavigateToNode} />
              ) : null}
              {showTopConsumers ? (
                <NodesTopConsumers {...topConsumers} onNavigateToNode={handleNavigateToNode} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showTable ? (
        <section className="ml-nodes-page__table">
          <div className="ml-nodes-page__table-head">
            <h3 className="ml-nodes-page__title">{t('nodesOverview.tableTitle')}</h3>
            <span className="ml-nodes-page__count">
              {t('nodesOverview.tableCount', { count: filtered.length })}
            </span>
          </div>
          <div className="ml-nodes-page__table-body">
            {!tableLoading && filtered.length === 0 ? (
              <EmptyState
                title={t('nodesOverview.emptyTitle')}
                description={t('nodesOverview.emptyHint')}
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
        </section>
      ) : null}

      {showEvents ? (
        <div className="ml-nodes-page__events">
          <NodesEventsStrip
            clusterId={clusterId}
            isActive={isActive}
            selectedNodeName={selectedItem?.name}
          />
        </div>
      ) : null}
    </div>
  )
}
