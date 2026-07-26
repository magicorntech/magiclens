import { useMemo, useState } from 'react'
import { Input, Select, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TopologyApplication, TopologyHealth } from '@shared/types/topology'
import {
  ALL_NAMESPACES,
  formatNamespaceSelectionLabel,
  isAllNamespaces,
  parseNamespaceSelection
} from '@shared/namespaceSelection'
import { useNamespaces } from '../../queries/useNamespaces'
import { useTopologyGraph } from '../Topology/useTopologyGraph'
import { LoadingState, EmptyState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'
import { useClusterStore } from '../../stores/clusterStore'

interface ApplicationsOverviewPageProps {
  clusterId: string
  namespace: string
}

function healthTone(h: TopologyHealth): 'ok' | 'warn' | 'error' | 'neutral' {
  if (h === 'healthy') return 'ok'
  if (h === 'degraded') return 'warn'
  if (h === 'error') return 'error'
  return 'neutral'
}

export function ApplicationsOverviewPage({
  clusterId,
  namespace
}: ApplicationsOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  // null → follow the cluster-wide namespace selection; string → local override.
  const [nsOverride, setNsOverride] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const { data: nsRes } = useNamespaces(clusterId)
  const namespaces = nsRes && !('error' in nsRes) ? nsRes.namespaces : []
  const effectiveNs = nsOverride ?? namespace
  const selection = parseNamespaceSelection(effectiveNs)
  const selectValue = isAllNamespaces(selection)
    ? ALL_NAMESPACES
    : selection.length === 1
      ? selection[0]
      : undefined
  const { data: graph, loading, error } = useTopologyGraph(clusterId, effectiveNs)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)

  const apps = useMemo(() => {
    const list = graph?.applications ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (a) => a.name.toLowerCase().includes(q) || a.namespace.toLowerCase().includes(q)
    )
  }, [graph, query])

  const counts = useMemo(() => {
    const c = { healthy: 0, degraded: 0, error: 0, unknown: 0 }
    for (const a of graph?.applications ?? []) c[a.health] += 1
    return c
  }, [graph])

  function openApp(app: TopologyApplication): void {
    const node = graph?.nodes.find((n) => app.resourceIds.includes(n.id))
    if (!node) return
    const kindMap: Record<string, 'Deployments' | 'StatefulSets' | 'Pods' | 'Services'> = {
      Deployment: 'Deployments',
      StatefulSet: 'StatefulSets',
      Pod: 'Pods',
      Service: 'Services'
    }
    const kind = kindMap[node.kind]
    if (!kind) return
    navigateToResource(clusterId, { kind, namespace: node.namespace, name: node.name })
  }

  return (
    <OverviewPage
      title={t('applicationsOverview.title')}
      subtitle={t('applicationsOverview.subtitle')}
      actions={
        <div className="ml-overview-filters">
          <Select
            size="small"
            style={{ minWidth: 160 }}
            value={selectValue}
            placeholder={
              selection.length > 1
                ? formatNamespaceSelectionLabel(selection, t('common.allNamespaces'))
                : t('applicationsOverview.pickNamespace')
            }
            options={[
              { label: t('common.allNamespaces'), value: ALL_NAMESPACES },
              ...namespaces.map((n) => ({ label: n, value: n }))
            ]}
            onChange={setNsOverride}
            showSearch
          />
          <Input
            size="small"
            allowClear
            placeholder={t('applicationsOverview.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
      }
    >
      {!effectiveNs ? (
        <EmptyState
          title={t('applicationsOverview.needNamespace')}
          description={t('applicationsOverview.needNamespaceHint')}
        />
      ) : loading && !graph ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title={t('applicationsOverview.error')} description={error} />
      ) : (
        <DetailOverview>
          <OverviewGrid>
            <OverviewStat label={t('applicationsOverview.total')} value={graph?.applications.length ?? 0} />
            <OverviewStat label={t('topology.health.healthy')} value={counts.healthy} tone="ok" />
            <OverviewStat label={t('topology.health.degraded')} value={counts.degraded} tone="warn" />
            <OverviewStat label={t('topology.health.error')} value={counts.error} tone="error" />
          </OverviewGrid>

          <DetailSection title={t('applicationsOverview.apps')}>
            {apps.length === 0 ? (
              <span className="ml-detail-empty">{t('applicationsOverview.empty')}</span>
            ) : (
              <div className="ml-overview-apps">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className={`ml-overview-app ml-overview-app--${app.health}`}
                    onClick={() => openApp(app)}
                  >
                    <div className="ml-overview-app__head">
                      <strong>{app.name}</strong>
                      <Tag color={healthTone(app.health) === 'ok' ? 'green' : healthTone(app.health) === 'warn' ? 'gold' : healthTone(app.health) === 'error' ? 'red' : 'default'}>
                        {t(`topology.health.${app.health}`)}
                      </Tag>
                    </div>
                    <span className="ml-overview-app__ns">{app.namespace}</span>
                    <div className="ml-overview-app__stats">
                      <span>
                        {t('applicationsOverview.replicas')}: <b>{app.replicaSummary}</b>
                      </span>
                      <span>
                        {t('applicationsOverview.errors')}: <b>{app.errorCount}</b>
                      </span>
                      <span>
                        {t('applicationsOverview.resources')}: <b>{app.resourceIds.length}</b>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DetailSection>
        </DetailOverview>
      )}
    </OverviewPage>
  )
}
