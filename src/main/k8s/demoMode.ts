import { app } from 'electron'
import type { ResourceKind } from '@shared/resourceKinds'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import type { DiscoveryResponse } from '@shared/types/discovery'
import type { ClusterMetricsSummary, MetricsRangeResponse, NodeMetricsResponse, PvcUsageResponse } from '@shared/types/metrics'
import type { NamespacePodMetricsResponse, PodDetailData, PodMetricsResponse, PodNetworkResponse } from '@shared/types/pod'
import type { PrometheusStatus } from '@shared/types/prometheus'
import type { ResourceListItem } from '@shared/types/resource'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import type { WorkloadContextInfo, WorkloadPodInfo } from '@shared/types/workload'
import { addCluster, listClusters, updateCluster } from '../persistence/clusterStore'
import { setHasSeenWelcome, setLastSeenSplashVersion } from '../persistence/appSettings'
import { getUiState, setUiState } from '../persistence/uiState'
import { isDemoMode } from '../demoUserData'
import { K8S_KIND_NAME } from './resourceRegistry'

export const DEMO_CLUSTER_ID = 'demo-aurora-prod'
export const DEMO_CONTEXT = 'aurora-prod'

const DEMO_KUBECONFIG = `apiVersion: v1
kind: Config
clusters:
  - name: aurora-prod
    cluster:
      server: https://demo.magiclens.local
contexts:
  - name: aurora-prod
    context:
      cluster: aurora-prod
      user: demo
current-context: aurora-prod
users:
  - name: demo
    user:
      token: demo
`

const RUNNING_DOT =
  '[{"ready":true,"waiting":false,"running":true,"terminated":false,"init":false}]'

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function row(
  kind: string,
  name: string,
  namespace: string,
  statusText: string,
  statusColor: string,
  columns: Record<string, string>,
  ageDays: number
): ResourceListItem {
  return {
    id: `demo-${kind}-${namespace}-${name}`,
    name,
    namespace,
    ageTimestamp: daysAgo(ageDays),
    statusText,
    statusColor,
    columns
  }
}

const DEPLOYMENTS: ResourceListItem[] = [
  row('deploy', 'storefront', 'shop', 'Available', 'green', { ready: '3/3', controlledBy: '-' }, 12),
  row('deploy', 'checkout-api', 'shop', 'Available', 'green', { ready: '2/2', controlledBy: '-' }, 12),
  row('deploy', 'payments-worker', 'payments', 'Available', 'green', { ready: '1/1', controlledBy: '-' }, 6),
  row('deploy', 'catalog-cache', 'shop', 'Available', 'green', { ready: '2/2', controlledBy: '-' }, 4),
  row('deploy', 'inventory-sync', 'shop', 'Available', 'green', { ready: '1/1', controlledBy: '-' }, 9),
  row('deploy', 'search-index', 'shop', 'Available', 'green', { ready: '2/2', controlledBy: '-' }, 8),
  row('deploy', 'notify-mailer', 'shop', 'Available', 'green', { ready: '1/1', controlledBy: '-' }, 15),
  row('deploy', 'admin-console', 'shop', 'Available', 'green', { ready: '1/1', controlledBy: '-' }, 20),
  row('deploy', 'image-resizer', 'shop', 'Progressing', 'gold', { ready: '1/2', controlledBy: '-' }, 2),
  row('deploy', 'session-broker', 'shop', 'Available', 'green', { ready: '2/2', controlledBy: '-' }, 11)
]

function podsForDeployment(name: string, namespace: string, replicas: number, ageDays: number): ResourceListItem[] {
  return Array.from({ length: replicas }, (_, i) =>
    row(
      'pod',
      `${name}-7f8d9c-${String.fromCharCode(97 + i)}${i + 2}k`,
      namespace,
      i === 1 && name === 'image-resizer' ? 'Pending' : 'Running',
      i === 1 && name === 'image-resizer' ? 'gold' : 'green',
      {
        containers: RUNNING_DOT,
        ready: i === 1 && name === 'image-resizer' ? '0/1' : '1/1',
        restarts: '0',
        controlledBy: 'ReplicaSet',
        node: `demo-pool-${(i % 3) + 1}`
      },
      ageDays
    )
  )
}

