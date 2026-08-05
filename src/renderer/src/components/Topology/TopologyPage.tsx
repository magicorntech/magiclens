import { useMemo, useState } from 'react'
import { Alert, Button, Segmented, Spin, Splitter, Tooltip, Typography, message } from 'antd'
import { AppWindow, ChevronLeft, ChevronRight, RefreshCw, Waypoints } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isAllNamespaces, isNoNamespaceSelection } from '@shared/namespaceSelection'
import type { TopologyApplication, TopologyNode } from '@shared/types/topology'
import { Icon } from '../ui/Icon'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'
import { NamespaceSelector } from '../Layout/NamespaceSelector'
import { HubPageHero } from '../Layout/HubPageHero'
import { useBottomPanelOptional } from '../Layout/BottomPanelContext'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { TopologyAppsView } from './TopologyAppsView'
import { TopologyDetailDrawer } from './TopologyDetailDrawer'
import { TopologyGraphView } from './TopologyGraphView'
import { TopologyResourcePanel } from './TopologyResourcePanel'
import { buildTopologyInsights } from './topologyInsights'
import { topologyToListItem, topologyToResourceKind } from './topologyResource'
import { useTopologyGraph } from './useTopologyGraph'
import './topology.css'

type Mode = 'graph' | 'apps' | 'resources'

const INSIGHTS_OPEN_KEY = 'ml-topology-insights-open'

