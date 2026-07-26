import { useMemo, useState } from 'react'
import { Alert, Button, Segmented, Space, Spin, Splitter, Tooltip, Typography, message } from 'antd'
import { AppWindow, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TopologyApplication, TopologyNode } from '@shared/types/topology'
import { Icon } from '../ui/Icon'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'
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

interface TopologyPageProps {
  clusterId: string
  namespace: string
  popout?: boolean
}

export function TopologyPage({
  clusterId,
  namespace,
  popout = false
}: TopologyPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const needsNamespace = !namespace
  const { data, loading, error, watchStatus, refresh } = useTopologyGraph(clusterId, namespace)
  const [mode, setMode] = useState<Mode>('graph')
  const [selected, setSelected] = useState<TopologyNode | null>(null)
  const [focusNodeIds, setFocusNodeIds] = useState<string[] | undefined>()
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
    void window.api.topology
      .openWindow({ clusterId, namespace })
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
        <aside className="ml-topo-page__insights">
          <Typography.Text strong>{t('topology.insights')}</Typography.Text>
          {insights.length === 0 ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
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
        </aside>
      ) : null}
    </div>
  )

  return (
    <div className={`ml-topo-page${popout ? ' ml-topo-page--popout' : ''}`}>
      <div className={`ml-topo-page__header${popout ? ' titlebar-drag-region' : ''}`}>
        <div className={popout ? 'titlebar-no-drag' : undefined}>
          <div className="ml-topo-page__title-row">
            <Typography.Title level={4} className="ml-topo-page__title">
              {t('topology.title')}
            </Typography.Title>
            {!needsNamespace ? (
              <WatchStatusBadge isError={Boolean(error)} watchStatus={watchStatus} />
            ) : null}
          </div>
          <Typography.Text type="secondary">{t('topology.subtitle')}</Typography.Text>
        </div>
        <Space wrap className={popout ? 'titlebar-no-drag' : undefined}>
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
        </Space>
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
