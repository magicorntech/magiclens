import { tlsCertKey, type TlsCertInfo } from './types/tlsCerts'
import type { ResourceListItem } from './types/resource'

export const LOCAL_ALERT_TYPES = [
  'crashLoop',
  'imagePull',
  'podFailed',
  'podPending',
  'restartsHigh',
  'nodeNotReady',
  'nodePressure',
  'jobFailed',
  'deploymentUnavailable',
  'certExpiring',
  'certExpired'
] as const

export type LocalAlertType = (typeof LOCAL_ALERT_TYPES)[number]

export type AlertSoundId = 'off' | 'soft' | 'chime' | 'alarm'

export interface LocalAlertPrefs {
  types: Record<LocalAlertType, boolean>
  sound: AlertSoundId
  /** Which fresh alerts play a sound. */
  soundFor: 'all' | 'errors'
  restartThreshold: number
  pendingMinutes: number
}

export function defaultAlertTypes(): Record<LocalAlertType, boolean> {
  return {
    crashLoop: true,
    imagePull: true,
    podFailed: true,
    podPending: true,
    restartsHigh: true,
    nodeNotReady: true,
    nodePressure: true,
    jobFailed: true,
    deploymentUnavailable: true,
    certExpiring: true,
    certExpired: true
  }
}

export const DEFAULT_LOCAL_ALERT_PREFS: LocalAlertPrefs = {
  types: defaultAlertTypes(),
  sound: 'chime',
  soundFor: 'all',
  restartThreshold: 10,
  pendingMinutes: 10
}

export type LocalAlertSeverity = 'warning' | 'error'

export interface LocalAlert {
  id: string
  clusterId: string
  clusterName: string
  type: LocalAlertType
  severity: LocalAlertSeverity
  title: string
  body: string
  kind?: string
  namespace?: string
  name?: string
}

export interface LocalAlertSources {
  clusterId: string
  clusterName: string
  pods: ResourceListItem[]
  nodes: ResourceListItem[]
  jobs: ResourceListItem[]
  deployments: ResourceListItem[]
  certs: TlsCertInfo[]
}

function podText(pod: ResourceListItem): string {
  return `${pod.statusText} ${pod.statusDetail ?? ''}`
}

function minutesOld(ageTimestamp: string | null): number | null {
  if (!ageTimestamp) return null
  const ms = Date.parse(ageTimestamp)
  if (!Number.isFinite(ms)) return null
  return (Date.now() - ms) / 60_000
}

function pushAlert(out: LocalAlert[], alert: LocalAlert): void {
  out.push(alert)
}

