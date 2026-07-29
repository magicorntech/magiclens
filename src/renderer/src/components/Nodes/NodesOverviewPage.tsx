import type { ColumnsType, TableProps } from 'antd/es/table'
import type { ReactNode } from 'react'
import type { ResourceListItem } from '@shared/types/resource'
import type { NodeMetricsResponse } from '@shared/types/metrics'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_TABLE_PAGE_SIZE } from '../../utils/tablePagination'
import { estimateTableTotalHeight } from '../../utils/tableLayout'
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
  columnPicker?: ReactNode
  tablePageSize?: number
}

const HOTSPOTS_HEIGHT_KEY = 'ml-nodes-hotspots-height'
const HOTSPOTS_OPEN_KEY = 'ml-nodes-hotspots-open'
const HOTSPOTS_MIN_HEIGHT = 140
const HOTSPOTS_MAX_HEIGHT = 640
const HOTSPOTS_DEFAULT_HEIGHT = 240
const HOTSPOTS_STEP = 48

const TABLE_HEIGHT_KEY = 'ml-nodes-table-height'
const TABLE_HEIGHT_CUSTOMIZED_KEY = 'ml-nodes-table-height-custom-v2'
const TABLE_MIN_HEIGHT = 200
const TABLE_MAX_HEIGHT = 900
const TABLE_DEFAULT_HEIGHT = 420
const TABLE_STEP = 48

interface ResizableHeightConfig {
  storageKey: string
  min: number
  max: number
  defaultHeight: number
  autoUntilCustomizedKey?: string
}

