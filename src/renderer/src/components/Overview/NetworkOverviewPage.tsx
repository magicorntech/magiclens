import { useMemo } from 'react'
import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'

interface NetworkOverviewPageProps {
  clusterId: string
  isActive: boolean
  onOpenResourceKind: (kind: ResourceKind) => void
  onNavigateToResource: (focus: ResourceFocus, item?: ResourceListItem) => void
}

const NETWORK_KINDS: ResourceKind[] = [
  'Services',
  'Ingresses',
  'NetworkPolicies',
  'EndpointSlices',
  'Endpoints',
  'IngressClasses'
]

function itemsOf(data: { items: ResourceListItem[] } | { error: string } | undefined): ResourceListItem[] {
  return data && !('error' in data) ? data.items : []
}

function countByColumn(items: ResourceListItem[], column: string): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const value = item.columns[column] || 'Unknown'
    map.set(value, (map.get(value) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export function NetworkOverviewPage({
  clusterId,
  isActive,
  onOpenResourceKind,
  onNavigateToResource
}: NetworkOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()

  const svc = useResourceList(clusterId, 'ALL', 'Services', isActive)
  const ing = useResourceList(clusterId, 'ALL', 'Ingresses', isActive)
  const np = useResourceList(clusterId, 'ALL', 'NetworkPolicies', isActive)
  const eps = useResourceList(clusterId, 'ALL', 'EndpointSlices', isActive)
  const ep = useResourceList(clusterId, 'ALL', 'Endpoints', isActive)
  const ic = useResourceList(clusterId, 'ALL', 'IngressClasses', isActive)

  const byKind = useMemo(
    () =>
      ({
        Services: itemsOf(svc.data),
        Ingresses: itemsOf(ing.data),
        NetworkPolicies: itemsOf(np.data),
        EndpointSlices: itemsOf(eps.data),
        Endpoints: itemsOf(ep.data),
        IngressClasses: itemsOf(ic.data)
      }) as Record<ResourceKind, ResourceListItem[]>,
    [svc.data, ing.data, np.data, eps.data, ep.data, ic.data]
  )

  const loading = svc.isLoading || ing.isLoading || np.isLoading || eps.isLoading || ep.isLoading

  const serviceTypes = useMemo(() => countByColumn(byKind.Services, 'type'), [byKind.Services])

  const pendingIngresses = useMemo(
    () => byKind.Ingresses.filter((i) => i.statusText === 'Pending'),
    [byKind.Ingresses]
  )

  const emptyEndpoints = useMemo(
    () => byKind.Endpoints.filter((e) => e.statusText === 'NoAddresses'),
    [byKind.Endpoints]
  )

  if (loading && NETWORK_KINDS.every((k) => byKind[k].length === 0)) return <LoadingState />

  return (
    <OverviewPage title={t('networkOverview.title')} subtitle={t('networkOverview.subtitle')}>
      <DetailOverview>
        <OverviewGrid>
          {NETWORK_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="ml-overview-stat ml-overview-stat--clickable"
              onClick={() => onOpenResourceKind(kind)}
            >
              <span className="ml-overview-stat__label">{kind}</span>
              <span className="ml-overview-stat__value">{byKind[kind].length}</span>
            </button>
          ))}
        </OverviewGrid>

        <DetailSection title={t('networkOverview.serviceTypes')}>
          {serviceTypes.length === 0 ? (
            <span className="ml-detail-empty">{t('networkOverview.noServices')}</span>
          ) : (
            <OverviewGrid>
              {serviceTypes.map((row) => (
                <OverviewStat
                  key={row.label}
                  label={row.label}
                  value={row.count}
                  onClick={() => onOpenResourceKind('Services')}
                />
              ))}
            </OverviewGrid>
          )}
        </DetailSection>

        <DetailSection title={t('networkOverview.pendingIngresses')}>
          {pendingIngresses.length === 0 ? (
            <span className="ml-detail-empty">{t('networkOverview.noPendingIngresses')}</span>
          ) : (
            <div className="ml-overview-list">
              {pendingIngresses.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    onNavigateToResource(
                      { kind: 'Ingresses', namespace: item.namespace, name: item.name },
                      item
                    )
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <span className="ml-overview-list__meta">{item.columns.hosts}</span>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('networkOverview.emptyEndpoints')}>
          {emptyEndpoints.length === 0 ? (
            <span className="ml-detail-empty">{t('networkOverview.noEmptyEndpoints')}</span>
          ) : (
            <div className="ml-overview-list">
              {emptyEndpoints.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    onNavigateToResource(
                      { kind: 'Endpoints', namespace: item.namespace, name: item.name },
                      item
                    )
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
          {emptyEndpoints.length > 0 ? (
            <p className="ml-overview-note">
              {t('networkOverview.emptyEndpointsHint', { count: emptyEndpoints.length })}
            </p>
          ) : null}
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
