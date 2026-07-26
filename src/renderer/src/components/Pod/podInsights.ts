import type { PodContainerInfo, PodDetailData } from '@shared/types/pod'

export type PodInsightLevel = 'error' | 'warning' | 'info' | 'success'

export interface PodInsight {
  id: string
  level: PodInsightLevel
  message: string
}

type TFunc = (key: string, values?: Record<string, unknown>) => string

const HIGH_RESTART_THRESHOLD = 5

function usesFloatingTag(image: string): boolean {
  const ref = image.split('/').pop() ?? image
  if (!ref.includes(':')) return true
  return ref.endsWith(':latest')
}

/**
 * Derives human-facing recommendations, anomaly flags, and health alerts purely
 * from the pod spec/status we already fetched — no extra cluster calls.
 */
export function computePodInsights(detail: PodDetailData, t: TFunc): PodInsight[] {
  const insights: PodInsight[] = []
  const containers = detail.containers ?? []
  const initContainers = detail.initContainers ?? []
  const allContainers: PodContainerInfo[] = [...containers, ...initContainers]

  const crashing = allContainers.filter(
    (c) => c.state === 'CrashLoopBackOff' || c.lastTerminatedReason === 'Error' || c.lastTerminatedReason === 'OOMKilled'
  )
  for (const c of crashing) {
    insights.push({
      id: `crash-${c.name}`,
      level: 'error',
      message: t('podDetail.insights.crashLoop', {
        container: c.name,
        reason: c.state === 'CrashLoopBackOff' ? c.state : c.lastTerminatedReason
      })
    })
  }

  const oom = allContainers.filter((c) => c.lastTerminatedReason === 'OOMKilled')
  for (const c of oom) {
    insights.push({
      id: `oom-${c.name}`,
      level: 'error',
      message: t('podDetail.insights.oomKilled', { container: c.name })
    })
  }

  const totalRestarts = detail.totalRestarts ?? containers.reduce((sum, c) => sum + (c.restartCount ?? 0), 0)
  if (totalRestarts >= HIGH_RESTART_THRESHOLD) {
    insights.push({
      id: 'high-restarts',
      level: 'warning',
      message: t('podDetail.insights.highRestarts', { count: totalRestarts })
    })
  }

  const ready = detail.ready ?? ''
  const [readyStr, totalStr] = ready.split('/')
  const readyN = Number(readyStr)
  const totalN = Number(totalStr)
  if (detail.phase === 'Running' && Number.isFinite(readyN) && Number.isFinite(totalN) && readyN < totalN) {
    insights.push({
      id: 'not-ready',
      level: 'warning',
      message: t('podDetail.insights.notReady', { ready: readyN, total: totalN })
    })
  }

  if (detail.phase === 'Pending') {
    const unschedulable = (detail.conditions ?? []).find((c) => c.type === 'PodScheduled' && c.status !== 'True')
    if (unschedulable) {
      insights.push({
        id: 'unschedulable',
        level: 'error',
        message: t('podDetail.insights.unschedulable', {
          reason: unschedulable.reason || unschedulable.message || 'Pending'
        })
      })
    }
  }

  for (const c of containers) {
    const probes = c.probes ?? []
    const hasLiveness = probes.some((p) => p.type === 'liveness')
    const hasReadiness = probes.some((p) => p.type === 'readiness')
    if (!hasLiveness) {
      insights.push({
        id: `no-liveness-${c.name}`,
        level: 'info',
        message: t('podDetail.insights.noLiveness', { container: c.name })
      })
    }
    if (!hasReadiness) {
      insights.push({
        id: `no-readiness-${c.name}`,
        level: 'info',
        message: t('podDetail.insights.noReadiness', { container: c.name })
      })
    }
    const missingLimits = !c.limits?.cpu || !c.limits?.memory
    if (missingLimits) {
      insights.push({
        id: `no-limits-${c.name}`,
        level: 'warning',
        message: t('podDetail.insights.noLimits', { container: c.name })
      })
    }
    if (usesFloatingTag(c.image ?? '')) {
      insights.push({
        id: `latest-${c.name}`,
        level: 'warning',
        message: t('podDetail.insights.floatingTag', { container: c.name })
      })
    }
    if (c.securityContext?.privileged) {
      insights.push({
        id: `privileged-${c.name}`,
        level: 'error',
        message: t('podDetail.insights.privileged', { container: c.name })
      })
    }
    if (c.securityContext?.allowPrivilegeEscalation) {
      insights.push({
        id: `escalation-${c.name}`,
        level: 'warning',
        message: t('podDetail.insights.privilegeEscalation', { container: c.name })
      })
    }
  }

  if (detail.qosClass === 'BestEffort') {
    insights.push({
      id: 'qos-besteffort',
      level: 'info',
      message: t('podDetail.insights.bestEffort')
    })
  }

  if (insights.length === 0) {
    insights.push({ id: 'healthy', level: 'success', message: t('podDetail.insights.healthy') })
  }

  return insights
}
