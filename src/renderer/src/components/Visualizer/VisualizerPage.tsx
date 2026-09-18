import { useMemo, useState } from 'react'
import { Alert, Button, Input, Popover, Spin, Tooltip } from 'antd'
import { Filter, RefreshCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { VisualizerNode } from '@shared/types/visualizer'
import { ALL_NAMESPACES } from '@shared/namespaceSelection'
import { Icon } from '../ui/Icon'
import { NamespaceSelector } from '../Layout/NamespaceSelector'
import { ResourceDetailDrawer } from '../ResourceTable/ResourceDetailDrawer'
import { VisualizerGraphView } from './VisualizerGraphView'
import { useVisualizerGraph } from './useVisualizerGraph'
import './visualizer.css'

interface VisualizerPageProps {
  clusterId: string
}

function toResourceKind(kind: VisualizerNode['kind']): ResourceKind | null {
  switch (kind) {
    case 'Deployment':
      return 'Deployments'
    case 'StatefulSet':
      return 'StatefulSets'
    case 'DaemonSet':
      return 'DaemonSets'
    case 'Service':
      return 'Services'
    default:
      return null
  }
}

function toListItem(node: VisualizerNode): ResourceListItem {
  return {
    id: node.id,
    name: node.name,
    namespace: node.namespace,
    ageTimestamp: null,
    statusText: node.status,
    statusColor:
      node.status === 'healthy' ? 'green' : node.status === 'error' ? 'red' : node.status === 'degraded' ? 'gold' : 'default',
    columns: {}
  }
}

export function VisualizerPage({ clusterId }: VisualizerPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const [namespace, setNamespace] = useState(ALL_NAMESPACES)
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<VisualizerNode | null>(null)
  const { data, loading, error, refresh } = useVisualizerGraph(clusterId, namespace)

  const selectedKind = selected ? toResourceKind(selected.kind) : null
  const selectedItem = selected && selectedKind ? toListItem(selected) : null

  const stats = useMemo(() => {
    if (!data) return { namespaces: 0, services: 0, workloads: 0 }
    const nss = new Set(data.nodes.map((n) => n.namespace))
    return {
      namespaces: nss.size,
      services: data.nodes.filter((n) => n.kind === 'Service').length,
      workloads: data.nodes.filter((n) => n.kind !== 'Service').length
    }
  }, [data])

  const filterPanel = (
    <div className="ml-viz-filter">
      <Input
        allowClear
        prefix={<Icon icon={Search} variant="micro" />}
        placeholder={t('visualizer.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="ml-viz-filter__ns">
        <NamespaceSelector clusterId={clusterId} value={namespace} onChange={setNamespace} />
      </div>
    </div>
  )

  return (
    <div className="ml-viz-page ml-resource-detail-host">
      <div className="ml-viz-toolbar">
        <div className="ml-viz-toolbar__left">
          <Popover
            trigger="click"
            placement="bottomLeft"
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          >
            <Tooltip title={t('visualizer.filter')}>
              <button type="button" className={`ml-viz-toolbtn${filterOpen || query ? ' is-on' : ''}`}>
                <Icon icon={Filter} variant="toolbar" />
              </button>
            </Tooltip>
          </Popover>
          <div className="ml-viz-title">
            <span className="ml-viz-title__name">{t('visualizer.title')}</span>
            {data ? <span className="ml-viz-title__meta">{t('visualizer.stats', stats)}</span> : null}
          </div>
        </div>
        <div className="ml-viz-toolbar__right">
          <Tooltip title={t('visualizer.refresh')}>
            <Button
              type="text"
              icon={<Icon icon={RefreshCw} variant="action" />}
              loading={loading && !data}
              onClick={() => void refresh()}
            />
          </Tooltip>
        </div>
      </div>

      {error ? <Alert type="error" showIcon message={t('visualizer.error')} description={error} /> : null}

      <div className="ml-viz-body">
        {loading && !data ? (
          <div className="ml-viz-empty">
            <Spin tip={t('visualizer.loading')} />
          </div>
        ) : data ? (
          <VisualizerGraphView graph={data} query={query} onSelectNode={setSelected} />
        ) : (
          <div className="ml-viz-empty">{t('visualizer.empty')}</div>
        )}
      </div>

      {selectedKind ? (
        <ResourceDetailDrawer
          open={!!selectedItem}
          clusterId={clusterId}
          kind={selectedKind}
          item={selectedItem}
          isActive
          listQueryKey={['visualizer', clusterId]}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}
