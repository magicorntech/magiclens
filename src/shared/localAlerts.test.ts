import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCAL_ALERT_PREFS,
  evaluateLocalAlerts,
  isAlertSnoozed,
  mergeAlertHistory,
  type LocalAlert
} from './localAlerts'
import type { ResourceListItem } from './types/resource'
import type { TlsCertInfo } from './types/tlsCerts'

function item(
  name: string,
  namespace: string,
  statusText: string,
  extra: Partial<ResourceListItem> = {}
): ResourceListItem {
  return {
    id: name,
    name,
    namespace,
    ageTimestamp: null,
    statusText,
    statusColor: 'red',
    columns: {},
    ...extra
  }
}

const cert = (name: string, status: TlsCertInfo['status'], daysRemaining: number | null): TlsCertInfo => ({
  namespace: 'shop',
  name,
  subject: 'CN=shop',
  issuer: 'CN=demo',
  hosts: ['shop.aurora.demo'],
  ingressHosts: [],
  notBefore: null,
  notAfter: null,
  daysRemaining,
  status
})

describe('evaluateLocalAlerts', () => {
  it('flags crash loops, NotReady nodes, failed jobs, and certs', () => {
    const alerts = evaluateLocalAlerts({
      clusterId: 'c1',
      clusterName: 'prod',
      pods: [
        item('web-a', 'shop', 'Running'),
        item('web-b', 'shop', 'CrashLoopBackOff', { statusDetail: 'back-off restarting' })
      ],
      nodes: [item('n1', '', 'Ready'), item('n2', '', 'NotReady')],
      jobs: [item('ok', 'shop', 'Complete'), item('bad', 'shop', 'Failed')],
      deployments: [],
      certs: [cert('live', 'ok', 90), cert('soon', 'expiring', 11), cert('dead', 'expired', -4)]
    })
    expect(alerts.map((a) => a.type).sort()).toEqual([
      'certExpired',
      'certExpiring',
      'crashLoop',
      'jobFailed',
      'nodeNotReady'
    ])
  })

  it('adds image pull, pending, pressure, and short deployments, and honors disabled types', () => {
    const alerts = evaluateLocalAlerts(
      {
        clusterId: 'c1',
        clusterName: 'prod',
        pods: [
          item('img', 'shop', 'ImagePullBackOff'),
          item('wait', 'shop', 'Pending', { ageTimestamp: new Date(Date.now() - 20 * 60_000).toISOString() })
        ],
        nodes: [item('n1', '', 'Ready', { statusDetail: 'MemoryPressure' })],
        jobs: [],
        deployments: [item('web', 'shop', 'Progressing', { columns: { ready: '1/3' } })],
        certs: []
      },
      {
        ...DEFAULT_LOCAL_ALERT_PREFS,
        types: { ...DEFAULT_LOCAL_ALERT_PREFS.types, nodePressure: false }
      }
    )
    expect(alerts.map((a) => a.type).sort()).toEqual(['deploymentUnavailable', 'imagePull', 'podPending'])
  })
})

const crash = (clusterId: string): LocalAlert => ({
  id: `${clusterId}:pod:ns/a:crash`,
  clusterId,
  clusterName: clusterId,
  type: 'crashLoop',
  severity: 'error',
  title: 'a is crash looping',
  body: 'back-off'
})

describe('mergeAlertHistory', () => {
  it('keeps an id that disappears and sets clearedAt once', () => {
    const seen = '2026-10-22T16:00:00.000Z'
    const gone = '2026-10-22T16:05:00.000Z'
    const active = mergeAlertHistory([], [crash('cluster-a')], seen)
    expect(active).toHaveLength(1)
    expect(active[0]).toMatchObject({
      id: 'cluster-a:pod:ns/a:crash',
      firstSeen: seen,
      lastSeen: seen,
      clearedAt: null
    })

    const cleared = mergeAlertHistory(active, [], gone)
    expect(cleared).toHaveLength(1)
    expect(cleared[0].clearedAt).toBe(gone)
    expect(cleared[0].firstSeen).toBe(seen)
    expect(cleared[0].lastSeen).toBe(seen)

    const again = mergeAlertHistory(cleared, [], '2026-10-22T16:10:00.000Z')
    expect(again).toHaveLength(1)
    expect(again[0].clearedAt).toBe(gone)
  })
})

describe('isAlertSnoozed', () => {
  const until = '2099-01-01T00:00:00.000Z'
  const nowMs = Date.parse('2026-10-22T12:00:00.000Z')

  it('does not hide the same condition on another cluster', () => {
    const snoozes = [{ id: 'cluster-a:pod:ns/a:crash', clusterId: 'cluster-a', until }]
    expect(isAlertSnoozed(snoozes, crash('cluster-a'), nowMs)).toBe(true)
    expect(isAlertSnoozed(snoozes, crash('cluster-b'), nowMs)).toBe(false)
    expect(
      isAlertSnoozed(snoozes, { id: 'cluster-a:pod:ns/a:crash', clusterId: 'cluster-b' }, nowMs)
    ).toBe(false)
  })

  it('treats an expired until as not snoozed', () => {
    const expired = '2026-10-22T11:00:00.000Z'
    const snoozes = [{ id: 'cluster-a:pod:ns/a:crash', clusterId: 'cluster-a', until: expired }]
    expect(isAlertSnoozed(snoozes, crash('cluster-a'), nowMs)).toBe(false)
    expect(isAlertSnoozed(snoozes, crash('cluster-a'), Date.parse(expired))).toBe(false)
  })
})