const PODS: ResourceListItem[] = DEPLOYMENTS.flatMap((d) => {
  const ready = Number((d.columns.ready ?? '1/1').split('/')[1] || 1)
  return podsForDeployment(d.name, d.namespace, ready, 4)
})

const SERVICES: ResourceListItem[] = [
  row('svc', 'storefront', 'shop', 'ClusterIP', 'blue', { type: 'ClusterIP', clusterIP: '10.40.1.10', ports: '80' }, 12),
  row('svc', 'checkout-api', 'shop', 'ClusterIP', 'blue', { type: 'ClusterIP', clusterIP: '10.40.1.11', ports: '8080' }, 12),
  row('svc', 'payments-worker', 'payments', 'ClusterIP', 'blue', { type: 'ClusterIP', clusterIP: '10.40.2.8', ports: '8080' }, 6),
  row('svc', 'catalog-cache', 'shop', 'ClusterIP', 'blue', { type: 'ClusterIP', clusterIP: '10.40.1.14', ports: '6379' }, 4)
]

const PVCS: ResourceListItem[] = [
  row('pvc', 'shop-data', 'shop', 'Bound', 'green', { capacity: '20Gi' }, 12),
  row('pvc', 'payments-wal', 'payments', 'Bound', 'green', { capacity: '50Gi' }, 12),
  row('pvc', 'catalog-idx', 'shop', 'Bound', 'green', { capacity: '8Gi' }, 4),
  row('pvc', 'redis-data', 'shop', 'Bound', 'green', { capacity: '4Gi' }, 12)
]

const CONFIGMAPS: ResourceListItem[] = [
  row('cm', 'storefront-config', 'shop', 'Active', 'default', { keys: '3' }, 12),
  row('cm', 'checkout-config', 'shop', 'Active', 'default', { keys: '2' }, 12)
]

