import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { VisualizerEdge, VisualizerGraphResponse, VisualizerHealth, VisualizerNode } from '@shared/types/visualizer'
import type { CustomResourceKind, DiscoveredApiResource, DiscoveryResponse, DynamicResourceItem } from '@shared/types/discovery'
import type { MetricsRangeResponse, MetricsSeries } from '@shared/types/metrics'
import type { HelmChartSummary } from '@shared/types/helm'
import type {
  TopologyApplication,
  TopologyEdge,
  TopologyGraphResponse,
  TopologyHealth,
  TopologyNode
} from '@shared/types/topology'

export const DEMO_CLUSTER_IDS = {
  prod: 'demo-aurora-prod',
  staging: 'demo-aurora-staging',
  test: 'demo-aurora-test'
} as const

/** Sidebar-only clusters — connect as demo, but carry no catalog. */
export const DEMO_EMPTY_CLUSTER_IDS = {
  platform: 'demo-platform-prod',
  payments: 'demo-payments-prod',
  edgeEu: 'demo-edge-eu',
  edgeUs: 'demo-edge-us',
  obs: 'demo-obs-central'
} as const

const CATALOG_IDS = new Set<string>(Object.values(DEMO_CLUSTER_IDS))

export function hasDemoCatalog(clusterId: string): boolean {
  return CATALOG_IDS.has(clusterId)
}

const RUNNING_DOT =
  '[{"ready":true,"waiting":false,"running":true,"terminated":false,"init":false}]'
const WAITING_DOT =
  '[{"ready":false,"waiting":true,"running":false,"terminated":false,"init":false}]'

export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

export function row(
  kind: string,
  name: string,
  namespace: string,
  statusText: string,
  statusColor: string,
  columns: Record<string, string>,
  ageDays: number
): ResourceListItem {
  return {
    id: `demo-${kind}-${namespace || 'cluster'}-${name}`,
    name,
    namespace,
    ageTimestamp: daysAgo(ageDays),
    statusText,
    statusColor,
    columns
  }
}

type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet'

interface DemoApp {
  name: string
  namespace: string
  kind: WorkloadKind
  replicas: number
  ready?: number
  image: string
  port: number
  instance: string
  ageDays: number
  ingress?: string
}

const APPS: DemoApp[] = [
  { name: 'storefront', namespace: 'shop', kind: 'Deployment', replicas: 5, image: 'nginx:1.27-alpine', port: 80, instance: 'shop', ageDays: 18, ingress: 'shop.aurora.demo' },
  { name: 'checkout-api', namespace: 'shop', kind: 'Deployment', replicas: 3, image: 'golang:1.23', port: 8080, instance: 'shop', ageDays: 16 },
  { name: 'catalog-api', namespace: 'shop', kind: 'Deployment', replicas: 3, image: 'python:3.12', port: 8000, instance: 'shop', ageDays: 14 },
  { name: 'search-index', namespace: 'shop', kind: 'Deployment', replicas: 2, image: 'elasticsearch:8.15.0', port: 9200, instance: 'shop', ageDays: 11 },
  { name: 'image-resizer', namespace: 'shop', kind: 'Deployment', replicas: 2, ready: 1, image: 'ghcr.io/aurora/image-resizer:1.4.2', port: 8080, instance: 'shop', ageDays: 2 },
  { name: 'session-broker', namespace: 'shop', kind: 'Deployment', replicas: 2, image: 'redis:7.4', port: 6379, instance: 'shop', ageDays: 11 },
  { name: 'admin-console', namespace: 'shop', kind: 'Deployment', replicas: 1, image: 'node:22-alpine', port: 3000, instance: 'shop', ageDays: 20, ingress: 'admin.aurora.demo' },
  { name: 'notify-mailer', namespace: 'shop', kind: 'Deployment', replicas: 2, image: 'ghcr.io/aurora/notify:2.1.0', port: 8080, instance: 'shop', ageDays: 15 },
  { name: 'inventory-sync', namespace: 'shop', kind: 'Deployment', replicas: 1, image: 'ghcr.io/aurora/inventory:1.9.0', port: 8080, instance: 'shop', ageDays: 9 },
  { name: 'payments-api', namespace: 'payments', kind: 'Deployment', replicas: 3, image: 'eclipse-temurin:21-jre', port: 8080, instance: 'payments', ageDays: 13 },
  { name: 'payments-worker', namespace: 'payments', kind: 'Deployment', replicas: 2, image: 'eclipse-temurin:21-jre', port: 8080, instance: 'payments', ageDays: 6 },
  { name: 'fraud-engine', namespace: 'payments', kind: 'Deployment', replicas: 2, image: 'python:3.12', port: 8090, instance: 'payments', ageDays: 8 },
  { name: 'postgres', namespace: 'data', kind: 'StatefulSet', replicas: 3, image: 'postgres:16', port: 5432, instance: 'data', ageDays: 40 },
  { name: 'redis', namespace: 'data', kind: 'StatefulSet', replicas: 3, image: 'redis:7.4', port: 6379, instance: 'redis', ageDays: 28 },
  { name: 'rabbitmq', namespace: 'data', kind: 'StatefulSet', replicas: 3, image: 'rabbitmq:3.13-management', port: 5672, instance: 'rabbitmq', ageDays: 22 },
  { name: 'node-exporter', namespace: 'monitoring', kind: 'DaemonSet', replicas: 7, image: 'prom/node-exporter:v1.8.2', port: 9100, instance: 'prometheus-stack', ageDays: 30 },
  { name: 'fluent-bit', namespace: 'logging', kind: 'DaemonSet', replicas: 7, image: 'fluent/fluent-bit:3.2', port: 2020, instance: 'loki', ageDays: 21 },
  { name: 'prometheus', namespace: 'monitoring', kind: 'Deployment', replicas: 2, image: 'prom/prometheus:v2.55.1', port: 9090, instance: 'prometheus-stack', ageDays: 30 },
  { name: 'grafana', namespace: 'monitoring', kind: 'Deployment', replicas: 1, image: 'grafana/grafana:11.5.2', port: 3000, instance: 'prometheus-stack', ageDays: 30, ingress: 'grafana.aurora.demo' },
  { name: 'alertmanager', namespace: 'monitoring', kind: 'Deployment', replicas: 2, image: 'prom/alertmanager:v0.27.0', port: 9093, instance: 'prometheus-stack', ageDays: 30 },
  { name: 'loki', namespace: 'logging', kind: 'StatefulSet', replicas: 2, image: 'grafana/loki:3.4.2', port: 3100, instance: 'loki', ageDays: 21 },
  { name: 'argocd-server', namespace: 'argocd', kind: 'Deployment', replicas: 2, image: 'quay.io/argoproj/argocd:v2.14.5', port: 8080, instance: 'argo-cd', ageDays: 35, ingress: 'argocd.aurora.demo' },
  { name: 'argocd-repo-server', namespace: 'argocd', kind: 'Deployment', replicas: 2, image: 'quay.io/argoproj/argocd:v2.14.5', port: 8081, instance: 'argo-cd', ageDays: 35 },
  { name: 'argocd-application-controller', namespace: 'argocd', kind: 'StatefulSet', replicas: 1, image: 'quay.io/argoproj/argocd:v2.14.5', port: 8082, instance: 'argo-cd', ageDays: 35 },
  { name: 'ingress-nginx-controller', namespace: 'ingress-nginx', kind: 'Deployment', replicas: 2, image: 'registry.k8s.io/ingress-nginx/controller:v1.12.1', port: 80, instance: 'ingress-nginx', ageDays: 45 },
  { name: 'cert-manager', namespace: 'cert-manager', kind: 'Deployment', replicas: 1, image: 'quay.io/jetstack/cert-manager-controller:v1.16.2', port: 9402, instance: 'cert-manager', ageDays: 45 },
  { name: 'coredns', namespace: 'kube-system', kind: 'Deployment', replicas: 2, image: 'registry.k8s.io/coredns/coredns:v1.11.3', port: 53, instance: 'kube-system', ageDays: 60 },
  { name: 'metrics-server', namespace: 'kube-system', kind: 'Deployment', replicas: 2, image: 'registry.k8s.io/metrics-server/metrics-server:v0.7.2', port: 4443, instance: 'kube-system', ageDays: 40 },
  { name: 'kube-proxy', namespace: 'kube-system', kind: 'DaemonSet', replicas: 7, image: 'registry.k8s.io/kube-proxy:v1.31.2', port: 10249, instance: 'kube-system', ageDays: 60 }
]

