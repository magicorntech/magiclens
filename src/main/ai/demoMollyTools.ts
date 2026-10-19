import type { MollyToolCall, MollyToolResult } from '../../shared/types/molly'

const GiB = 1024 ** 3

const NODES: Array<[string, number, number, number, number]> = [
  // name, cpu used, cpu cap, mem used GiB, mem cap GiB
  ['aurora-pool-a-1', 4.4, 8, 28, 32],
  ['aurora-pool-a-2', 3.1, 8, 19, 32],
  ['aurora-pool-a-3', 2.6, 8, 21, 32],
  ['aurora-pool-b-1', 3.8, 8, 24, 32],
  ['aurora-pool-b-2', 2.2, 8, 14, 32],
  ['aurora-cp-1', 1.6, 4, 9, 16],
  ['aurora-cp-2', 0.9, 4, 6, 16]
]

const WARNINGS = [
  { name: 'image-resizer-7f8d9c-b3k', namespace: 'shop', type: 'Warning', reason: 'BackOff', at: '4m ago', message: 'Back-off restarting failed container resizer' },
  { name: 'image-resizer-7f8d9c-b3k', namespace: 'shop', type: 'Warning', reason: 'Unhealthy', at: '6m ago', message: 'Readiness probe failed: HTTP 503' },
  { name: 'image-resizer-7f8d9c-c4k', namespace: 'shop', type: 'Warning', reason: 'FailedScheduling', at: '21m ago', message: '0/7 nodes available: 1 node(s) not ready, 6 insufficient memory' },
  { name: 'checkout-api', namespace: 'shop', type: 'Warning', reason: 'FailedGetResourceMetric', at: '38m ago', message: 'unable to get metrics for resource cpu' },
  { name: 'storefront', namespace: 'shop', type: 'Normal', reason: 'ScalingReplicaSet', at: '1h ago', message: 'Scaled up replica set storefront-7f8d9c to 5' }
]

const LOG_LINES = [
  'INFO  GET /healthz 200 1ms',
  'INFO  GET /api/v1/catalog 200 18ms',
  'INFO  GET /api/v1/cart 200 12ms',
  'WARN  upstream image-resizer slow: 1840ms',
  'INFO  GET /metrics 200 3ms',
  'INFO  POST /api/v1/checkout 201 64ms',
  'WARN  retrying image-resizer (attempt 2/3)',
  'INFO  GET /api/v1/catalog 200 16ms'
]