const NODES: ResourceListItem[] = [
  row('node', 'demo-pool-1', '', 'Ready', 'green', { roles: 'control-plane', version: 'v1.31.2' }, 40),
  row('node', 'demo-pool-2', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.2' }, 40),
  row('node', 'demo-pool-3', '', 'Ready', 'green', { roles: 'worker', version: 'v1.31.2' }, 40)
]

const NAMESPACES: ResourceListItem[] = [
  row('ns', 'shop', '', 'Active', 'green', {}, 40),
  row('ns', 'payments', '', 'Active', 'green', {}, 40),
  row('ns', 'default', '', 'Active', 'green', {}, 40),
  row('ns', 'kube-system', '', 'Active', 'green', {}, 40)
]

const BY_KIND: Partial<Record<ResourceKind, ResourceListItem[]>> = {
  Deployments: DEPLOYMENTS,
  Pods: PODS,
  Services: SERVICES,
  PersistentVolumeClaims: PVCS,
  ConfigMaps: CONFIGMAPS,
  Nodes: NODES,
  Namespaces: NAMESPACES,
  ReplicaSets: DEPLOYMENTS.map((d) =>
    row('rs', `${d.name}-7f8d9c`, d.namespace, 'Available', 'green', { ready: d.columns.ready, controlledBy: `Deployment/${d.name}` }, 12)
  )
}

function inNamespace(items: ResourceListItem[], namespace: string | 'ALL'): ResourceListItem[] {
  if (namespace === 'ALL' || !namespace) return items
  return items.filter((item) => !item.namespace || item.namespace === namespace)
}

export function isDemoCluster(clusterId: string): boolean {
  return isDemoMode() && clusterId === DEMO_CLUSTER_ID
}

export function demoNamespaces(): string[] {
  return NAMESPACES.map((n) => n.name)
}

export function listDemoResources(kind: ResourceKind, namespace: string | 'ALL'): ResourceListItem[] {
  return inNamespace(BY_KIND[kind] ?? [], namespace)
}

export function getDemoManifest(kind: string, name: string, namespace: string): string {
  const k8sKind = (K8S_KIND_NAME as Record<string, string>)[kind] ?? kind
  const nsLine = namespace ? `  namespace: ${namespace}\n` : ''
  const deploy = DEPLOYMENTS.find((d) => d.name === name)
  const replicas = deploy ? (deploy.columns.ready ?? '1/1').split('/')[1] : '1'
  return `apiVersion: apps/v1
kind: ${k8sKind}
metadata:
  name: ${name}
${nsLine}  labels:
    app: ${name}
    demo: "true"
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
        - name: ${name}
          image: ghcr.io/aurora/${name}:1.4.2
          ports:
            - containerPort: 80
`
}

export function demoDiscovery(): DiscoveryResponse {
  return { groups: [], resources: [] }
}

export function demoWorkloadContext(name: string): WorkloadContextInfo {
  const deploy = DEPLOYMENTS.find((d) => d.name === name)
  const [ready, desired] = (deploy?.columns.ready ?? '1/1').split('/').map(Number)
  return {
    replicas: {
      currentReplicas: desired || 1,
      readyReplicas: ready || 0,
      kubectlResource: 'deployment',
      hasOwnerDeployment: false
    },
    containers: [{ name, image: `ghcr.io/aurora/${name}:1.4.2` }],
    paused: false,
    extensions: { argoRollouts: false, keda: false }
  }
}

export function demoWorkloadPods(name: string, namespace: string): WorkloadPodInfo[] {
  return PODS.filter((p) => p.namespace === namespace && p.name.startsWith(`${name}-`)).map((p) => ({
    name: p.name,
    containers: [name],
    ready: p.statusText === 'Running',
    status: p.statusText
  }))
}

export function demoPvcUsage(namespace: string | 'ALL'): PvcUsageResponse {
  const items = [
    { namespace: 'shop', name: 'shop-data', usedBytes: 13_421_772_800, capacityBytes: 21_474_836_480, availableBytes: 8_053_063_680, percent: 62 },
    { namespace: 'payments', name: 'payments-wal', usedBytes: 22_015_832_064, capacityBytes: 53_687_091_200, availableBytes: 31_671_259_136, percent: 41 },
    { namespace: 'shop', name: 'catalog-idx', usedBytes: 6_710_886_400, capacityBytes: 8_589_934_592, availableBytes: 1_879_048_192, percent: 78 },
    { namespace: 'shop', name: 'redis-data', usedBytes: 966_367_641, capacityBytes: 4_294_967_296, availableBytes: 3_328_599_655, percent: 22 }
  ]
  return {
    metricsAvailable: true,
    items: namespace === 'ALL' || !namespace ? items : items.filter((item) => item.namespace === namespace)
  }
}

export function demoNamespacePodMetrics(): NamespacePodMetricsResponse {
  return { metricsAvailable: false, pods: [] }
}

export function demoEmptyMetricsRange(): MetricsRangeResponse {
  return { historicalAvailable: false, prometheusAvailable: false }
}

export function demoClusterSummary(): ClusterMetricsSummary {
  return {
    metricsAvailable: true,
    totalNodes: 3,
    readyNodes: 3,
    notReadyNodes: 0,
    cpuCapacityCores: 24,
    memoryCapacityBytes: 96 * 1024 ** 3,
    cpuAllocatableCores: 22.5,
    memoryAllocatableBytes: 90 * 1024 ** 3,
    cpuUsageCores: 6.4,
    memoryUsageBytes: 41 * 1024 ** 3,
    podCapacity: 330,
    runningPods: PODS.filter((p) => p.statusText === 'Running').length,
    pendingPods: PODS.filter((p) => p.statusText === 'Pending').length,
    failedPods: 0
  }
}

export function demoNodeMetrics(): NodeMetricsResponse {
  return {
    metricsAvailable: true,
    nodes: NODES.map((node, i) => ({
      name: node.name,
      cpuCapacityCores: 8,
      memoryCapacityBytes: 32 * 1024 ** 3,
      cpuAllocatableCores: 7.5,
      memoryAllocatableBytes: 30 * 1024 ** 3,
      cpuUsageCores: [2.1, 2.8, 1.5][i],
      memoryUsageBytes: [14, 18, 9].map((gib) => gib * 1024 ** 3)[i]
    }))
  }
}

export function demoPodDetail(namespace: string, podName: string): PodDetailData {
  const item = PODS.find((p) => p.name === podName)
  const app = podName.split('-').slice(0, -2).join('-') || podName
  const running = item?.statusText !== 'Pending'
  return {
    uid: `demo-${podName}`,
    creationTimestamp: item?.ageTimestamp ?? undefined,
    phase: running ? 'Running' : 'Pending',
    statusText: item?.statusText ?? 'Running',
    statusColor: item?.statusColor ?? 'green',
    ready: item?.columns.ready ?? '1/1',
    totalRestarts: 0,
    nodeName: item?.columns.node ?? 'demo-pool-1',
    podIP: '10.42.1.18',
    hostIP: '10.0.4.12',
    qosClass: 'Burstable',
    serviceAccount: 'default',
    restartPolicy: 'Always',
    labels: { app, demo: 'true' },
    annotations: {},
    ownerReferences: [{ kind: 'ReplicaSet', name: `${app}-7f8d9c`, controller: true }],
    conditions: [{ type: 'Ready', status: running ? 'True' : 'False' }],
    nodeSelector: {},
    tolerations: [],
    affinitySummary: [],
    volumes: [],
    containers: [
      {
        name: app,
        image: `ghcr.io/aurora/${app}:1.4.2`,
        ready: running,
        restartCount: 0,
        state: running ? 'running' : 'waiting',
        ports: [{ containerPort: 8080, protocol: 'TCP' }],
        env: [],
        mounts: [],
        probes: []
      }
    ],
    initContainers: []
  }
}

export function demoPodMetrics(): PodMetricsResponse {
  return { metricsAvailable: false, containers: [], totalCpuUsageCores: 0, totalMemoryUsageBytes: 0 }
}

export function demoPodNetwork(): PodNetworkResponse {
  return { services: [] }
}

export function demoLogChunk(podName: string, containerName: string): string {
  const app = containerName || podName.split('-')[0]
  return [
    `2026-09-18T17:02:11.104Z INFO  ${app} listening on :8080`,
    `2026-09-18T17:02:11.188Z INFO  ready to serve traffic`,
    `2026-09-18T17:04:02.441Z INFO  GET /healthz 200 1ms`,
    `2026-09-18T17:08:19.012Z INFO  GET /api/v1/catalog 200 18ms`,
    `2026-09-18T17:11:44.773Z INFO  GET /api/v1/cart 200 12ms`
  ].join('\n') + '\n'
}

export function demoPrometheusStatus(): PrometheusStatus {
  return {
    available: false,
    discoveryMethod: 'none',
    lastCheckedAt: new Date().toISOString()
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function demoEvent(
  id: string,
  type: string,
  reason: string,
  message: string,
  count: number,
  firstHours: number,
  lastHours: number,
  kind: string,
  name: string,
  namespace: string
): ResourceEventItem {
  return {
    id,
    type,
    reason,
    message,
    count,
    firstTimestamp: hoursAgo(firstHours),
    lastTimestamp: hoursAgo(lastHours),
    source: 'kubelet',
    involvedKind: kind,
    involvedName: name,
    involvedNamespace: namespace
  }
}

export function demoClusterEvents(): ResourceEventItem[] {
  return [
    demoEvent('e1', 'Normal', 'Created', 'Created pod: storefront-7f8d9c-a2k', 1, 18, 9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e2', 'Normal', 'Pulled', 'Successfully pulled image ghcr.io/aurora/storefront:1.4.2', 1, 18, 17.9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e3', 'Normal', 'Started', 'Started container storefront', 1, 17.9, 17.9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e4', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set storefront-7f8d9c to 3', 1, 18.2, 18.2, 'Deployment', 'storefront', 'shop'),
    demoEvent('e5', 'Normal', 'SuccessfulCreate', 'Created service storefront', 1, 20, 20, 'Service', 'storefront', 'shop'),
    demoEvent('e6', 'Warning', 'Unhealthy', 'Readiness probe failed: Get "http://10.42.1.18:8080/ready": dial tcp timeout', 12, 8, 0.2, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e7', 'Warning', 'BackOff', 'Back-off restarting failed container image-resizer', 18, 14, 0.1, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop'),
    demoEvent('e8', 'Normal', 'Created', 'Created pod: image-resizer-7f8d9c-b3k', 1, 14.2, 6, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop'),
    demoEvent('e9', 'Normal', 'Pulled', 'Container image already present', 3, 14.1, 2, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop'),
    demoEvent('e10', 'Warning', 'Unhealthy', 'Liveness probe failed: HTTP 503', 9, 12, 0.4, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop'),
    demoEvent('e11', 'Normal', 'SuccessfulCreate', 'Created replicaset image-resizer-7f8d9c', 1, 14.3, 14.3, 'ReplicaSet', 'image-resizer-7f8d9c', 'shop'),
    demoEvent('e12', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set image-resizer-7f8d9c to 2', 1, 14.3, 14.3, 'Deployment', 'image-resizer', 'shop'),
    demoEvent('e13', 'Normal', 'Created', 'Created pod: checkout-api-7f8d9c-c4k', 1, 16, 8, 'Pod', 'checkout-api-7f8d9c-c4k', 'shop'),
    demoEvent('e14', 'Normal', 'Started', 'Started container checkout-api', 1, 15.9, 15.9, 'Pod', 'checkout-api-7f8d9c-c4k', 'shop'),
    demoEvent('e15', 'Normal', 'SuccessfulCreate', 'Created service checkout-api', 1, 16.2, 16.2, 'Service', 'checkout-api', 'shop'),
    demoEvent('e16', 'Warning', 'FailedScheduling', '0/3 nodes available: 1 Insufficient cpu', 4, 6, 5.2, 'Pod', 'payments-worker-7f8d9c-d5k', 'payments'),
    demoEvent('e17', 'Normal', 'Scheduled', 'Successfully assigned payments/payments-worker-7f8d9c-d5k to demo-pool-2', 1, 5.2, 5.2, 'Pod', 'payments-worker-7f8d9c-d5k', 'payments'),
    demoEvent('e18', 'Normal', 'Started', 'Started container payments-worker', 1, 5.1, 5.1, 'Pod', 'payments-worker-7f8d9c-d5k', 'payments'),
    demoEvent('e19', 'Normal', 'Created', 'Created pod: catalog-cache-7f8d9c-e6k', 1, 10, 10, 'Pod', 'catalog-cache-7f8d9c-e6k', 'shop'),
    demoEvent('e20', 'Normal', 'Started', 'Started container catalog-cache', 1, 9.9, 9.9, 'Pod', 'catalog-cache-7f8d9c-e6k', 'shop'),
    demoEvent('e21', 'Warning', 'Unhealthy', 'Readiness probe failed: connection refused', 6, 4, 1.5, 'Pod', 'catalog-cache-7f8d9c-e6k', 'shop'),
    demoEvent('e22', 'Normal', 'Killing', 'Stopping container catalog-cache', 1, 1.5, 1.5, 'Pod', 'catalog-cache-7f8d9c-e6k', 'shop'),
    demoEvent('e23', 'Normal', 'Created', 'Created pod: catalog-cache-7f8d9c-f7k', 1, 1.4, 1.4, 'Pod', 'catalog-cache-7f8d9c-f7k', 'shop'),
    demoEvent('e24', 'Normal', 'Started', 'Started container catalog-cache', 1, 1.3, 1.3, 'Pod', 'catalog-cache-7f8d9c-f7k', 'shop'),
    demoEvent('e25', 'Normal', 'SuccessfulCreate', 'Created PDB storefront', 1, 20, 20, 'PodDisruptionBudget', 'storefront', 'shop'),
    demoEvent('e26', 'Warning', 'FailedGetResourceMetric', 'unable to get metric cpu: no metrics returned', 5, 7, 0.8, 'HorizontalPodAutoscaler', 'storefront', 'shop'),
    demoEvent('e27', 'Normal', 'SuccessfulRescale', 'New size: 3; reason: cpu resource utilization above target', 2, 3, 3, 'HorizontalPodAutoscaler', 'storefront', 'shop'),
    demoEvent('e28', 'Normal', 'Sync', 'External sync completed', 8, 22, 0.05, 'Service', 'storefront', 'shop'),
    demoEvent('e29', 'Warning', 'Unhealthy', 'Readiness probe failed', 7, 9, 2, 'Pod', 'checkout-api-7f8d9c-c4k', 'shop'),
    demoEvent('e30', 'Normal', 'Created', 'Created replicaset storefront-7f8d9c', 1, 18.3, 18.3, 'ReplicaSet', 'storefront-7f8d9c', 'shop'),
    demoEvent('e31', 'Normal', 'Created', 'Created replicaset checkout-api-7f8d9c', 1, 16.1, 16.1, 'ReplicaSet', 'checkout-api-7f8d9c', 'shop'),
    demoEvent('e32', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set checkout-api-7f8d9c to 2', 1, 16.1, 16.1, 'Deployment', 'checkout-api', 'shop'),
    demoEvent('e33', 'Normal', 'SuccessfulCreate', 'Created service payments-worker', 1, 12, 12, 'Service', 'payments-worker', 'payments'),
    demoEvent('e34', 'Normal', 'Created', 'Created replicaset payments-worker-7f8d9c', 1, 6.1, 6.1, 'ReplicaSet', 'payments-worker-7f8d9c', 'payments'),
    demoEvent('e35', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set payments-worker-7f8d9c to 1', 1, 6.1, 6.1, 'Deployment', 'payments-worker', 'payments'),
    demoEvent('e36', 'Warning', 'FailedMount', 'Unable to attach or mount volumes: shop-data', 3, 11, 10.4, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e37', 'Normal', 'SuccessfulAttachVolume', 'AttachVolume.Attach succeeded for volume shop-data', 1, 10.4, 10.4, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e38', 'Warning', 'BackoffLimitExceeded', 'Job has reached the specified backoff limit', 1, 2.2, 2.2, 'Job', 'inventory-sync', 'shop'),
    demoEvent('e39', 'Normal', 'Completed', 'Job completed', 1, 8, 8, 'Job', 'notify-mailer', 'shop'),
    demoEvent('e40', 'Warning', 'Unhealthy', 'Startup probe failed: HTTP 000', 11, 13, 11.5, 'Pod', 'admin-console-7f8d9c-g8k', 'shop'),
    demoEvent('e41', 'Normal', 'Started', 'Started container admin-console', 1, 11.4, 11.4, 'Pod', 'admin-console-7f8d9c-g8k', 'shop'),
    demoEvent('e42', 'Normal', 'Created', 'Created pod: admin-console-7f8d9c-g8k', 1, 13.1, 13.1, 'Pod', 'admin-console-7f8d9c-g8k', 'shop'),
    demoEvent('e43', 'Normal', 'SuccessfulCreate', 'Created replicaset admin-console-7f8d9c', 1, 13.2, 13.2, 'ReplicaSet', 'admin-console-7f8d9c', 'shop'),
    demoEvent('e44', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set admin-console-7f8d9c to 1', 1, 13.2, 13.2, 'Deployment', 'admin-console', 'shop')
  ]
}

export function seedDemoWorkspace(): void {
  if (!isDemoMode()) return
  setHasSeenWelcome(true)
  setLastSeenSplashVersion(app.getVersion())
  if (!listClusters().some((c) => c.id === DEMO_CLUSTER_ID)) {
    const entry: PersistedClusterEntry = {
      id: DEMO_CLUSTER_ID,
      customName: 'aurora-prod',
      contextName: DEMO_CONTEXT,
      source: { type: 'raw', yaml: DEMO_KUBECONFIG },
      endpoint: 'https://demo.magiclens.local',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Deployments'
    }
    addCluster(entry, { force: true })
  } else {
    const existing = listClusters().find((c) => c.id === DEMO_CLUSTER_ID)
    if (existing) {
      updateCluster({
        ...existing,
        customName: 'aurora-prod',
        selectedNamespace: 'ALL',
        selectedResourceKind: 'Deployments'
      })
    }
  }
  const ui = getUiState()
  setUiState({
    ...ui,
    openedTabs: [DEMO_CLUSTER_ID],
    activeClusterId: DEMO_CLUSTER_ID,
    activeView: 'tabs'
  })
}
