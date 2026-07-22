import { useMemo, useState } from 'react'
import { Alert, Button, Segmented, Space, Spin, Tooltip, Typography, message } from 'antd'
import { AppWindow, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TopologyApplication, TopologyNode } from '@shared/types/topology'
import { Icon } from '../ui/Icon'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { TopologyAppsView } from './TopologyAppsView'
import { TopologyDetailDrawer } from './TopologyDetailDrawer'
import { TopologyGraphView } from './TopologyGraphView'
import { TopologyResourcePanel } from './TopologyResourcePanel'
import { buildTopologyInsights } from './topologyInsights'
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
  const needsNamespace = !namespace || namespace === 'ALL'
  const { data, loading, error, watchStatus, refresh } = useTopologyGraph(
    clusterId,
    needsNamespace ? '' : namespace
  )
  const [mode, setMode] = useState<Mode>('graph')
  const [selected, setSelected] = useState<TopologyNode | null>(null)
  const [focusNodeIds, setFocusNodeIds] = useState<string[] | undefined>()

  const insights = useMemo(() => (data ? buildTopologyInsights(data) : []), [data])

  function handleSelectApp(app: TopologyApplication): void {
    setFocusNodeIds(app.resourceIds)
    setMode('graph')
    const first = data?.nodes.find((n) => app.resourceIds.includes(n.id))
    if (first) setSelected(first)
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
                  onSelectNode={setSelected}
                  focusNodeIds={focusNodeIds}
                  popout={popout}
                />
              )}
              {mode === 'apps' && <TopologyAppsView graph={data} onSelectApp={handleSelectApp} />}
              {mode === 'resources' && (
                <TopologyResourcePanel graph={data} onSelectNode={setSelected} />
              )}
            </>
          ) : (
            <div className="ml-topo-empty">{t('topology.empty')}</div>
          )}
        </div>

        {mode === 'graph' && !needsNamespace && (
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
                    if (n) setSelected(n)
                  }}
                >
                  <span className="ml-topo-insight__title">{insight.title}</span>
                  <span className="ml-topo-insight__detail">{insight.detail}</span>
                </div>
              ))
            )}
          </aside>
        )}
      </div>

      <TopologyDetailDrawer
        open={!!selected}
        clusterId={clusterId}
        node={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
