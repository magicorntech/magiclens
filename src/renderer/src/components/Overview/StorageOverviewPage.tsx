import { useMemo } from 'react'
import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { pvcMetricsKey, usePvcTableMetrics } from '../../queries/usePvcTableMetrics'
import { formatBytes } from '../../format'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'

interface StorageOverviewPageProps {
  clusterId: string
  isActive: boolean
  onOpenResourceKind: (kind: ResourceKind) => void
  onNavigateToResource: (focus: ResourceFocus, item?: ResourceListItem) => void
}

const STORAGE_KINDS: ResourceKind[] = ['PersistentVolumeClaims', 'PersistentVolumes', 'StorageClasses']

function itemsOf(data: { items: ResourceListItem[] } | { error: string } | undefined): ResourceListItem[] {
  return data && !('error' in data) ? data.items : []
}

export function StorageOverviewPage({
  clusterId,
  isActive,
  onOpenResourceKind,
  onNavigateToResource
}: StorageOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()

  const pvc = useResourceList(clusterId, 'ALL', 'PersistentVolumeClaims', isActive)
  const pv = useResourceList(clusterId, 'ALL', 'PersistentVolumes', isActive)
  const sc = useResourceList(clusterId, 'ALL', 'StorageClasses', isActive)
  const pvcUsage = usePvcTableMetrics(clusterId, 'ALL', isActive)

  const byKind = useMemo(
    () =>
      ({
        PersistentVolumeClaims: itemsOf(pvc.data),
        PersistentVolumes: itemsOf(pv.data),
        StorageClasses: itemsOf(sc.data)
      }) as Record<ResourceKind, ResourceListItem[]>,
    [pvc.data, pv.data, sc.data]
  )

  const loading = pvc.isLoading || pv.isLoading || sc.isLoading

  const unboundClaims = useMemo(
    () => byKind.PersistentVolumeClaims.filter((c) => c.statusText !== 'Bound'),
    [byKind.PersistentVolumeClaims]
  )

  const availableVolumes = useMemo(
    () => byKind.PersistentVolumes.filter((v) => v.statusText === 'Available'),
    [byKind.PersistentVolumes]
  )

  const boundClaimsCount = byKind.PersistentVolumeClaims.length - unboundClaims.length

  const fullestClaims = useMemo(() => {
    return byKind.PersistentVolumeClaims.map((item) => {
      const usage = pvcUsage.get(pvcMetricsKey(item.namespace, item.name))
      return { item, usage }
    })
      .filter((row) => row.usage?.percent !== undefined)
      .sort((a, b) => (b.usage?.percent ?? 0) - (a.usage?.percent ?? 0))
      .slice(0, 12)
  }, [byKind.PersistentVolumeClaims, pvcUsage])

  if (loading && STORAGE_KINDS.every((k) => byKind[k].length === 0)) return <LoadingState />

  return (
    <OverviewPage title={t('storageOverview.title')} subtitle={t('storageOverview.subtitle')}>
      <DetailOverview>
        <OverviewGrid>
          {STORAGE_KINDS.map((kind) => (
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
          <OverviewStat
            label={t('storageOverview.bound')}
            value={boundClaimsCount}
            tone="ok"
            onClick={() => onOpenResourceKind('PersistentVolumeClaims')}
          />
          <OverviewStat
            label={t('storageOverview.unbound')}
            value={unboundClaims.length}
            tone={unboundClaims.length > 0 ? 'warn' : 'ok'}
            onClick={() => onOpenResourceKind('PersistentVolumeClaims')}
          />
        </OverviewGrid>

        <DetailSection title={t('storageOverview.unboundClaims')}>
          {unboundClaims.length === 0 ? (
            <span className="ml-detail-empty">{t('storageOverview.noUnboundClaims')}</span>
          ) : (
            <div className="ml-overview-list">
              {unboundClaims.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    onNavigateToResource(
                      { kind: 'PersistentVolumeClaims', namespace: item.namespace, name: item.name },
                      item
                    )
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <span className="ml-overview-list__meta">{item.columns.capacity}</span>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('storageOverview.fullest')}>
          {fullestClaims.length === 0 ? (
            <span className="ml-detail-empty">{t('storageOverview.noUsage')}</span>
          ) : (
            <div className="ml-overview-list">
              {fullestClaims.map(({ item, usage }) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    onNavigateToResource(
                      { kind: 'PersistentVolumeClaims', namespace: item.namespace, name: item.name },
                      item
                    )
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <span className="ml-overview-list__meta">
                    {usage?.percent !== undefined && usage.usedBytes !== undefined && usage.capacityBytes !== undefined
                      ? t('storageOverview.usageMeta', {
                          percent: Math.round(usage.percent),
                          used: formatBytes(usage.usedBytes),
                          capacity: formatBytes(usage.capacityBytes)
                        })
                      : item.columns.capacity}
                  </span>
                  <Tag color={usage && usage.percent !== undefined && usage.percent >= 90 ? 'red' : item.statusColor || 'default'}>
                    {usage?.percent !== undefined ? `${Math.round(usage.percent)}%` : item.statusText}
                  </Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t('storageOverview.availableVolumes')}>
          {availableVolumes.length === 0 ? (
            <span className="ml-detail-empty">{t('storageOverview.noAvailableVolumes')}</span>
          ) : (
            <div className="ml-overview-list">
              {availableVolumes.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    onNavigateToResource({ kind: 'PersistentVolumes', namespace: '', name: item.name }, item)
                  }
                >
                  <strong>{item.name}</strong>
                  <span className="ml-overview-list__meta">{item.columns.capacity}</span>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
          {availableVolumes.length > 0 ? (
            <p className="ml-overview-note">
              {t('storageOverview.availableVolumesHint', { count: availableVolumes.length })}
            </p>
          ) : null}
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
