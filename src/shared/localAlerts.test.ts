import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCAL_ALERT_PREFS, evaluateLocalAlerts } from './localAlerts'
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