function loadInsightsOpen(): boolean {
  try {
    const raw = localStorage.getItem(INSIGHTS_OPEN_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

interface TopologyPageProps {
  clusterId: string
  namespace: string
  onNamespaceChange?: (namespace: string) => void
  popout?: boolean
}

export function TopologyPage({
  clusterId,
  namespace,
  onNamespaceChange,
  popout = false
}: TopologyPageProps): React.JSX.Element {
  const { t } = useTranslation()
  // Topology is scoped to concrete namespace(s) only — All namespaces is too heavy.
  const needsNamespace = isNoNamespaceSelection(namespace) || isAllNamespaces(namespace)
  const topologyNamespace = needsNamespace ? '' : namespace
  const { data, loading, error, watchStatus, refresh } = useTopologyGraph(
    clusterId,
    topologyNamespace
  )
  const [mode, setMode] = useState<Mode>('graph')
  const [selected, setSelected] = useState<TopologyNode | null>(null)
  const [focusNodeIds, setFocusNodeIds] = useState<string[] | undefined>()
  const [insightsOpen, setInsightsOpen] = useState(loadInsightsOpen)

  function toggleInsights(): void {
    setInsightsOpen((open) => {
      const next = !open
      try {
        localStorage.setItem(INSIGHTS_OPEN_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }
  const bottomPanel = useBottomPanelOptional()
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const layoutMode = useLayoutMode()
  const detailInSidebar =
    (resourceDetailPlacement === 'right' && canUseSplitLayouts(layoutMode)) ||
    (resourceDetailPlacement === 'bottom' && !bottomPanel)
  const detailInDrawer =
    !detailInSidebar &&
    (resourceDetailPlacement === 'drawer' ||
      (resourceDetailPlacement === 'right' && !canUseSplitLayouts(layoutMode)))
  const detailInBottom = resourceDetailPlacement === 'bottom' && !!bottomPanel

  const insights = useMemo(() => (data ? buildTopologyInsights(data) : []), [data])

  const selectedKind = selected ? topologyToResourceKind(selected.kind) : null
  const selectedItem = selected && selectedKind ? topologyToListItem(selected) : null
  const showSidebarDetail = detailInSidebar && !!selected && (selected.kind === 'External' || !!selectedItem)

  function selectNode(node: TopologyNode | null): void {
    setSelected(node)
    if (!node || !detailInBottom) return
    const kind = topologyToResourceKind(node.kind)
    if (!kind) return
    bottomPanel.openResourceDetail({
      clusterId,
      resourceKind: kind,
      namespace: node.namespace || namespace,
      item: topologyToListItem(node)
    })
  }

  function handleSelectApp(app: TopologyApplication): void {
    setFocusNodeIds(app.resourceIds)
    setMode('graph')
    const first = data?.nodes.find((n) => app.resourceIds.includes(n.id))
    if (first) selectNode(first)
  }

  function handleOpenWindow(): void {
    if (!topologyNamespace) return
    void window.api.topology
      .openWindow({ clusterId, namespace: topologyNamespace })
      .then((res) => {
        if ('error' in res) message.error(res.error)
      })
      .catch((err: unknown) => {
        message.error(err instanceof Error ? err.message : String(err))
      })
  }

  const mainBody = (
    <div className="ml-topo-page__body">
      <div className="ml-topo-page__main">
        {needsNamespace ? (
          <div className="ml-topo-empty">{t('topology.pickNamespaceHint')}</div>
        ) : loading && !data ? (
          <div className="ml-topo-empty">
            <Spin tip={t('topology.loading')} />
          </div>
        ) : data ? (
          <>
            {mode === 'graph' && (
              <TopologyGraphView
                graph={data}
                onSelectNode={selectNode}
                focusNodeIds={focusNodeIds}
                popout={popout}
              />
            )}
            {mode === 'apps' && <TopologyAppsView graph={data} onSelectApp={handleSelectApp} />}
            {mode === 'resources' && (
              <TopologyResourcePanel graph={data} onSelectNode={selectNode} />
            )}
          </>
        ) : (
          <div className="ml-topo-empty">{t('topology.empty')}</div>
        )}
      </div>

      {mode === 'graph' && !needsNamespace && !showSidebarDetail ? (
        <aside
          className={`ml-topo-page__insights${insightsOpen ? ' is-open' : ' is-collapsed'}`}
          aria-label={t('topology.insights')}
        >
          <div className="ml-topo-page__insights-head">
            {insightsOpen ? (
              <Typography.Text strong className="ml-topo-page__insights-title">
                {t('topology.insights')}
                {insights.length > 0 ? (
                  <span className="ml-topo-page__insights-count">{insights.length}</span>
                ) : null}
              </Typography.Text>
            ) : (
              <span className="ml-topo-page__insights-rail-label">{t('topology.insights')}</span>
            )}
            <Tooltip title={insightsOpen ? t('topology.hideInsights') : t('topology.showInsights')}>
              <button
                type="button"
                className="ml-topo-page__insights-toggle"
                aria-expanded={insightsOpen}
                aria-label={insightsOpen ? t('topology.hideInsights') : t('topology.showInsights')}
                onClick={toggleInsights}
              >
                <Icon icon={insightsOpen ? ChevronRight : ChevronLeft} variant="toolbar" />
              </button>
            </Tooltip>
          </div>
          {insightsOpen ? (
            <div className="ml-topo-page__insights-body">
              {insights.length === 0 ? (
                <Typography.Paragraph type="secondary" className="ml-topo-page__insights-empty">
                  {t('topology.noInsights')}
                </Typography.Paragraph>
              ) : (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`ml-topo-insight ml-topo-insight--${insight.severity}`}
                    onClick={() => {
                      setFocusNodeIds(insight.nodeIds)
                      const n = data?.nodes.find((x) => insight.nodeIds?.includes(x.id))
                      if (n) selectNode(n)
                    }}
                  >
                    <span className="ml-topo-insight__title">{insight.title}</span>
                    <span className="ml-topo-insight__detail">{insight.detail}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  )

  return (
    <div className={`ml-topo-page${popout ? ' ml-topo-page--popout' : ''}`}>
      <div className="ml-hub-glow" aria-hidden />

      <div className={popout ? 'titlebar-drag-region' : undefined}>
        <HubPageHero
          className={`ml-topo-page__hero${popout ? ' titlebar-no-drag' : ''}`}
          icon={Waypoints}
          eyebrow={t('topology.brandEyebrow')}
          title={t('topology.title')}
          subtitle={t('topology.subtitle')}
          actions={
            <div className="ml-topo-page__actions">
              {!needsNamespace ? (
                <WatchStatusBadge isError={Boolean(error)} watchStatus={watchStatus} />
              ) : null}
              <Segmented
                value={mode}
                onChange={(v) => setMode(v as Mode)}
                options={[
                  { value: 'graph', label: t('topology.modes.graph') },
                  { value: 'apps', label: t('topology.modes.apps') },
                  { value: 'resources', label: t('topology.modes.resources') }
                ]}
              />
              <Tooltip title={t('topology.refresh')}>
                <Button
                  icon={<Icon icon={RefreshCw} variant="action" />}
                  loading={loading && !data}
                  disabled={needsNamespace}
                  onClick={() => void refresh()}
                />
              </Tooltip>
              {!popout && (
                <Tooltip title={t('topology.openWindow')}>
                  <Button
                    icon={<Icon icon={AppWindow} variant="action" />}
                    disabled={needsNamespace}
                    onClick={handleOpenWindow}
                  />
                </Tooltip>
              )}
              {onNamespaceChange ? (
                <div className="ml-topo-page__ns">
                  <NamespaceSelector
                    clusterId={clusterId}
                    value={needsNamespace ? '' : namespace}
                    onChange={onNamespaceChange}
                    allowAllNamespaces={false}
                  />
                </div>
              ) : null}
            </div>
          }
        />
      </div>

      {needsNamespace ? (
        <Alert type="info" showIcon message={t('topology.pickNamespace')} />
      ) : null}

      {error && !needsNamespace && (
        <Alert type="error" showIcon message={t('topology.error')} description={error} />
      )}

      {showSidebarDetail ? (
        <Splitter className="ml-topo-page__splitter">
          <Splitter.Panel defaultSize="58%" min="35%">
            {mainBody}
          </Splitter.Panel>
          <Splitter.Panel defaultSize="42%" min="25%">
            {selected?.kind === 'External' ? (
              <div className="ml-topo-external-detail">
                <div className="ml-resource-detail-header">
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {selected.name}
                  </Typography.Text>
                  <Button type="text" size="small" onClick={() => selectNode(null)}>
                    Close
                  </Button>
                </div>
                <Alert
                  type="info"
                  showIcon
                  message="External dependency"
                  description={
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      {selected.protocol ? `Kind: ${selected.protocol}` : null}
                      {selected.externalHost ? (
                        <>
                          <br />
                          Host: {selected.externalHost}
                        </>
                      ) : null}
                      <br />
                      Declared via magiclens.io/depends-on (or magiclens.io/external-db) annotations.
                    </Typography.Paragraph>
                  }
                />
              </div>
            ) : selectedItem && selectedKind ? (
              <ResourceDetailPanel
                clusterId={clusterId}
                kind={selectedKind}
                item={selectedItem}
                isActive
                layout="sidebar"
                listQueryKey={['topology', clusterId]}
                onClose={() => selectNode(null)}
              />
            ) : null}
          </Splitter.Panel>
        </Splitter>
      ) : (
        mainBody
      )}

      {detailInDrawer ? (
        <TopologyDetailDrawer
          open={!!selected}
          clusterId={clusterId}
          node={selected}
          onClose={() => selectNode(null)}
        />
      ) : null}
    </div>
  )
}