const NS_META: Array<{ name: string; age: number }> = [
  { name: 'default', age: 90 },
  { name: 'kube-system', age: 90 },
  { name: 'kube-public', age: 90 },
  { name: 'shop', age: 40 },
  { name: 'payments', age: 40 },
  { name: 'data', age: 40 },
  { name: 'monitoring', age: 35 },
  { name: 'logging', age: 28 },
  { name: 'argocd', age: 35 },
  { name: 'ingress-nginx', age: 45 },
  { name: 'cert-manager', age: 45 },
  { name: 'goldilocks', age: 20 }
]

export const NAMESPACES: ResourceListItem[] = NS_META.map((n) => row('ns', n.name, '', 'Active', 'green', {}, n.age))

export const NODES: ResourceListItem[] = [
  row('node', 'aurora-cp-1', '', 'Ready', 'green', { roles: 'control-plane', version: 'v1.31.2' }, 60),
  row('node', 'aurora-cp-2', '', 'Ready', 'green', { roles: 'control-plane', version: 'v1.31.2' }, 60),
  row('node', 'aurora-pool-a-1', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.2' }, 40),
  row('node', 'aurora-pool-a-2', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.2' }, 40),
  row('node', 'aurora-pool-a-3', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.1' }, 38),
  row('node', 'aurora-pool-b-1', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.2' }, 22),
  row('node', 'aurora-pool-b-2', '', 'NotReady', 'red', { roles: 'worker', version: 'v1.31.2' }, 8)
]

function nodeName(i: number): string {
  return NODES[i % NODES.length].name
}

function suffix(i: number): string {
  return `${String.fromCharCode(97 + (i % 26))}${i + 2}k`
}

function podsForApp(app: DemoApp): ResourceListItem[] {
  const ready = app.ready ?? app.replicas
  return Array.from({ length: app.replicas }, (_, i) => {
    const pending = i >= ready
    return row(
      'pod',
      `${app.name}-${app.kind === 'StatefulSet' ? i : `7f8d9c-${suffix(i)}`}`,
      app.namespace,
      pending ? 'Pending' : 'Running',
      pending ? 'gold' : 'green',
      {
        containers: pending ? WAITING_DOT : RUNNING_DOT,
        ready: pending ? '0/1' : '1/1',
        restarts: pending ? '0' : String((i * 2) % 5),
        controlledBy: app.kind,
        node: pending ? '-' : nodeName(i + app.name.length),
        qos: 'Burstable'
      },
      Math.max(1, app.ageDays - i)
    )
  })
}

export const DEPLOYMENTS: ResourceListItem[] = APPS.filter((a) => a.kind === 'Deployment').map((a) =>
  row(
    'deploy',
    a.name,
    a.namespace,
    (a.ready ?? a.replicas) < a.replicas ? 'Progressing' : 'Available',
    (a.ready ?? a.replicas) < a.replicas ? 'gold' : 'green',
    { ready: `${a.ready ?? a.replicas}/${a.replicas}`, controlledBy: '-' },
    a.ageDays
  )
)

export const STATEFULSETS: ResourceListItem[] = APPS.filter((a) => a.kind === 'StatefulSet').map((a) =>
  row('sts', a.name, a.namespace, 'Available', 'green', { ready: `${a.replicas}/${a.replicas}`, controlledBy: '-' }, a.ageDays)
)

export const DAEMONSETS: ResourceListItem[] = APPS.filter((a) => a.kind === 'DaemonSet').map((a) =>
  row('ds', a.name, a.namespace, 'Available', 'green', { ready: `${a.replicas}/${a.replicas}`, controlledBy: '-' }, a.ageDays)
)

export const PODS: ResourceListItem[] = APPS.flatMap(podsForApp)

export const REPLICASETS: ResourceListItem[] = DEPLOYMENTS.map((d) =>
  row('rs', `${d.name}-7f8d9c`, d.namespace, 'Available', 'green', { ready: d.columns.ready, controlledBy: `Deployment/${d.name}` }, 12)
)

export const REPLICATION_CONTROLLERS: ResourceListItem[] = [
  row('rc', 'legacy-healthcheck', 'default', 'Available', 'green', { ready: '1/1', controlledBy: '-' }, 80)
]

export const JOBS: ResourceListItem[] = [
  row('job', 'inventory-backfill', 'shop', 'Complete', 'green', { completions: '1/1' }, 8),
  row('job', 'payments-reconciliation', 'payments', 'Complete', 'green', { completions: '1/1' }, 3),
  row('job', 'image-warmup', 'shop', 'Failed', 'red', { completions: '0/1' }, 2),
  row('job', 'db-vacuum', 'data', 'Complete', 'green', { completions: '1/1' }, 1)
]

export const CRONJOBS: ResourceListItem[] = [
  row('cron', 'inventory-sync', 'shop', 'Active', 'green', { schedule: '*/15 * * * *' }, 20),
  row('cron', 'payments-settle', 'payments', 'Active', 'green', { schedule: '0 2 * * *' }, 20),
  row('cron', 'loki-retention', 'logging', 'Active', 'green', { schedule: '0 4 * * *' }, 14),
  row('cron', 'cert-renew-check', 'cert-manager', 'Active', 'green', { schedule: '0 */6 * * *' }, 30)
]

export const SERVICES: ResourceListItem[] = APPS.filter((a) => a.kind !== 'DaemonSet' || a.name === 'node-exporter').map((a, i) =>
  row(
    'svc',
    a.name,
    a.namespace,
    a.ingress ? 'LoadBalancer' : 'ClusterIP',
    'blue',
    {
      type: a.ingress ? 'LoadBalancer' : 'ClusterIP',
      clusterIP: `10.40.${(i % 20) + 1}.${(i % 200) + 10}`,
      ports: String(a.port)
    },
    a.ageDays
  )
)

export const INGRESSES: ResourceListItem[] = APPS.filter((a) => a.ingress).map((a) =>
  row(
    'ing',
    a.name,
    a.namespace,
    'Active',
    'green',
    {
      ingressClass: 'nginx',
      addresses: '34.90.12.40',
      hosts: a.ingress ?? '',
      tlsHosts: a.ingress ?? ''
    },
    a.ageDays
  )
)

export const CONFIGMAPS: ResourceListItem[] = [
  ...APPS.slice(0, 12).map((a) => row('cm', `${a.name}-config`, a.namespace, 'Active', 'default', { keys: String(2 + (a.name.length % 5)) }, a.ageDays)),
  row('cm', 'coredns', 'kube-system', 'Active', 'default', { keys: '1' }, 60),
  row('cm', 'grafana-dashboards', 'monitoring', 'Active', 'default', { keys: '8' }, 30)
]

export const SECRETS: ResourceListItem[] = [
  row('sec', 'storefront-tls', 'shop', 'Active', 'default', { type: 'kubernetes.io/tls', keys: '2' }, 18),
  row('sec', 'payments-db', 'payments', 'Active', 'default', { type: 'Opaque', keys: '3' }, 13),
  row('sec', 'postgres-auth', 'data', 'Active', 'default', { type: 'Opaque', keys: '2' }, 40),
  row('sec', 'argocd-secret', 'argocd', 'Active', 'default', { type: 'Opaque', keys: '5' }, 35),
  row('sec', 'grafana-admin', 'monitoring', 'Active', 'default', { type: 'Opaque', keys: '2' }, 30),
  row('sec', 'wildcard-aurora-tls', 'cert-manager', 'Active', 'default', { type: 'kubernetes.io/tls', keys: '2' }, 12)
]

export const PVCS: ResourceListItem[] = [
  row('pvc', 'shop-data', 'shop', 'Bound', 'green', { capacity: '20Gi' }, 18),
  row('pvc', 'catalog-idx', 'shop', 'Bound', 'green', { capacity: '8Gi' }, 14),
  row('pvc', 'payments-wal', 'payments', 'Bound', 'green', { capacity: '50Gi' }, 13),
  row('pvc', 'postgres-data-postgres-0', 'data', 'Bound', 'green', { capacity: '100Gi' }, 40),
  row('pvc', 'postgres-data-postgres-1', 'data', 'Bound', 'green', { capacity: '100Gi' }, 40),
  row('pvc', 'postgres-data-postgres-2', 'data', 'Bound', 'green', { capacity: '100Gi' }, 40),
  row('pvc', 'redis-data-redis-0', 'data', 'Bound', 'green', { capacity: '8Gi' }, 28),
  row('pvc', 'loki-data-loki-0', 'logging', 'Bound', 'green', { capacity: '200Gi' }, 21),
  row('pvc', 'prometheus-data', 'monitoring', 'Bound', 'green', { capacity: '80Gi' }, 30)
]

export const PVS: ResourceListItem[] = PVCS.map((p, i) =>
  row('pv', `pvc-${p.name}`, '', 'Bound', 'green', { capacity: p.columns.capacity }, p.ageTimestamp ? 40 : 20 + i)
)

export const STORAGE_CLASSES: ResourceListItem[] = [
  row('sc', 'gp3', '', 'Active', 'green', { provisioner: 'ebs.csi.aws.com', reclaimPolicy: 'Delete' }, 90),
  row('sc', 'gp3-retain', '', 'Active', 'green', { provisioner: 'ebs.csi.aws.com', reclaimPolicy: 'Retain' }, 90),
  row('sc', 'efs-dynamic', '', 'Active', 'green', { provisioner: 'efs.csi.aws.com', reclaimPolicy: 'Delete' }, 60)
]

export const HPAS: ResourceListItem[] = [
  row('hpa', 'storefront', 'shop', 'Active', 'green', { target: 'Deployment/storefront', minMax: '3–12', replicas: '5' }, 16),
  row('hpa', 'checkout-api', 'shop', 'Active', 'green', { target: 'Deployment/checkout-api', minMax: '2–8', replicas: '3' }, 16),
  row('hpa', 'payments-api', 'payments', 'Active', 'green', { target: 'Deployment/payments-api', minMax: '2–10', replicas: '3' }, 13)
]

export const PDBS: ResourceListItem[] = [
  row('pdb', 'storefront', 'shop', 'Active', 'green', { minAvailable: '2', currentHealthy: '5', desiredHealthy: '2', allowedDisruptions: '3' }, 16),
  row('pdb', 'postgres', 'data', 'Active', 'green', { minAvailable: '2', currentHealthy: '3', desiredHealthy: '2', allowedDisruptions: '1' }, 40),
  row('pdb', 'argocd-server', 'argocd', 'Active', 'green', { minAvailable: '1', currentHealthy: '2', desiredHealthy: '1', allowedDisruptions: '1' }, 35)
]

export const RESOURCE_QUOTAS: ResourceListItem[] = [
  row('rq', 'shop-compute', 'shop', 'Active', 'green', { hard: 'cpu 20, memory 64Gi, pods 80' }, 40),
  row('rq', 'payments-compute', 'payments', 'Active', 'green', { hard: 'cpu 12, memory 32Gi, pods 40' }, 40)
]

export const LIMIT_RANGES: ResourceListItem[] = [
  row('lr', 'shop-defaults', 'shop', 'Active', 'green', { limits: 'cpu 100m–2, memory 128Mi–2Gi' }, 40),
  row('lr', 'payments-defaults', 'payments', 'Active', 'green', { limits: 'cpu 200m–4, memory 256Mi–4Gi' }, 40)
]

export const PRIORITY_CLASSES: ResourceListItem[] = [
  row('pc', 'system-cluster-critical', '', 'Active', 'green', { value: '2000000000', globalDefault: 'false' }, 90),
  row('pc', 'system-node-critical', '', 'Active', 'green', { value: '2000001000', globalDefault: 'false' }, 90),
  row('pc', 'aurora-high', '', 'Active', 'green', { value: '100000', globalDefault: 'false' }, 40)
]

export const RUNTIME_CLASSES: ResourceListItem[] = [
  row('rtc', 'runc', '', 'Active', 'green', { handler: 'runc' }, 90),
  row('rtc', 'gvisor', '', 'Active', 'green', { handler: 'runsc' }, 30)
]

export const LEASES: ResourceListItem[] = [
  row('lease', 'kube-scheduler', 'kube-system', 'Active', 'green', { holder: 'aurora-cp-1' }, 1),
  row('lease', 'kube-controller-manager', 'kube-system', 'Active', 'green', { holder: 'aurora-cp-2' }, 1),
  row('lease', 'cert-manager-cainjector-leader', 'cert-manager', 'Active', 'green', { holder: 'cert-manager-6d8f' }, 1)
]

export const MUTATING_WEBHOOKS: ResourceListItem[] = [
  row('mwc', 'cert-manager-webhook', '', 'Active', 'green', { webhooks: '2' }, 45),
  row('mwc', 'ingress-nginx-admission', '', 'Active', 'green', { webhooks: '1' }, 45)
]

export const VALIDATING_WEBHOOKS: ResourceListItem[] = [
  row('vwc', 'cert-manager-webhook', '', 'Active', 'green', { webhooks: '2' }, 45),
  row('vwc', 'prometheus-admission', '', 'Active', 'green', { webhooks: '1' }, 30)
]

export const ADMISSION_POLICIES: ResourceListItem[] = [
  row('vap', 'deny-latest-tag', '', 'Active', 'green', { validations: '1' }, 12)
]

export const ADMISSION_BINDINGS: ResourceListItem[] = [
  row('vapb', 'deny-latest-tag-shop', '', 'Active', 'green', { policyName: 'deny-latest-tag' }, 12)
]

export const ENDPOINT_SLICES: ResourceListItem[] = SERVICES.slice(0, 10).map((s) =>
  row('es', `${s.name}-abc`, s.namespace, 'Active', 'green', { addressType: 'IPv4', endpoints: '2' }, 10)
)

export const ENDPOINTS: ResourceListItem[] = SERVICES.slice(0, 8).map((s) =>
  row('ep', s.name, s.namespace, 'Active', 'green', { addresses: s.columns.clusterIP }, 10)
)

export const INGRESS_CLASSES: ResourceListItem[] = [
  row('ic', 'nginx', '', 'Active', 'green', { controller: 'k8s.io/ingress-nginx' }, 45),
  row('ic', 'internal', '', 'Active', 'green', { controller: 'k8s.io/ingress-nginx' }, 45)
]

export const NETWORK_POLICIES: ResourceListItem[] = [
  row('np', 'shop-default-deny', 'shop', 'Active', 'green', { policyTypes: 'Ingress, Egress' }, 20),
  row('np', 'payments-allow-shop', 'payments', 'Active', 'green', { policyTypes: 'Ingress' }, 20),
  row('np', 'data-allow-apps', 'data', 'Active', 'green', { policyTypes: 'Ingress' }, 20)
]

export const SERVICE_ACCOUNTS: ResourceListItem[] = [
  row('sa', 'default', 'shop', 'Active', 'default', { secrets: '1' }, 40),
  row('sa', 'storefront', 'shop', 'Active', 'default', { secrets: '1' }, 18),
  row('sa', 'argocd-server', 'argocd', 'Active', 'default', { secrets: '1' }, 35),
  row('sa', 'prometheus', 'monitoring', 'Active', 'default', { secrets: '1' }, 30)
]

export const ROLES: ResourceListItem[] = [
  row('role', 'shop-developer', 'shop', 'Active', 'default', { rules: '6' }, 30),
  row('role', 'payments-operator', 'payments', 'Active', 'default', { rules: '8' }, 30)
]

export const ROLE_BINDINGS: ResourceListItem[] = [
  row('rb', 'shop-developers', 'shop', 'Active', 'default', { role: 'Role/shop-developer', subjects: '3' }, 30),
  row('rb', 'payments-ops', 'payments', 'Active', 'default', { role: 'Role/payments-operator', subjects: '2' }, 30)
]

export const CLUSTER_ROLES: ResourceListItem[] = [
  row('cr', 'cluster-admin', '', 'Active', 'default', { rules: '*' }, 90),
  row('cr', 'view', '', 'Active', 'default', { rules: '12' }, 90),
  row('cr', 'aurora-readonly', '', 'Active', 'default', { rules: '18' }, 40)
]

export const CLUSTER_ROLE_BINDINGS: ResourceListItem[] = [
  row('crb', 'cluster-admin-sre', '', 'Active', 'default', { role: 'ClusterRole/cluster-admin', subjects: '2' }, 40),
  row('crb', 'aurora-readonly-devs', '', 'Active', 'default', { role: 'ClusterRole/aurora-readonly', subjects: '6' }, 40)
]

export const CRDS: ResourceListItem[] = [
  row('crd', 'applications.argoproj.io', '', 'Active', 'green', { group: 'argoproj.io', kind: 'Application', scope: 'Namespaced' }, 35),
  row('crd', 'applicationsets.argoproj.io', '', 'Active', 'green', { group: 'argoproj.io', kind: 'ApplicationSet', scope: 'Namespaced' }, 35),
  row('crd', 'appprojects.argoproj.io', '', 'Active', 'green', { group: 'argoproj.io', kind: 'AppProject', scope: 'Namespaced' }, 35),
  row('crd', 'rollouts.argoproj.io', '', 'Active', 'green', { group: 'argoproj.io', kind: 'Rollout', scope: 'Namespaced' }, 20),
  row('crd', 'certificates.cert-manager.io', '', 'Active', 'green', { group: 'cert-manager.io', kind: 'Certificate', scope: 'Namespaced' }, 45),
  row('crd', 'prometheuses.monitoring.coreos.com', '', 'Active', 'green', { group: 'monitoring.coreos.com', kind: 'Prometheus', scope: 'Namespaced' }, 30),
  row('crd', 'servicemonitors.monitoring.coreos.com', '', 'Active', 'green', { group: 'monitoring.coreos.com', kind: 'ServiceMonitor', scope: 'Namespaced' }, 30)
]

export const EVENTS_TABLE: ResourceListItem[] = [
  row('ev', 'storefront.18a2', 'shop', 'Normal', 'green', { reason: 'ScalingReplicaSet', object: 'Deployment/storefront', message: 'Scaled up replica set storefront-7f8d9c to 5' }, 1),
  row('ev', 'image-resizer.22b', 'shop', 'Warning', 'gold', { reason: 'BackOff', object: 'Pod/image-resizer-7f8d9c-b3k', message: 'Back-off restarting failed container' }, 0),
  row('ev', 'aurora-pool-b-2.9c', '', 'Warning', 'red', { reason: 'NodeNotReady', object: 'Node/aurora-pool-b-2', message: 'Node status is now: NotReady' }, 0),
  row('ev', 'payments-api.11d', 'payments', 'Normal', 'green', { reason: 'SuccessfulCreate', object: 'Service/payments-api', message: 'Created service payments-api' }, 2)
]

export const BY_KIND: Record<ResourceKind, ResourceListItem[]> = {
  Nodes: NODES,
  Namespaces: NAMESPACES,
  Pods: PODS,
  Deployments: DEPLOYMENTS,
  StatefulSets: STATEFULSETS,
  DaemonSets: DAEMONSETS,
  ReplicaSets: REPLICASETS,
  ReplicationControllers: REPLICATION_CONTROLLERS,
  Jobs: JOBS,
  CronJobs: CRONJOBS,
  ConfigMaps: CONFIGMAPS,
  Secrets: SECRETS,
  ResourceQuotas: RESOURCE_QUOTAS,
  LimitRanges: LIMIT_RANGES,
  HorizontalPodAutoscalers: HPAS,
  PodDisruptionBudgets: PDBS,
  PriorityClasses: PRIORITY_CLASSES,
  RuntimeClasses: RUNTIME_CLASSES,
  Leases: LEASES,
  MutatingWebhookConfigurations: MUTATING_WEBHOOKS,
  ValidatingWebhookConfigurations: VALIDATING_WEBHOOKS,
  ValidatingAdmissionPolicies: ADMISSION_POLICIES,
  ValidatingAdmissionPolicyBindings: ADMISSION_BINDINGS,
  Services: SERVICES,
  EndpointSlices: ENDPOINT_SLICES,
  Endpoints: ENDPOINTS,
  Ingresses: INGRESSES,
  IngressClasses: INGRESS_CLASSES,
  NetworkPolicies: NETWORK_POLICIES,
  PersistentVolumeClaims: PVCS,
  PersistentVolumes: PVS,
  StorageClasses: STORAGE_CLASSES,
  ServiceAccounts: SERVICE_ACCOUNTS,
  Roles: ROLES,
  RoleBindings: ROLE_BINDINGS,
  ClusterRoles: CLUSTER_ROLES,
  ClusterRoleBindings: CLUSTER_ROLE_BINDINGS,
  CustomResourceDefinitions: CRDS,
  Events: EVENTS_TABLE
}

export function demoCustomResourceKinds(): CustomResourceKind[] {
  return [
    { group: 'argoproj.io', version: 'v1alpha1', apiVersion: 'argoproj.io/v1alpha1', kind: 'Application', plural: 'applications', singular: 'application', namespaced: true, shortNames: ['app', 'app'], categories: ['all'], crdName: 'applications.argoproj.io', instanceCount: 8 },
    { group: 'argoproj.io', version: 'v1alpha1', apiVersion: 'argoproj.io/v1alpha1', kind: 'ApplicationSet', plural: 'applicationsets', singular: 'applicationset', namespaced: true, shortNames: ['appset'], categories: [], crdName: 'applicationsets.argoproj.io', instanceCount: 2 },
    { group: 'argoproj.io', version: 'v1alpha1', apiVersion: 'argoproj.io/v1alpha1', kind: 'AppProject', plural: 'appprojects', singular: 'appproject', namespaced: true, shortNames: ['appproj'], categories: [], crdName: 'appprojects.argoproj.io', instanceCount: 3 },
    { group: 'cert-manager.io', version: 'v1', apiVersion: 'cert-manager.io/v1', kind: 'Certificate', plural: 'certificates', singular: 'certificate', namespaced: true, shortNames: ['cert'], categories: [], crdName: 'certificates.cert-manager.io', instanceCount: 6 },
    { group: 'monitoring.coreos.com', version: 'v1', apiVersion: 'monitoring.coreos.com/v1', kind: 'Prometheus', plural: 'prometheuses', singular: 'prometheus', namespaced: true, shortNames: [], categories: [], crdName: 'prometheuses.monitoring.coreos.com', instanceCount: 1 },
    { group: 'monitoring.coreos.com', version: 'v1', apiVersion: 'monitoring.coreos.com/v1', kind: 'ServiceMonitor', plural: 'servicemonitors', singular: 'servicemonitor', namespaced: true, shortNames: ['smon'], categories: [], crdName: 'servicemonitors.monitoring.coreos.com', instanceCount: 11 }
  ]
}

export function demoDiscovery(): DiscoveryResponse {
  const kinds = demoCustomResourceKinds()
  const resources: DiscoveredApiResource[] = kinds.map((k) => ({
    group: k.group,
    version: k.version,
    apiVersion: k.apiVersion,
    kind: k.kind,
    name: k.plural,
    singularName: k.singular,
    namespaced: k.namespaced,
    verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
    shortNames: k.shortNames,
    categories: k.categories
  }))
  const groups = [...new Set(kinds.map((k) => k.group))].map((name) => ({
    name,
    preferredVersion: kinds.find((k) => k.group === name)?.version ?? 'v1',
    versions: [{ groupVersion: `${name}/${kinds.find((k) => k.group === name)?.version}`, version: kinds.find((k) => k.group === name)?.version ?? 'v1' }]
  }))
  return { groups, resources }
}

export function demoDynamicResources(kind: string, namespace: string | 'ALL'): DynamicResourceItem[] {
  const catalog: Record<string, Array<{ name: string; namespace: string; age: number }>> = {
    Application: [
      { name: 'storefront', namespace: 'argocd', age: 18 },
      { name: 'checkout-api', namespace: 'argocd', age: 16 },
      { name: 'payments', namespace: 'argocd', age: 13 },
      { name: 'prometheus-stack', namespace: 'argocd', age: 30 },
      { name: 'loki', namespace: 'argocd', age: 21 },
      { name: 'ingress-nginx', namespace: 'argocd', age: 45 },
      { name: 'cert-manager', namespace: 'argocd', age: 45 },
      { name: 'argo-cd', namespace: 'argocd', age: 35 }
    ],
    ApplicationSet: [
      { name: 'shop-preview', namespace: 'argocd', age: 10 },
      { name: 'regional-edge', namespace: 'argocd', age: 20 }
    ],
    AppProject: [
      { name: 'default', namespace: 'argocd', age: 35 },
      { name: 'shop', namespace: 'argocd', age: 30 },
      { name: 'platform', namespace: 'argocd', age: 30 }
    ],
    Certificate: INGRESSES.map((ing, i) => ({ name: `${ing.name}-tls`, namespace: ing.namespace, age: 12 + i })),
    Prometheus: [{ name: 'k8s', namespace: 'monitoring', age: 30 }],
    ServiceMonitor: APPS.slice(0, 11).map((a) => ({ name: a.name, namespace: a.namespace, age: a.ageDays }))
  }
  const items = (catalog[kind] ?? []).map((item) => ({
    id: `demo-cr-${kind}-${item.namespace}-${item.name}`,
    name: item.name,
    namespace: item.namespace,
    ageTimestamp: daysAgo(item.age),
    labelKeys: ['app.kubernetes.io/instance', 'app']
  }))
  if (namespace === 'ALL' || !namespace) return items
  return items.filter((item) => item.namespace === namespace)
}

export function demoVisualizerGraph(namespace: string | 'ALL'): VisualizerGraphResponse {
  const apps = APPS.filter((a) => a.kind !== 'DaemonSet' && (namespace === 'ALL' || !namespace || a.namespace === namespace))
  const nodes: VisualizerNode[] = []
  const edges: VisualizerEdge[] = []
  for (const app of apps) {
    const ready = app.ready ?? app.replicas
    const status: VisualizerHealth = ready <= 0 ? 'error' : ready < app.replicas ? 'degraded' : 'healthy'
    const wId = `${app.kind}:${app.namespace}/${app.name}`
    const sId = `Service:${app.namespace}/${app.name}`
    nodes.push({
      id: wId,
      kind: app.kind,
      name: app.name,
      namespace: app.namespace,
      instance: app.instance,
      status,
      images: [app.image],
      replicasReady: ready,
      replicasDesired: app.replicas,
      hasIngress: Boolean(app.ingress),
      hasEgress: true
    })
    nodes.push({
      id: sId,
      kind: 'Service',
      name: app.name,
      namespace: app.namespace,
      instance: app.instance,
      status: 'healthy',
      images: [],
      serviceType: app.ingress ? 'LoadBalancer' : 'ClusterIP',
      ports: [{ port: app.port, name: 'http', protocol: 'TCP' }],
      hasIngress: Boolean(app.ingress),
      hasEgress: false
    })
    edges.push({ id: `${sId}->${wId}`, source: sId, target: wId })
  }
  return { nodes, edges }
}

export function demoTopologyGraph(namespace: string | 'ALL'): TopologyGraphResponse {
  const apps = APPS.filter(
    (a) => a.kind !== 'DaemonSet' && (namespace === 'ALL' || !namespace || a.namespace === namespace)
  )
  const nodes: TopologyNode[] = []
  const edges: TopologyEdge[] = []
  const seen = new Set<string>()

  function addNode(node: TopologyNode): void {
    if (seen.has(node.id)) return
    seen.add(node.id)
    nodes.push(node)
  }

  function addEdge(edge: TopologyEdge): void {
    if (!seen.has(edge.source) || !seen.has(edge.target)) return
    edges.push(edge)
  }

  for (const app of apps) {
    const ready = app.ready ?? app.replicas
    const status: TopologyHealth = ready <= 0 ? 'error' : ready < app.replicas ? 'degraded' : 'healthy'
    const labels = { app: app.name, 'app.kubernetes.io/instance': app.instance }
    const wId = `${app.kind}:${app.namespace}/${app.name}`
    const sId = `Service:${app.namespace}/${app.name}`
    const cmId = `ConfigMap:${app.namespace}/${app.name}-cm`

    addNode({
      id: wId,
      kind: app.kind === 'StatefulSet' ? 'StatefulSet' : 'Deployment',
      name: app.name,
      namespace: app.namespace,
      status,
      healthDetail: status === 'healthy' ? undefined : `${ready}/${app.replicas} ready`,
      labels,
      replicasReady: ready,
      replicasDesired: app.replicas,
      ageTimestamp: daysAgo(app.ageDays)
    })

    addNode({
      id: sId,
      kind: 'Service',
      name: app.name,
      namespace: app.namespace,
      status: 'healthy',
      labels,
      ports: [`${app.port}/TCP`],
      protocol: 'TCP',
      ageTimestamp: daysAgo(app.ageDays)
    })

    addNode({
      id: cmId,
      kind: 'ConfigMap',
      name: `${app.name}-cm`,
      namespace: app.namespace,
      status: 'healthy',
      labels,
      ageTimestamp: daysAgo(app.ageDays)
    })

    if (app.kind === 'Deployment') {
      const rsId = `ReplicaSet:${app.namespace}/${app.name}-7f8d9c`
      addNode({
        id: rsId,
        kind: 'ReplicaSet',
        name: `${app.name}-7f8d9c`,
        namespace: app.namespace,
        status,
        labels,
        replicasReady: ready,
        replicasDesired: app.replicas,
        ageTimestamp: daysAgo(Math.max(1, app.ageDays - 1))
      })
      addEdge({ id: `owns:${wId}->${rsId}`, source: wId, target: rsId, relation: 'owns' })
    }

    const appPods = PODS.filter((p) => p.namespace === app.namespace && p.name.startsWith(`${app.name}-`))
    for (const pod of appPods) {
      const pId = `Pod:${app.namespace}/${pod.name}`
      const podOk = pod.statusText === 'Running'
      addNode({
        id: pId,
        kind: 'Pod',
        name: pod.name,
        namespace: app.namespace,
        status: podOk ? 'healthy' : 'degraded',
        healthDetail: podOk ? undefined : pod.statusText,
        labels,
        ageTimestamp: pod.ageTimestamp
      })
      const ownerId =
        app.kind === 'Deployment'
          ? `ReplicaSet:${app.namespace}/${app.name}-7f8d9c`
          : wId
      addEdge({ id: `owns:${ownerId}->${pId}`, source: ownerId, target: pId, relation: 'owns' })
      addEdge({
        id: `selects:${sId}->${pId}`,
        source: sId,
        target: pId,
        relation: 'selects',
        protocol: 'TCP',
        ports: [`${app.port}`]
      })
      addEdge({ id: `mounts:${pId}->${cmId}`, source: pId, target: cmId, relation: 'mounts' })
    }

    if (app.ingress) {
      const iId = `Ingress:${app.namespace}/${app.name}`
      addNode({
        id: iId,
        kind: 'Ingress',
        name: app.name,
        namespace: app.namespace,
        status: 'healthy',
        labels,
        ports: ['80/HTTP', '443/HTTPS'],
        externalHost: app.ingress,
        ageTimestamp: daysAgo(app.ageDays)
      })
      addEdge({
        id: `routes:${iId}->${sId}`,
        source: iId,
        target: sId,
        relation: 'routes',
        protocol: 'HTTP',
        ports: ['80']
      })
    }
  }

  if (namespace === 'shop' || namespace === 'ALL' || !namespace) {
    const shopApi = nodes.find((n) => n.id === 'Service:shop/checkout-api')
    const pg = nodes.find((n) => n.id === 'Service:data/postgres')
    if (shopApi && !pg && (namespace === 'shop')) {
      addNode({
        id: 'External:shop/postgres',
        kind: 'External',
        name: 'postgres',
        namespace: 'shop',
        status: 'unknown',
        externalHost: 'postgres.data.svc',
        protocol: 'database'
      })
      addEdge({
        id: 'dependsOn:Service:shop/checkout-api->External:shop/postgres',
        source: 'Service:shop/checkout-api',
        target: 'External:shop/postgres',
        relation: 'dependsOn'
      })
    }
  }

  const groups = new Map<string, TopologyNode[]>()
  for (const node of nodes) {
    if (node.kind === 'External' || node.kind === 'ReplicaSet') continue
    const name = node.labels?.['app.kubernetes.io/instance'] ?? node.labels?.app ?? node.name
    const key = `${node.namespace}/${name}`
    const list = groups.get(key) ?? []
    list.push(node)
    groups.set(key, list)
  }

  const applications: TopologyApplication[] = [...groups.entries()].map(([key, group]) => {
    const [ns, name] = key.split('/')
    let health: TopologyHealth = 'healthy'
    const rank: Record<TopologyHealth, number> = { healthy: 0, unknown: 1, degraded: 2, error: 3 }
    let errorCount = 0
    let ready = 0
    let desired = 0
    let oldest: string | undefined
    for (const n of group) {
      if (rank[n.status] > rank[health]) health = n.status
      if (n.status === 'error') errorCount += 1
      ready += n.replicasReady ?? 0
      desired += n.replicasDesired ?? 0
      if (n.ageTimestamp && (!oldest || n.ageTimestamp < oldest)) oldest = n.ageTimestamp
    }
    return {
      id: key,
      name,
      namespace: ns,
      health,
      replicaSummary: desired > 0 ? `${ready}/${desired}` : `${group.length} resources`,
      uptimeHint: oldest,
      errorCount,
      resourceIds: group.map((n) => n.id)
    }
  })

  return { nodes, edges, applications }
}

export function demoHelmCharts(): HelmChartSummary[] {
  const releases = [
    { name: 'argo-cd', namespace: 'argocd', chartName: 'argo-cd', chartVersion: '7.8.2', appVersion: 'v2.14.5' },
    { name: 'redis', namespace: 'data', chartName: 'redis', chartVersion: '20.6.1', appVersion: '7.4.2' },
    { name: 'rabbitmq', namespace: 'data', chartName: 'rabbitmq', chartVersion: '15.4.1', appVersion: '3.13.2' },
    { name: 'prometheus-stack', namespace: 'monitoring', chartName: 'kube-prometheus-stack', chartVersion: '69.7.1', appVersion: 'v0.80.0' },
    { name: 'goldilocks', namespace: 'goldilocks', chartName: 'goldilocks', chartVersion: '10.5.0', appVersion: 'v4.14.1' },
    { name: 'loki', namespace: 'logging', chartName: 'loki', chartVersion: '6.27.0', appVersion: '3.4.2' },
    { name: 'ingress-nginx', namespace: 'ingress-nginx', chartName: 'ingress-nginx', chartVersion: '4.12.1', appVersion: '1.12.1' },
    { name: 'cert-manager', namespace: 'cert-manager', chartName: 'cert-manager', chartVersion: '1.16.2', appVersion: 'v1.16.2' }
  ]
  return releases.map((r) => ({
    id: `${r.chartName}@${r.chartVersion}`,
    chartName: r.chartName,
    chartVersion: r.chartVersion,
    appVersion: r.appVersion,
    releaseCount: 1,
    namespaces: [r.namespace],
    releases: [{ namespace: r.namespace, name: r.name }]
  }))
}

function wave(name: string, base: number, amp: number, points = 48, stepMs = 120_000): MetricsSeries {
  const now = Date.now()
  return {
    name,
    points: Array.from({ length: points }, (_, i) => {
      const t = now - (points - 1 - i) * stepMs
      const wobble = Math.sin(i / 4.2) * amp + Math.cos(i / 9.1) * (amp * 0.25)
      return { timestamp: t, value: Math.max(0, base + wobble) }
    })
  }
}

export function demoMetricsRange(): MetricsRangeResponse {
  return {
    historicalAvailable: true,
    prometheusAvailable: true,
    cpu: [wave('cpu', 6.2, 1.4)],
    memory: [wave('memory', 41 * 1024 ** 3, 4 * 1024 ** 3)],
    networkReceive: [wave('rx', 12_000_000, 3_000_000)],
    networkTransmit: [wave('tx', 8_000_000, 2_200_000)],
    diskUsage: [wave('disk', 18 * 1024 ** 3, 1.2 * 1024 ** 3)],
    filesystemUsageBytes: [wave('fs-used', 220 * 1024 ** 3, 8 * 1024 ** 3)],
    filesystemSizeBytes: [wave('fs-size', 500 * 1024 ** 3, 0)],
    filesystemPercent: [wave('fs-%', 44, 3)],
    volumeUsageBytes: [wave('vol', 13 * 1024 ** 3, 0.8 * 1024 ** 3)],
    volumeCapacityBytes: [wave('vol-cap', 20 * 1024 ** 3, 0)],
    volumePercent: [wave('vol-%', 62, 4)],
    restartCount: [wave('restarts', 3, 0.4)],
    replicaCount: [wave('replicas', 5, 0.2)]
  }
}

export { APPS }
