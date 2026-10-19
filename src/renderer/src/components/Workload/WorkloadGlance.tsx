import { useTranslation } from 'react-i18next'
import type { WorkloadContainerInfo, WorkloadContextInfo } from '@shared/types/workload'
import { DetailFactGrid, DetailSection } from '../Detail/detailPrimitives'

function qty(cpu?: string, memory?: string): string {
  const parts = [cpu, memory].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function probesOf(
  containers: WorkloadContainerInfo[],
  type: 'liveness' | 'readiness' | 'startup'
): string {
  const hits = containers.flatMap((c) =>
    (c.probes ?? []).filter((p) => p.type === type).map((p) => `${c.name}: ${p.handler}`)
  )
  return hits.length > 0 ? hits.join(' · ') : '—'
}

function resourceLine(
  containers: WorkloadContainerInfo[],
  field: 'requests' | 'limits'
): string {
  if (containers.length === 0) return '—'
  return containers.map((c) => `${c.name}: ${qty(c[field]?.cpu, c[field]?.memory)}`).join(' · ')
}

export function WorkloadGlance({ context }: { context: WorkloadContextInfo | undefined }): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!context) return null

  const containers = context.containers ?? []
  const hpa = context.hpa
  const pdb = context.pdb
  const replicas = context.replicas
  const hasStartup = containers.some((c) => (c.probes ?? []).some((p) => p.type === 'startup'))

  const pdbBits = [
    pdb?.minAvailable ? `min ${pdb.minAvailable}` : null,
    pdb?.maxUnavailable ? `max ${pdb.maxUnavailable}` : null
  ].filter(Boolean)

  const hpaBits = hpa
    ? [
        hpa.currentReplicas != null ? `${hpa.currentReplicas}` : null,
        `${hpa.minReplicas ?? '?'}–${hpa.maxReplicas ?? '?'}`
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="ml-workload-glance">
      <DetailSection title={t('resourceDetail.glance.title')}>
        <DetailFactGrid
          facts={[
            {
              label: t('resourceDetail.glance.replicas'),
              value: replicas ? `${replicas.readyReplicas}/${replicas.currentReplicas}` : '—'
            },
            {
              label: t('resourceDetail.glance.hpa'),
              value: hpa ? `${hpa.name} · ${hpaBits}` : t('resourceDetail.glance.none')
            },
            {
              label: t('resourceDetail.glance.pdb'),
              value: pdb
                ? `${pdb.name}${pdbBits.length > 0 ? ` · ${pdbBits.join(' · ')}` : ''}`
                : t('resourceDetail.glance.none')
            },
            {
              label: t('resourceDetail.glance.readiness'),
              value: probesOf(containers, 'readiness')
            },
            {
              label: t('resourceDetail.glance.liveness'),
              value: probesOf(containers, 'liveness')
            },
            ...(hasStartup
              ? [
                  {
                    label: t('resourceDetail.glance.startup'),
                    value: probesOf(containers, 'startup')
                  }
                ]
              : []),
            {
              label: t('resourceDetail.glance.requests'),
              value: resourceLine(containers, 'requests')
            },
            {
              label: t('resourceDetail.glance.limits'),
              value: resourceLine(containers, 'limits')
            }
          ]}
        />
      </DetailSection>
    </div>
  )
}