export function evaluateLocalAlerts(
  input: LocalAlertSources,
  prefs: LocalAlertPrefs = DEFAULT_LOCAL_ALERT_PREFS
): LocalAlert[] {
  const { clusterId, clusterName } = input
  const out: LocalAlert[] = []
  const crashIds = new Set<string>()

  for (const pod of input.pods) {
    const text = podText(pod)
    const base = {
      clusterId,
      clusterName,
      kind: 'Pods',
      namespace: pod.namespace,
      name: pod.name
    }
    if (/crashloop|back-off restarting/i.test(text)) {
      crashIds.add(pod.id)
      pushAlert(out, {
        ...base,
        id: `${clusterId}:pod:${pod.namespace}/${pod.name}:crash`,
        type: 'crashLoop',
        severity: 'error',
        title: `${pod.name} is crash looping`,
        body: pod.statusDetail || pod.statusText
      })
      continue
    }
    if (/imagepull|errimagepull|invalidimagename/i.test(text)) {
      pushAlert(out, {
        ...base,
        id: `${clusterId}:pod:${pod.namespace}/${pod.name}:image`,
        type: 'imagePull',
        severity: 'error',
        title: `${pod.name} cannot pull its image`,
        body: pod.statusDetail || pod.statusText
      })
      continue
    }
    if (/oomkilled|^error$|createcontainer|runcontainer|evicted|containerstatusunknown/i.test(text)) {
      pushAlert(out, {
        ...base,
        id: `${clusterId}:pod:${pod.namespace}/${pod.name}:failed`,
        type: 'podFailed',
        severity: 'error',
        title: `${pod.name} is ${pod.statusText}`,
        body: pod.statusDetail || pod.statusText
      })
      continue
    }
    if (/^pending$/i.test(pod.statusText)) {
      const age = minutesOld(pod.ageTimestamp)
      if (age == null || age >= prefs.pendingMinutes) {
        pushAlert(out, {
          ...base,
          id: `${clusterId}:pod:${pod.namespace}/${pod.name}:pending`,
          type: 'podPending',
          severity: 'warning',
          title: `${pod.name} is still pending`,
          body: pod.statusDetail || pod.statusText
        })
      }
    }
    const restarts = Number(pod.columns.restarts ?? 0)
    if (!crashIds.has(pod.id) && restarts >= prefs.restartThreshold) {
      pushAlert(out, {
        ...base,
        id: `${clusterId}:pod:${pod.namespace}/${pod.name}:restarts`,
        type: 'restartsHigh',
        severity: 'warning',
        title: `${pod.name} restarted ${restarts} times`,
        body: pod.statusText
      })
    }
  }

  for (const node of input.nodes) {
    const text = `${node.statusText} ${node.statusDetail ?? ''}`
    if (!/^ready$/i.test(node.statusText)) {
      pushAlert(out, {
        id: `${clusterId}:node:${node.name}`,
        clusterId,
        clusterName,
        type: 'nodeNotReady',
        severity: 'error',
        title: `${node.name} is ${node.statusText}`,
        body: node.statusDetail || node.statusText,
        kind: 'Nodes',
        namespace: '',
        name: node.name
      })
      continue
    }
    if (/pressure/i.test(text)) {
      pushAlert(out, {
        id: `${clusterId}:node:${node.name}:pressure`,
        clusterId,
        clusterName,
        type: 'nodePressure',
        severity: 'warning',
        title: `${node.name} is under pressure`,
        body: node.statusDetail || node.statusText,
        kind: 'Nodes',
        namespace: '',
        name: node.name
      })
    }
  }

  for (const job of input.jobs) {
    if (!/fail/i.test(job.statusText)) continue
    out.push({
      id: `${clusterId}:job:${job.namespace}/${job.name}`,
      clusterId,
      clusterName,
      type: 'jobFailed',
      severity: 'warning',
      title: `Job ${job.name} failed`,
      body: job.statusText,
      kind: 'Jobs',
      namespace: job.namespace,
      name: job.name
    })
  }

  for (const deploy of input.deployments) {
    const ready = deploy.columns.ready ?? ''
    const match = /^(\d+)\/(\d+)$/.exec(ready)
    const short = match ? Number(match[1]) < Number(match[2]) : /unavailable|progressing/i.test(deploy.statusText)
    if (!short) continue
    pushAlert(out, {
      id: `${clusterId}:deploy:${deploy.namespace}/${deploy.name}`,
      clusterId,
      clusterName,
      type: 'deploymentUnavailable',
      severity: 'warning',
      title: `${deploy.name} is not fully available`,
      body: ready || deploy.statusText,
      kind: 'Deployments',
      namespace: deploy.namespace,
      name: deploy.name
    })
  }

  for (const cert of input.certs) {
    if (cert.status !== 'expired' && cert.status !== 'expiring') continue
    const expired = cert.status === 'expired'
    out.push({
      id: `${clusterId}:cert:${tlsCertKey(cert.namespace, cert.name)}`,
      clusterId,
      clusterName,
      type: expired ? 'certExpired' : 'certExpiring',
      severity: expired ? 'error' : 'warning',
      title: expired
        ? `Certificate ${cert.name} expired`
        : `Certificate ${cert.name} expires in ${cert.daysRemaining ?? '?'}d`,
      body: cert.hosts[0] || cert.subject || `${cert.namespace}/${cert.name}`,
      kind: 'Secrets',
      namespace: cert.namespace,
      name: cert.name
    })
  }

  return out.filter((alert) => prefs.types[alert.type] !== false)
}

export interface OsNotificationTarget {
  type: 'resource' | 'note'
  clusterId?: string
  kind?: string
  namespace?: string
  name?: string
  noteId?: string
}

export interface AlertsNotifyRequest {
  title: string
  body: string
  target?: OsNotificationTarget
  /** Skip the OS sound when MagicLens plays its own tone. */
  silent?: boolean
}

export type AlertsNotifyResponse = { ok: boolean; error?: string }
