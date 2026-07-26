import { useMemo } from 'react'
import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { useClusterStore } from '../../stores/clusterStore'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { DetailOverview, DetailSection } from '../Detail/detailPrimitives'
import { OverviewGrid, OverviewPage, OverviewStat } from './OverviewPage'

interface ConfigOverviewPageProps {
  clusterId: string
  isActive: boolean
}

const CONFIG_KINDS: ResourceKind[] = [
  'ConfigMaps',
  'Secrets',
  'ResourceQuotas',
  'LimitRanges',
  'HorizontalPodAutoscalers',
  'PodDisruptionBudgets',
  'PriorityClasses',
  'RuntimeClasses',
  'Leases',
  'MutatingWebhookConfigurations',
  'ValidatingWebhookConfigurations'
]

function itemsOf(data: { items: ResourceListItem[] } | { error: string } | undefined): ResourceListItem[] {
  return data && !('error' in data) ? data.items : []
}

export function ConfigOverviewPage({ clusterId, isActive }: ConfigOverviewPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)

  const cm = useResourceList(clusterId, 'ALL', 'ConfigMaps', isActive)
  const sec = useResourceList(clusterId, 'ALL', 'Secrets', isActive)
  const rq = useResourceList(clusterId, 'ALL', 'ResourceQuotas', isActive)
  const lr = useResourceList(clusterId, 'ALL', 'LimitRanges', isActive)
  const hpa = useResourceList(clusterId, 'ALL', 'HorizontalPodAutoscalers', isActive)
  const pdb = useResourceList(clusterId, 'ALL', 'PodDisruptionBudgets', isActive)
  const pc = useResourceList(clusterId, 'ALL', 'PriorityClasses', isActive)
  const rc = useResourceList(clusterId, 'ALL', 'RuntimeClasses', isActive)
  const leases = useResourceList(clusterId, 'ALL', 'Leases', isActive)
  const mwh = useResourceList(clusterId, 'ALL', 'MutatingWebhookConfigurations', isActive)
  const vwh = useResourceList(clusterId, 'ALL', 'ValidatingWebhookConfigurations', isActive)

  const byKind = useMemo(
    () =>
      ({
        ConfigMaps: itemsOf(cm.data),
        Secrets: itemsOf(sec.data),
        ResourceQuotas: itemsOf(rq.data),
        LimitRanges: itemsOf(lr.data),
        HorizontalPodAutoscalers: itemsOf(hpa.data),
        PodDisruptionBudgets: itemsOf(pdb.data),
        PriorityClasses: itemsOf(pc.data),
        RuntimeClasses: itemsOf(rc.data),
        Leases: itemsOf(leases.data),
        MutatingWebhookConfigurations: itemsOf(mwh.data),
        ValidatingWebhookConfigurations: itemsOf(vwh.data)
      }) as Record<ResourceKind, ResourceListItem[]>,
    [cm.data, sec.data, rq.data, lr.data, hpa.data, pdb.data, pc.data, rc.data, leases.data, mwh.data, vwh.data]
  )

  const loading =
    cm.isLoading || sec.isLoading || rq.isLoading || lr.isLoading || hpa.isLoading || pdb.isLoading

  const quotaWarnings = useMemo(() => {
    return byKind.ResourceQuotas.filter((q) => /exceed|warn|hard/i.test(q.statusText)).slice(0, 12)
  }, [byKind.ResourceQuotas])

  const tlsSecrets = useMemo(
    () => byKind.Secrets.filter((s) => /tls|certificate/i.test(s.columns.type ?? '')).length,
    [byKind.Secrets]
  )

  if (loading && CONFIG_KINDS.every((k) => byKind[k].length === 0)) return <LoadingState />

  return (
    <OverviewPage title={t('configOverview.title')} subtitle={t('configOverview.subtitle')}>
      <DetailOverview>
        <OverviewGrid>
          {CONFIG_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="ml-overview-stat ml-overview-stat--clickable"
              onClick={() => openResourceKind(clusterId, kind)}
            >
              <span className="ml-overview-stat__label">{kind}</span>
              <span className="ml-overview-stat__value">{byKind[kind].length}</span>
            </button>
          ))}
        </OverviewGrid>

        <DetailSection title={t('configOverview.highlights')}>
          <OverviewGrid>
            <OverviewStat label={t('configOverview.configMaps')} value={byKind.ConfigMaps.length} />
            <OverviewStat label={t('configOverview.secrets')} value={byKind.Secrets.length} />
            <OverviewStat label={t('configOverview.tlsSecrets')} value={tlsSecrets} />
            <OverviewStat label={t('configOverview.hpas')} value={byKind.HorizontalPodAutoscalers.length} />
            <OverviewStat label={t('configOverview.pdbs')} value={byKind.PodDisruptionBudgets.length} />
            <OverviewStat
              label={t('configOverview.webhooks')}
              value={
                byKind.MutatingWebhookConfigurations.length +
                byKind.ValidatingWebhookConfigurations.length
              }
            />
          </OverviewGrid>
        </DetailSection>

        <DetailSection title={t('configOverview.quotas')}>
          {byKind.ResourceQuotas.length === 0 ? (
            <span className="ml-detail-empty">{t('configOverview.noQuotas')}</span>
          ) : (
            <div className="ml-overview-list">
              {byKind.ResourceQuotas.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    navigateToResource(clusterId, {
                      kind: 'ResourceQuotas',
                      namespace: item.namespace,
                      name: item.name
                    })
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
          {quotaWarnings.length > 0 ? (
            <p className="ml-overview-note">{t('configOverview.quotaWarnings', { count: quotaWarnings.length })}</p>
          ) : null}
        </DetailSection>

        <DetailSection title={t('configOverview.hpaList')}>
          {byKind.HorizontalPodAutoscalers.length === 0 ? (
            <span className="ml-detail-empty">{t('configOverview.noHpas')}</span>
          ) : (
            <div className="ml-overview-list">
              {byKind.HorizontalPodAutoscalers.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ml-overview-list__row"
                  onClick={() =>
                    navigateToResource(clusterId, {
                      kind: 'HorizontalPodAutoscalers',
                      namespace: item.namespace,
                      name: item.name
                    })
                  }
                >
                  <strong>
                    {item.namespace}/{item.name}
                  </strong>
                  <span className="ml-overview-list__meta">{item.columns.target ?? item.columns.replicas}</span>
                  <Tag color={item.statusColor || 'default'}>{item.statusText}</Tag>
                </button>
              ))}
            </div>
          )}
        </DetailSection>
      </DetailOverview>
    </OverviewPage>
  )
}