/** Demo mode only: canned, believable answers so Molly demos never touch a real API server. */
export function demoMollyTool(call: MollyToolCall): MollyToolResult {
  const name = call.name
  const args = call.args ?? {}
  switch (name) {
    case 'getNodeMetrics': {
      const nodes = NODES.map(([n, cpu, cpuCap, mem, memCap]) => ({
        name: n,
        cpu: `${Math.round(cpu * 1000)}m`,
        memory: `${mem} Gi`,
        cpuCapacity: `${cpuCap * 1000}m`,
        memoryCapacity: `${memCap} Gi`,
        cpuUsageCores: cpu,
        memoryUsageBytes: mem * GiB,
        cpuCapacityCores: cpuCap,
        memoryCapacityBytes: memCap * GiB
      }))
      return {
        name,
        ok: true,
        summary: `7 node(s) on aurora-prod. aurora-pool-a-1 4400m, 28 Gi; aurora-pool-b-1 3800m, 24 Gi.`,
        data: { metricsAvailable: true, nodes }
      }
    }
    case 'getEvents':
      return { name, ok: true, summary: '5 olay · 4 warning', data: WARNINGS }
    case 'getPodLogs': {
      const pod = String(args.podName ?? args.name ?? 'storefront-7f8d9c-e6k')
      const now = Date.now()
      const lines = LOG_LINES.map((l, i) => `${new Date(now - (LOG_LINES.length - i) * 7000).toISOString()} ${l}`)
      return {
        name,
        ok: true,
        summary: `${lines.length} satır · shop/${pod}`,
        data: { logs: lines.join('\n'), kind: 'Logs', document: lines.join('\n'), total: lines.length }
      }
    }
    case 'getUsage':
      return {
        name,
        ok: true,
        summary: 'Cluster at 36% CPU and 46% memory; busiest namespace is shop.',
        data: {
          kind: 'Usage',
          total: 4,
          chart: [
            { name: 'shop', value: 46 },
            { name: 'payments', value: 21 },
            { name: 'monitoring', value: 17 },
            { name: 'argocd', value: 9 }
          ],
          rows: [
            { namespace: 'shop', cpu: '7240m', memory: '41 Gi' },
            { namespace: 'payments', cpu: '3310m', memory: '19 Gi' },
            { namespace: 'monitoring', cpu: '2650m', memory: '24 Gi' },
            { namespace: 'argocd', cpu: '1400m', memory: '8 Gi' }
          ]
        }
      }
    case 'getSecurity':
    case 'startSecurityScan':
      return {
        name,
        ok: true,
        summary: '12 findings: 2 critical, 4 high, 6 medium.',
        data: {
          kind: 'Security',
          total: 12,
          chart: [
            { name: 'Critical', value: 2 },
            { name: 'High', value: 4 },
            { name: 'Medium', value: 6 }
          ],
          rows: [
            { severity: 'Critical', rule: 'Privileged container', resource: 'shop/image-resizer' },
            { severity: 'Critical', rule: 'Secret exposed in env', resource: 'payments/payments-api' },
            { severity: 'High', rule: 'Runs as root', resource: 'shop/admin-console' },
            { severity: 'High', rule: 'No resource limits', resource: 'shop/notify-mailer' }
          ],
          recommendations: ['Move payments-api secrets into a Secret reference.', 'Drop privileged on image-resizer.']
        }
      }
    case 'summarizeAnomalies':
      return {
        name,
        ok: true,
        summary: '4 finding(s)',
        data: {
          findings: [
            'Node aurora-pool-b-2 is NotReady.',
            'image-resizer (shop) is in CrashLoopBackOff: readiness probe 503, 6 restarts.',
            'image-resizer-7f8d9c-c4k cannot be scheduled: not enough free memory.',
            'checkout-api HPA cannot read CPU metrics.'
          ],
          health: 'Degraded · 6/7 nodes ready · 1 pod pending',
          events: '4 warnings in the last hour'
        }
      }
    case 'listClusters':
      return {
        name,
        ok: true,
        summary: '3 connected clusters: aurora-prod, aurora-staging, aurora-test.',
        data: { clusters: ['aurora-prod', 'aurora-staging', 'aurora-test'] }
      }
    case 'getClusterHealth':
      return {
        name,
        ok: true,
        summary: 'aurora-prod is Degraded: 1 node not ready, 1 pod pending.',
        data: { readyNodes: 6, totalNodes: 7, failedPods: 0, cpuUsageCores: 18.6, cpuCapacityCores: 52, memoryUsageBytes: 97 * GiB, memoryCapacityBytes: 210 * GiB }
      }
    case 'listResources':
    case 'inspectResource':
    default:
      return {
        name,
        ok: true,
        summary: '9 Pods in shop',
        data: {
          kind: 'Pods',
          namespace: 'shop',
          total: 9,
          chart: [
            { name: 'Running', value: 7 },
            { name: 'Pending', value: 1 },
            { name: 'CrashLoop', value: 1 }
          ],
          rows: [
            { name: 'storefront-7f8d9c-e6k', status: 'Running', restarts: '3', age: '14d' },
            { name: 'checkout-api-7f8d9c-c4k', status: 'Running', restarts: '4', age: '14d' },
            { name: 'image-resizer-7f8d9c-b3k', status: 'CrashLoopBackOff', restarts: '6', age: '1d' },
            { name: 'image-resizer-7f8d9c-c4k', status: 'Pending', restarts: '0', age: '1d' }
          ],
          recommendations: ['Check image-resizer logs and readiness probe.']
        }
      }
  }
}