function clampHeight(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readStoredHeight(config: ResizableHeightConfig): number {
  try {
    const raw = localStorage.getItem(config.storageKey)
    const n = raw ? Number(raw) : config.defaultHeight
    return Number.isFinite(n) ? clampHeight(n, config.min, config.max) : config.defaultHeight
  } catch {
    return config.defaultHeight
  }
}

function persistHeight(storageKey: string, height: number): void {
  try {
    localStorage.setItem(storageKey, String(height))
  } catch {
    // ignore
  }
}

function readCustomized(autoKey?: string): boolean {
  if (!autoKey) return true
  try {
    return localStorage.getItem(autoKey) === '1'
  } catch {
    return false
  }
}

function useResizableHeight(config: ResizableHeightConfig) {
  const [height, setHeight] = useState(() => readStoredHeight(config))
  const [isCustomized, setIsCustomized] = useState(() => readCustomized(config.autoUntilCustomizedKey))

  const updateHeight = useCallback(
    (next: number, options?: { markCustomized?: boolean }) => {
      const clamped = clampHeight(next, config.min, config.max)
      setHeight(clamped)
      persistHeight(config.storageKey, clamped)
      const markCustomized = options?.markCustomized !== false
      if (markCustomized && config.autoUntilCustomizedKey) {
        try {
          localStorage.setItem(config.autoUntilCustomizedKey, '1')
        } catch {
          // ignore
        }
        setIsCustomized(true)
      }
    },
    [config.autoUntilCustomizedKey, config.min, config.max, config.storageKey]
  )

  const startResize = useCallback(
    (e: React.MouseEvent, currentHeight: number) => {
      e.preventDefault()
      e.stopPropagation()
      const startY = e.clientY
      const startHeight = currentHeight
      const onMove = (ev: MouseEvent): void => {
        updateHeight(startHeight + (ev.clientY - startY))
      }
      const onUp = (): void => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [updateHeight]
  )

  return { height, updateHeight, startResize, isCustomized }
}

function readHotspotsOpen(): boolean {
  try {
    const raw = localStorage.getItem(HOTSPOTS_OPEN_KEY)
    return raw !== '0'
  } catch {
    return true
  }
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
  nodeMetrics,
  columnPicker,
  tablePageSize = DEFAULT_TABLE_PAGE_SIZE
}: NodesOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const dashboardPrefs = useDisplaySettingsStore((s) => s.nodesDashboard)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const [hotspotsOpen, setHotspotsOpen] = useState(readHotspotsOpen)
  const hotspotsResize = useResizableHeight({
    storageKey: HOTSPOTS_HEIGHT_KEY,
    min: HOTSPOTS_MIN_HEIGHT,
    max: HOTSPOTS_MAX_HEIGHT,
    defaultHeight: HOTSPOTS_DEFAULT_HEIGHT
  })
  const tablePanelRef = useRef<HTMLDivElement>(null)
  const tableResize = useResizableHeight({
    storageKey: TABLE_HEIGHT_KEY,
    autoUntilCustomizedKey: TABLE_HEIGHT_CUSTOMIZED_KEY,
    min: TABLE_MIN_HEIGHT,
    max: TABLE_MAX_HEIGHT,
    defaultHeight: TABLE_DEFAULT_HEIGHT
  })

  function toggleHotspotsOpen(): void {
    setHotspotsOpen((open) => {
      const next = !open
      try {
        localStorage.setItem(HOTSPOTS_OPEN_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }
  const { data: clusterMetrics, isLoading: metricsLoading } = useClusterMetrics(clusterId, isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)

  const showHealth = dashboardPrefs.visible.health
  const showResources = dashboardPrefs.visible.resources
  const showInsights = dashboardPrefs.visible.quickInsights
  const showTopConsumers = dashboardPrefs.visible.topConsumers
  const showTable = dashboardPrefs.visible.table
  const showEvents = dashboardPrefs.visible.events

  const tableFluid = showTable && !tableResize.isCustomized

  function measureTableHeight(): number {
    const measured = tablePanelRef.current?.getBoundingClientRect().height
    return measured && measured > 0 ? clampHeight(measured, TABLE_MIN_HEIGHT, TABLE_MAX_HEIGHT) : TABLE_DEFAULT_HEIGHT
  }

  function adjustTableHeight(delta: number): void {
    const base = tableResize.isCustomized ? tableResize.height : measureTableHeight()
    tableResize.updateHeight(base + delta)
  }

  useEffect(() => {
    if (!showTable || tableResize.isCustomized) return
    const total = estimateTableTotalHeight(filtered.length, tablePageSize, 'small')
    tableResize.updateHeight(clampHeight(total + 14, TABLE_MIN_HEIGHT, TABLE_MAX_HEIGHT), {
      markCustomized: false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync panel when page size / row count changes
  }, [showTable, filtered.length, tablePageSize, tableResize.isCustomized])

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

  const startHotspotsResize = useCallback(
    (e: React.MouseEvent) => hotspotsResize.startResize(e, hotspotsResize.height),
    [hotspotsResize]
  )

  const startTableResize = useCallback(
    (e: React.MouseEvent) => {
      const height = tableResize.isCustomized ? tableResize.height : measureTableHeight()
      if (!tableResize.isCustomized) tableResize.updateHeight(height)
      tableResize.startResize(e, height)
    },
    [tableResize]
  )

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
        <div className="ml-nodes-page__hotspots-header">
          <button
            type="button"
            className="ml-nodes-page__hotspots-toggle"
            onClick={toggleHotspotsOpen}
            aria-expanded={hotspotsOpen}
          >
            <span>{t('nodesOverview.hotspots')}</span>
            <span className="ml-nodes-page__hotspots-meta">
              {insights.length > 0
                ? t('nodesOverview.hotspotsCount', { count: insights.length })
                : t('nodesOverview.topConsumers')}
            </span>
            <span className="ml-nodes-page__hotspots-chevron" aria-hidden>
              {hotspotsOpen ? '▾' : '▸'}
            </span>
          </button>
          {hotspotsOpen ? (
            <div className="ml-nodes-page__panel-controls">
              <button
                type="button"
                className="ml-nodes-page__panel-size-btn"
                aria-label={t('nodesOverview.shrinkHotspots')}
                onClick={() => hotspotsResize.updateHeight(hotspotsResize.height - HOTSPOTS_STEP)}
              >
                −
              </button>
              <button
                type="button"
                className="ml-nodes-page__panel-size-btn"
                aria-label={t('nodesOverview.growHotspots')}
                onClick={() => hotspotsResize.updateHeight(hotspotsResize.height + HOTSPOTS_STEP)}
              >
                +
              </button>
            </div>
          ) : null}
        </div>
          {hotspotsOpen ? (
            <div className="ml-nodes-page__hotspots-panel" style={{ height: hotspotsResize.height }}>
              <div className="ml-nodes-page__hotspots-body">
                {showInsights ? (
                  <NodesQuickInsights insights={insights} onNavigateToNode={handleNavigateToNode} />
                ) : null}
                {showTopConsumers ? (
                  <NodesTopConsumers {...topConsumers} onNavigateToNode={handleNavigateToNode} />
                ) : null}
              </div>
              <div
                className="ml-nodes-page__panel-resize"
                role="separator"
                aria-orientation="horizontal"
                aria-label={t('nodesOverview.resizeHotspots')}
                onMouseDown={startHotspotsResize}
              >
                <span className="ml-nodes-page__panel-resize-grip" aria-hidden />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showTable ? (
        <section className={`ml-nodes-page__table${tableFluid ? ' ml-nodes-page__table--fluid' : ''}`}>
          <div className="ml-nodes-page__table-head">
            <h3 className="ml-nodes-page__title">{t('nodesOverview.tableTitle')}</h3>
            <span className="ml-nodes-page__count">
              {t('nodesOverview.tableCount', { count: filtered.length })}
            </span>
            <div className="ml-nodes-page__table-actions">
              <div className="ml-nodes-page__panel-controls">
                <button
                  type="button"
                  className="ml-nodes-page__panel-size-btn"
                  aria-label={t('nodesOverview.shrinkTable')}
                  onClick={() => adjustTableHeight(-TABLE_STEP)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="ml-nodes-page__panel-size-btn"
                  aria-label={t('nodesOverview.growTable')}
                  onClick={() => adjustTableHeight(TABLE_STEP)}
                >
                  +
                </button>
              </div>
              {columnPicker ?? null}
            </div>
          </div>
          <div
            ref={tablePanelRef}
            className={`ml-nodes-page__table-panel${tableFluid ? ' ml-nodes-page__table-panel--fluid' : ''}`}
            style={tableFluid ? undefined : { height: tableResize.height }}
          >
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
                  fitPageSize
                  virtualScroll={filtered.length > 100}
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
            <div
              className="ml-nodes-page__panel-resize"
              role="separator"
              aria-orientation="horizontal"
              aria-label={t('nodesOverview.resizeTable')}
              onMouseDown={startTableResize}
            >
              <span className="ml-nodes-page__panel-resize-grip" aria-hidden />
            </div>
          </div>
        </section>
      ) : null}

      {showEvents ? (
        <div className={`ml-nodes-page__events${tableFluid ? ' ml-nodes-page__events--compact' : ''}`}>
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
