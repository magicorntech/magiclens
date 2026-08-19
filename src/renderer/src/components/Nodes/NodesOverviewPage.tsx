import type { ColumnsType, TableProps } from 'antd/es/table'
import type { ReactNode } from 'react'
import type { ResourceListItem } from '@shared/types/resource'
import type { NodeMetricsResponse } from '@shared/types/metrics'
import type { NodesDashboardSectionId } from '@shared/types/nodesDashboard'
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
import {
  NodesCapacityHeadroomBody,
  NodesRolesBody,
  NodesRolesChip,
  NodesVersionSkewBody,
  NodesVersionSkewChip
} from './NodesFleetWidgets'
import { ResizableTable } from '../../utils/ResizableTable'
import { EmptyState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from '../Overview/OverviewPage'
import { Icon } from '../ui/Icon'
import { ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react'
import { formatBytes, formatCores } from '../../format'
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
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
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
  // Moved here from the removed Cluster Overview page — same cluster-wide counts.
  const { data: nsData } = useResourceList(clusterId, 'ALL', 'Namespaces', isActive)
  const { data: deployData } = useResourceList(clusterId, 'ALL', 'Deployments', isActive)
  const { data: svcData } = useResourceList(clusterId, 'ALL', 'Services', isActive)

  const nsCount = nsData && !('error' in nsData) ? nsData.items.length : 0
  const deployCount = deployData && !('error' in deployData) ? deployData.items.length : 0
  const svcCount = svcData && !('error' in svcData) ? svcData.items.length : 0
  const warningPods = useMemo(
    () =>
      podsData && !('error' in podsData)
        ? podsData.items.filter((p) => /crash|error|fail|pending|unknown/i.test(p.statusText))
        : [],
    [podsData]
  )

  const showTable = dashboardPrefs.visible.table

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

  // Same shell every overview page's collapsible-ish sections use: title on the left,
  // small controls on the right, via DetailSection's `extra` slot.
  const hotspotsExtra = (
    <div className="ml-nodes-page__panel-controls">
      <span className="ml-nodes-page__hotspots-meta">
        {insights.length > 0
          ? t('nodesOverview.hotspotsCount', { count: insights.length })
          : t('nodesOverview.topConsumers')}
      </span>
      {hotspotsOpen ? (
        <>
          <button
            type="button"
            className="ml-nodes-page__panel-size-btn"
            aria-label={t('nodesOverview.shrinkHotspots')}
            onClick={() => hotspotsResize.updateHeight(hotspotsResize.height - HOTSPOTS_STEP)}
          >
            <Icon icon={Minus} variant="micro" />
          </button>
          <button
            type="button"
            className="ml-nodes-page__panel-size-btn"
            aria-label={t('nodesOverview.growHotspots')}
            onClick={() => hotspotsResize.updateHeight(hotspotsResize.height + HOTSPOTS_STEP)}
          >
            <Icon icon={Plus} variant="micro" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="ml-nodes-page__panel-size-btn"
        onClick={toggleHotspotsOpen}
        aria-expanded={hotspotsOpen}
        aria-label={hotspotsOpen ? t('nodesOverview.hotspots') : t('nodesOverview.hotspots')}
      >
        <Icon icon={hotspotsOpen ? ChevronDown : ChevronRight} variant="micro" />
      </button>
    </div>
  )

  const hotspotsPanel = (
    <DetailSection title={t('nodesOverview.hotspots')} extra={hotspotsExtra}>
      {hotspotsOpen ? (
        <div className="ml-nodes-page__hotspots-panel" style={{ height: hotspotsResize.height }}>
          <div className="ml-nodes-page__hotspots-body">
            {dashboardPrefs.visible.quickInsights ? (
              <NodesQuickInsights insights={insights} onNavigateToNode={handleNavigateToNode} />
            ) : null}
            {dashboardPrefs.visible.topConsumers ? (
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
    </DetailSection>
  )

  const tableExtra = (
    <div className="ml-nodes-page__panel-controls">
      <span className="ml-nodes-page__count">
        {t('nodesOverview.tableCount', { count: filtered.length })}
      </span>
      <button
        type="button"
        className="ml-nodes-page__panel-size-btn"
        aria-label={t('nodesOverview.shrinkTable')}
        onClick={() => adjustTableHeight(-TABLE_STEP)}
      >
        <Icon icon={Minus} variant="micro" />
      </button>
      <button
        type="button"
        className="ml-nodes-page__panel-size-btn"
        aria-label={t('nodesOverview.growTable')}
        onClick={() => adjustTableHeight(TABLE_STEP)}
      >
        <Icon icon={Plus} variant="micro" />
      </button>
      {columnPicker ?? null}
    </div>
  )

  const tableSection = (
    <DetailSection title={t('nodesOverview.tableTitle')} extra={tableExtra}>
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
    </DetailSection>
  )

  // Quick Insights and Top Consumers share one collapsible hotspots panel; whichever the
  // user ordered first renders it so it isn't drawn twice.
  const hotspotsOwner = dashboardPrefs.order.find(
    (id) => (id === 'quickInsights' || id === 'topConsumers') && dashboardPrefs.visible[id]
  )

  /**
   * Sections render in the user's configured `order` (this previously ignored the setting
   * and rendered a hardcoded sequence) at their configured `width`. Every section but
   * `health` renders inside the same `DetailSection` card the Workloads/Config/Network
   * overview pages use, so Nodes reads as the same system rather than its own bespoke page.
   * `health` stays bare — a slim inline banner, not a card, by design.
   * `summary`/`resources` carry content that used to live on the now-removed Cluster
   * Overview virtual page.
   */
  function renderSection(id: NodesDashboardSectionId): { body: ReactNode; bare?: boolean } {
    switch (id) {
      case 'summary':
        return {
          body: (
            <OverviewGrid>
              <OverviewStat
                label={t('clusterOverview.namespaces')}
                value={nsCount}
                onClick={() => openResourceKind(clusterId, 'Namespaces')}
              />
              <OverviewStat
                label={t('clusterOverview.deployments')}
                value={deployCount}
                onClick={() => openResourceKind(clusterId, 'Deployments')}
              />
              <OverviewStat
                label={t('clusterOverview.services')}
                value={svcCount}
                onClick={() => openResourceKind(clusterId, 'Services')}
              />
              <OverviewStat
                label={t('clusterOverview.problemPods')}
                value={warningPods.length}
                tone={warningPods.length > 0 ? 'warn' : 'ok'}
                onClick={() => {
                  const first = warningPods[0]
                  if (first) {
                    navigateToResource(clusterId, {
                      kind: 'Pods',
                      namespace: first.namespace,
                      name: first.name
                    })
                  } else {
                    openResourceKind(clusterId, 'Pods')
                  }
                }}
              />
            </OverviewGrid>
          )
        }
      case 'health':
        return {
          bare: true,
          body:
            metricsLoading || !clusterMetrics ? (
              <div className="ml-skeleton-row" style={{ height: 44 }} />
            ) : (
              <NodesHealthBanner data={clusterMetrics} />
            )
        }
      case 'resources':
        return {
          body: (
            <DetailSection title={t('clusterOverview.resources')}>
              {metricsLoading || !clusterMetrics ? (
                <div className="ml-skeleton-row" style={{ height: 72 }} />
              ) : (
                <>
                  <NodesResourceGrid clusterId={clusterId} data={clusterMetrics} isActive={isActive} />
                  {/* Same fact-cell treatment as the Capacity Headroom widget below, instead of
                      DetailFactGrid's plain floating label/value pairs — reads as a set of
                      small stat chips rather than a form. */}
                  <div className="ml-nodes-capacity-grid">
                    <div className="ml-nodes-capacity-cell">
                      <span className="ml-nodes-capacity-cell__label">{t('clusterOverview.cpuCapacity')}</span>
                      <span className="ml-nodes-capacity-cell__value">
                        {formatCores(clusterMetrics.cpuCapacityCores)}
                      </span>
                      <span className="ml-nodes-capacity-cell__hint">
                        {formatCores(clusterMetrics.cpuAllocatableCores)} {t('clusterOverview.cpuAlloc').toLowerCase()}
                      </span>
                    </div>
                    <div className="ml-nodes-capacity-cell">
                      <span className="ml-nodes-capacity-cell__label">{t('clusterOverview.memCapacity')}</span>
                      <span className="ml-nodes-capacity-cell__value">
                        {formatBytes(clusterMetrics.memoryCapacityBytes)}
                      </span>
                      <span className="ml-nodes-capacity-cell__hint">
                        {formatBytes(clusterMetrics.memoryAllocatableBytes)}{' '}
                        {t('clusterOverview.memAlloc').toLowerCase()}
                      </span>
                    </div>
                    <div className="ml-nodes-capacity-cell">
                      <span className="ml-nodes-capacity-cell__label">{t('nodesOverview.health.nodes')}</span>
                      <span className="ml-nodes-capacity-cell__value">
                        {clusterMetrics.readyNodes} / {clusterMetrics.totalNodes}
                      </span>
                      <span className="ml-nodes-capacity-cell__hint">
                        {clusterMetrics.notReadyNodes > 0
                          ? t('nodesOverview.health.notReady', { count: clusterMetrics.notReadyNodes })
                          : t('nodesOverview.health.ready', { count: clusterMetrics.readyNodes })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </DetailSection>
          )
        }
      case 'quickInsights':
      case 'topConsumers':
        return { body: hotspotsOwner === id ? hotspotsPanel : null }
      case 'versions':
        return {
          body: (
            <DetailSection
              title={t('settings.nodesSections.versions')}
              extra={<NodesVersionSkewChip nodes={filtered} />}
            >
              <NodesVersionSkewBody nodes={filtered} onNavigateToNode={handleNavigateToNode} />
            </DetailSection>
          )
        }
      case 'roles':
        return {
          body: (
            <DetailSection
              title={t('settings.nodesSections.roles')}
              extra={<NodesRolesChip nodes={filtered} />}
            >
              <NodesRolesBody nodes={filtered} onNavigateToNode={handleNavigateToNode} />
            </DetailSection>
          )
        }
      case 'capacity':
        return {
          body: (
            <DetailSection title={t('settings.nodesSections.capacity')}>
              {metricsLoading || !clusterMetrics ? (
                <div className="ml-skeleton-row" style={{ height: 72 }} />
              ) : (
                <NodesCapacityHeadroomBody data={clusterMetrics} />
              )}
            </DetailSection>
          )
        }
      case 'events':
        return {
          body: (
            <DetailSection title={t('clusterOverview.recentEvents')}>
              <NodesEventsStrip
                clusterId={clusterId}
                isActive={isActive}
                selectedNodeName={selectedItem?.name}
              />
            </DetailSection>
          )
        }
      case 'table':
        return { body: tableSection }
      default:
        return { body: null }
    }
  }

  const visibleSections = dashboardPrefs.order.filter((id) => dashboardPrefs.visible[id])

  if (visibleSections.length === 0) {
    return (
      <EmptyState
        title={t('nodesOverview.hiddenTitle')}
        description={t('nodesOverview.hiddenHint')}
      />
    )
  }

  // Pair up adjacent `half`-width sections into one flex row each (an odd one out just
  // renders alone at half width); `full` sections — and the table, which owns its own
  // height/scroll behaviour — always get their own row.
  const rows: ReactNode[] = []
  let pendingHalf: ReactNode | null = null
  function flushHalf(): void {
    if (pendingHalf) {
      rows.push(
        <div key={`row-${rows.length}`} className="ml-nodes-overview-row">
          {pendingHalf}
        </div>
      )
      pendingHalf = null
    }
  }
  for (const id of visibleSections) {
    const { body, bare } = renderSection(id)
    if (!body) continue
    const width = id === 'table' ? 'full' : dashboardPrefs.width[id]
    if (width === 'half' && !bare) {
      if (pendingHalf) {
        rows.push(
          <div key={`row-${rows.length}`} className="ml-nodes-overview-row">
            {pendingHalf}
            <div className="ml-nodes-overview-row__cell">{body}</div>
          </div>
        )
        pendingHalf = null
      } else {
        pendingHalf = <div className="ml-nodes-overview-row__cell">{body}</div>
      }
      continue
    }
    flushHalf()
    rows.push(<div key={id}>{body}</div>)
  }
  flushHalf()

  return (
    <OverviewPage title={t('nodesOverview.title')} subtitle={t('nodesOverview.subtitle')}>
      <DetailOverview>{rows}</DetailOverview>
    </OverviewPage>
  )
}
