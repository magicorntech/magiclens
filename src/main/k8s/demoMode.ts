import { app } from 'electron'
import type { ResourceKind } from '@shared/resourceKinds'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import type { DiscoveryResponse, CustomResourceKind, DynamicResourceItem } from '@shared/types/discovery'
import type {
  ClusterMetricsSummary,
  MetricsRangeResponse,
  NodeMetricsResponse,
  PvcUsageResponse
} from '@shared/types/metrics'
import type { NamespacePodMetricsResponse, PodDetailData, PodMetricsResponse, PodNetworkResponse } from '@shared/types/pod'
import type { PrometheusStatus } from '@shared/types/prometheus'
import type { ResourceListItem } from '@shared/types/resource'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import type { HelmChartSummary } from '@shared/types/helm'
import type { TopologyGraphResponse } from '@shared/types/topology'
import type { VisualizerGraphResponse } from '@shared/types/visualizer'
import type { WorkloadContextInfo, WorkloadPodInfo } from '@shared/types/workload'
import { addCluster, listClusters, updateCluster } from '../persistence/clusterStore'
import { saveClusterGroups } from '../persistence/clusterGroups'
import { setHasSeenWelcome, setLastSeenSplashVersion } from '../persistence/appSettings'
import { getUiState, setUiState } from '../persistence/uiState'
import { isDemoMode } from '../demoUserData'
import { K8S_KIND_NAME } from './resourceRegistry'
import {
  APPS,
  BY_KIND,
  DEMO_CLUSTER_IDS,
  DEMO_EMPTY_CLUSTER_IDS,
  DEPLOYMENTS,
  hasDemoCatalog as clusterHasDemoCatalog,
  NAMESPACES,
  NODES,
  PODS,
  PVCS,
  daysAgo,
  demoCustomResourceKinds,
  demoDiscovery as catalogDiscovery,
  demoDynamicResources,
  demoHelmCharts as catalogHelmCharts,
  demoMetricsRange as catalogMetricsRange,
  demoTopologyGraph as catalogTopologyGraph,
  demoVisualizerGraph as catalogVisualizerGraph,
  hoursAgo
} from './demoCatalog'

export const DEMO_CLUSTER_ID: string = DEMO_CLUSTER_IDS.prod
export const DEMO_CONTEXT = 'aurora-prod'

export function demoHelmCharts(clusterId = DEMO_CLUSTER_ID): HelmChartSummary[] {
  if (!hasDemoCatalog(clusterId)) return []
  return catalogHelmCharts()
}

function kubeconfig(context: string, server: string): string {
  return `apiVersion: v1
kind: Config
clusters:
  - name: ${context}
    cluster:
      server: ${server}
contexts:
  - name: ${context}
    context:
      cluster: ${context}
      user: demo
current-context: ${context}
users:
  - name: demo
    user:
      token: demo
`
}

function inNamespace(items: ResourceListItem[], namespace: string | 'ALL'): ResourceListItem[] {
  if (namespace === 'ALL' || !namespace) return items
  return items.filter((item) => !item.namespace || item.namespace === namespace)
}

export function isDemoCluster(clusterId: string): boolean {
  return isDemoMode() && clusterId.startsWith('demo-')
}

export function hasDemoCatalog(clusterId: string): boolean {
  return clusterHasDemoCatalog(clusterId)
}

export function demoNamespaces(clusterId = DEMO_CLUSTER_ID): string[] {
  if (!hasDemoCatalog(clusterId)) return ['default']
  return NAMESPACES.map((n) => n.name)
}

export function listDemoResources(kind: ResourceKind, namespace: string | 'ALL', clusterId = DEMO_CLUSTER_ID): ResourceListItem[] {
  if (!hasDemoCatalog(clusterId)) return []
  return inNamespace(BY_KIND[kind] ?? [], namespace)
}

export function getDemoManifest(kind: string, name: string, namespace: string): string {
  const k8sKind = (K8S_KIND_NAME as Record<string, string>)[kind] ?? kind
  const nsLine = namespace ? `  namespace: ${namespace}\n` : ''
  const deploy = DEPLOYMENTS.find((d) => d.name === name)
  const replicas = deploy ? (deploy.columns.ready ?? '1/1').split('/')[1] : '1'
  const app = APPS.find((a) => a.name === name)
  return `apiVersion: apps/v1
kind: ${k8sKind}
metadata:
  name: ${name}
${nsLine}  labels:
    app: ${name}
    app.kubernetes.io/instance: ${app?.instance ?? name}
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
          image: ${app?.image ?? `ghcr.io/aurora/${name}:1.4.2`}
          ports:
            - containerPort: ${app?.port ?? 80}
`
}

export function demoDiscovery(clusterId = DEMO_CLUSTER_ID): DiscoveryResponse {
  if (!hasDemoCatalog(clusterId)) return { groups: [], resources: [] }
  return catalogDiscovery()
}

export function demoCrdKinds(clusterId = DEMO_CLUSTER_ID): CustomResourceKind[] {
  if (!hasDemoCatalog(clusterId)) return []
  return demoCustomResourceKinds()
}

export function demoDynamicList(kind: string, namespace: string | 'ALL', clusterId = DEMO_CLUSTER_ID): DynamicResourceItem[] {
  if (!hasDemoCatalog(clusterId)) return []
  return demoDynamicResources(kind, namespace)
}

export function demoVisualizerGraph(namespace: string | 'ALL', clusterId = DEMO_CLUSTER_ID): VisualizerGraphResponse {
  if (!hasDemoCatalog(clusterId)) return { nodes: [], edges: [] }
  return catalogVisualizerGraph(namespace)
}

export function demoTopologyGraph(namespace: string | 'ALL', clusterId = DEMO_CLUSTER_ID): TopologyGraphResponse {
  if (!hasDemoCatalog(clusterId)) return { nodes: [], edges: [], applications: [] }
  return catalogTopologyGraph(namespace)
}

export { demoSecurityReport } from './demoSecurity'

export function demoWorkloadContext(name: string): WorkloadContextInfo {
  const deploy = DEPLOYMENTS.find((d) => d.name === name)
  const app = APPS.find((a) => a.name === name)
  const [ready, desired] = (deploy?.columns.ready ?? `${app?.replicas ?? 1}/${app?.replicas ?? 1}`).split('/').map(Number)
  return {
    replicas: {
      currentReplicas: desired || 1,
      readyReplicas: ready || 0,
      kubectlResource: app?.kind === 'StatefulSet' ? 'statefulset' : 'deployment',
      hasOwnerDeployment: false
    },
    containers: [{ name, image: app?.image ?? `ghcr.io/aurora/${name}:1.4.2` }],
    paused: false,
    extensions: { argoRollouts: name === 'storefront', keda: name === 'checkout-api' }
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

export function demoPvcUsage(namespace: string | 'ALL', clusterId = DEMO_CLUSTER_ID): PvcUsageResponse {
  if (!hasDemoCatalog(clusterId)) return { metricsAvailable: true, items: [] }
  const items = [
    { namespace: 'shop', name: 'shop-data', usedBytes: 13_421_772_800, capacityBytes: 21_474_836_480, availableBytes: 8_053_063_680, percent: 62 },
    { namespace: 'shop', name: 'catalog-idx', usedBytes: 6_710_886_400, capacityBytes: 8_589_934_592, availableBytes: 1_879_048_192, percent: 78 },
    { namespace: 'payments', name: 'payments-wal', usedBytes: 22_015_832_064, capacityBytes: 53_687_091_200, availableBytes: 31_671_259_136, percent: 41 },
    { namespace: 'data', name: 'postgres-data-postgres-0', usedBytes: 41_943_040_000, capacityBytes: 107_374_182_400, availableBytes: 65_431_142_400, percent: 39 },
    { namespace: 'data', name: 'postgres-data-postgres-1', usedBytes: 38_654_705_664, capacityBytes: 107_374_182_400, availableBytes: 68_719_476_736, percent: 36 },
    { namespace: 'data', name: 'postgres-data-postgres-2', usedBytes: 44_080_103_424, capacityBytes: 107_374_182_400, availableBytes: 63_294_078_976, percent: 41 },
    { namespace: 'data', name: 'redis-data-redis-0', usedBytes: 2_147_483_648, capacityBytes: 8_589_934_592, availableBytes: 6_442_450_944, percent: 25 },
    { namespace: 'logging', name: 'loki-data-loki-0', usedBytes: 92_680_192_000, capacityBytes: 214_748_364_800, availableBytes: 122_068_172_800, percent: 43 },
    { namespace: 'monitoring', name: 'prometheus-data', usedBytes: 51_539_607_552, capacityBytes: 85_899_345_920, availableBytes: 34_359_738_368, percent: 60 }
  ]
  return {
    metricsAvailable: true,
    items: namespace === 'ALL' || !namespace ? items : items.filter((item) => item.namespace === namespace)
  }
}

export function demoNamespacePodMetrics(clusterId = DEMO_CLUSTER_ID): NamespacePodMetricsResponse {
  if (!hasDemoCatalog(clusterId)) return { metricsAvailable: true, pods: [] }
  return {
    metricsAvailable: true,
    pods: PODS.filter((p) => p.statusText === 'Running').map((p, i) => ({
      podName: p.name,
      namespace: p.namespace,
      cpuUsageCores: 0.04 + ((i * 17) % 80) / 100,
      memoryUsageBytes: (80 + ((i * 37) % 420)) * 1024 * 1024
    }))
  }
}

export function demoEmptyMetricsRange(clusterId = DEMO_CLUSTER_ID): MetricsRangeResponse {
  if (!hasDemoCatalog(clusterId)) {
    return { historicalAvailable: false, prometheusAvailable: false }
  }
  return catalogMetricsRange()
}

export function demoMetricsRange(clusterId = DEMO_CLUSTER_ID): MetricsRangeResponse {
  return demoEmptyMetricsRange(clusterId)
}

export function demoClusterSummary(clusterId = DEMO_CLUSTER_ID): ClusterMetricsSummary {
  if (!hasDemoCatalog(clusterId)) {
    return {
      metricsAvailable: true,
      totalNodes: 0,
      readyNodes: 0,
      notReadyNodes: 0,
      cpuCapacityCores: 0,
      memoryCapacityBytes: 0,
      cpuAllocatableCores: 0,
      memoryAllocatableBytes: 0,
      cpuUsageCores: 0,
      memoryUsageBytes: 0,
      podCapacity: 0,
      runningPods: 0,
      pendingPods: 0,
      failedPods: 0
    }
  }
  return {
    metricsAvailable: true,
    totalNodes: NODES.length,
    readyNodes: NODES.filter((n) => n.statusText === 'Ready').length,
    notReadyNodes: NODES.filter((n) => n.statusText !== 'Ready').length,
    cpuCapacityCores: 56,
    memoryCapacityBytes: 224 * 1024 ** 3,
    cpuAllocatableCores: 52,
    memoryAllocatableBytes: 210 * 1024 ** 3,
    cpuUsageCores: 18.6,
    memoryUsageBytes: 97 * 1024 ** 3,
    podCapacity: 770,
    runningPods: PODS.filter((p) => p.statusText === 'Running').length,
    pendingPods: PODS.filter((p) => p.statusText === 'Pending').length,
    failedPods: 0
  }
}

export function demoNodeMetrics(clusterId = DEMO_CLUSTER_ID): NodeMetricsResponse {
  if (!hasDemoCatalog(clusterId)) return { metricsAvailable: true, nodes: [] }
  const cpu = [2.1, 1.8, 4.4, 3.9, 2.6, 3.1, 0.2]
  const mem = [18, 16, 28, 24, 19, 21, 4]
  return {
    metricsAvailable: true,
    nodes: NODES.map((node, i) => ({
      name: node.name,
      cpuCapacityCores: node.columns.roles === 'control-plane' ? 4 : 8,
      memoryCapacityBytes: (node.columns.roles === 'control-plane' ? 16 : 32) * 1024 ** 3,
      cpuAllocatableCores: node.columns.roles === 'control-plane' ? 3.5 : 7.5,
      memoryAllocatableBytes: (node.columns.roles === 'control-plane' ? 14 : 30) * 1024 ** 3,
      cpuUsageCores: cpu[i],
      memoryUsageBytes: mem[i] * 1024 ** 3
    }))
  }
}

export function demoPodDetail(namespace: string, podName: string): PodDetailData {
  const item = PODS.find((p) => p.name === podName)
  const app = APPS.find((a) => podName.startsWith(`${a.name}-`))
  const running = item?.statusText !== 'Pending'
  const appName = app?.name ?? podName.split('-')[0]
  return {
    uid: `demo-${podName}`,
    creationTimestamp: item?.ageTimestamp ?? daysAgo(4),
    phase: running ? 'Running' : 'Pending',
    statusText: item?.statusText ?? 'Running',
    statusColor: item?.statusColor ?? 'green',
    ready: item?.columns.ready ?? '1/1',
    totalRestarts: Number(item?.columns.restarts ?? 0),
    nodeName: item?.columns.node && item.columns.node !== '-' ? item.columns.node : 'aurora-pool-a-1',
    podIP: '10.42.3.18',
    hostIP: '10.0.12.40',
    qosClass: 'Burstable',
    serviceAccount: appName,
    restartPolicy: 'Always',
    labels: { app: appName, 'app.kubernetes.io/instance': app?.instance ?? appName, demo: 'true' },
    annotations: {},
    ownerReferences: [{ kind: app?.kind ?? 'ReplicaSet', name: `${appName}-7f8d9c`, controller: true }],
    conditions: [{ type: 'Ready', status: running ? 'True' : 'False' }],
    nodeSelector: {},
    tolerations: [],
    affinitySummary: [],
    volumes: [],
    containers: [
      {
        name: appName,
        image: app?.image ?? `ghcr.io/aurora/${appName}:1.4.2`,
        ready: running,
        restartCount: Number(item?.columns.restarts ?? 0),
        state: running ? 'running' : 'waiting',
        ports: [{ containerPort: app?.port ?? 8080, protocol: 'TCP' }],
        env: [],
        mounts: [],
        probes: []
      }
    ],
    initContainers: []
  }
}

export function demoPodMetrics(): PodMetricsResponse {
  return {
    metricsAvailable: true,
    containers: [{ name: 'app', cpuUsageCores: 0.12, memoryUsageBytes: 180 * 1024 * 1024 }],
    totalCpuUsageCores: 0.12,
    totalMemoryUsageBytes: 180 * 1024 * 1024
  }
}

export function demoPodNetwork(): PodNetworkResponse {
  return {
    services: [
      {
        name: 'storefront',
        type: 'LoadBalancer',
        clusterIP: '10.40.1.10',
        ports: [{ name: 'http', port: 80, targetPort: '80', protocol: 'TCP' }]
      }
    ]
  }
}

export function demoLogChunk(podName: string, containerName: string): string {
  const app = containerName || podName.split('-')[0]
  return [
    `2026-09-18T21:02:11.104Z INFO  ${app} listening`,
    `2026-09-18T21:02:11.188Z INFO  ready to serve traffic`,
    `2026-09-18T21:04:02.441Z INFO  GET /healthz 200 1ms`,
    `2026-09-18T21:08:19.012Z INFO  GET /api/v1/catalog 200 18ms`,
    `2026-09-18T21:11:44.773Z INFO  GET /api/v1/cart 200 12ms`,
    `2026-09-18T21:16:02.110Z INFO  GET /metrics 200 3ms`
  ].join('\n') + '\n'
}

export function demoPrometheusStatus(clusterId = DEMO_CLUSTER_ID): PrometheusStatus {
  if (!hasDemoCatalog(clusterId)) {
    return { available: false, discoveryMethod: 'none', lastCheckedAt: new Date().toISOString() }
  }
  return {
    available: true,
    discoveryMethod: 'auto',
    baseUrl: '/api/v1/namespaces/monitoring/services/prometheus:9090/proxy',
    namespace: 'monitoring',
    serviceName: 'prometheus',
    servicePort: 9090,
    lastCheckedAt: new Date().toISOString()
  }
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

export function demoClusterEvents(clusterId = DEMO_CLUSTER_ID): ResourceEventItem[] {
  if (!hasDemoCatalog(clusterId)) return []
  return [
    demoEvent('e1', 'Normal', 'Created', 'Created pod: storefront-7f8d9c-a2k', 1, 18, 9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e2', 'Normal', 'Pulled', 'Successfully pulled image nginx:1.27-alpine', 1, 18, 17.9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e3', 'Normal', 'Started', 'Started container storefront', 1, 17.9, 17.9, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e4', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set storefront-7f8d9c to 5', 1, 18.2, 18.2, 'Deployment', 'storefront', 'shop'),
    demoEvent('e5', 'Warning', 'Unhealthy', 'Readiness probe failed: dial tcp timeout', 12, 8, 0.2, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e6', 'Warning', 'BackOff', 'Back-off restarting failed container image-resizer', 18, 14, 0.1, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop'),
    demoEvent('e7', 'Warning', 'NodeNotReady', 'Node aurora-pool-b-2 is NotReady', 3, 2, 0.05, 'Node', 'aurora-pool-b-2', ''),
    demoEvent('e8', 'Warning', 'FailedScheduling', '0/7 nodes available: 1 node(s) not ready', 4, 6, 0.4, 'Pod', 'image-resizer-7f8d9c-c4k', 'shop'),
    demoEvent('e9', 'Normal', 'SuccessfulRescale', 'New size: 5; reason: cpu resource utilization above target', 2, 3, 3, 'HorizontalPodAutoscaler', 'storefront', 'shop'),
    demoEvent('e10', 'Normal', 'Sync', 'Argo CD sync succeeded for storefront', 8, 22, 0.05, 'Application', 'storefront', 'argocd'),
    demoEvent('e11', 'Warning', 'FailedGetResourceMetric', 'unable to get metric cpu: briefly missing', 5, 7, 0.8, 'HorizontalPodAutoscaler', 'checkout-api', 'shop'),
    demoEvent('e12', 'Normal', 'Scheduled', 'Successfully assigned shop/catalog-api-7f8d9c-d5k to aurora-pool-a-2', 1, 5.2, 5.2, 'Pod', 'catalog-api-7f8d9c-d5k', 'shop'),
    demoEvent('e13', 'Normal', 'SuccessfulAttachVolume', 'AttachVolume.Attach succeeded for volume shop-data', 1, 10.4, 10.4, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e14', 'Warning', 'FailedMount', 'Unable to attach or mount volumes: shop-data', 3, 11, 10.4, 'Pod', 'storefront-7f8d9c-a2k', 'shop'),
    demoEvent('e15', 'Normal', 'Completed', 'Job inventory-backfill completed', 1, 8, 8, 'Job', 'inventory-backfill', 'shop'),
    demoEvent('e16', 'Warning', 'BackoffLimitExceeded', 'Job image-warmup has reached the specified backoff limit', 1, 2.2, 2.2, 'Job', 'image-warmup', 'shop'),
    demoEvent('e17', 'Normal', 'Started', 'Started container prometheus', 1, 30, 30, 'Pod', 'prometheus-0', 'monitoring'),
    demoEvent('e18', 'Normal', 'SuccessfulCreate', 'Created service grafana', 1, 30, 30, 'Service', 'grafana', 'monitoring'),
    demoEvent('e19', 'Normal', 'ScalingReplicaSet', 'Scaled up replica set payments-api-7f8d9c to 3', 1, 13, 13, 'Deployment', 'payments-api', 'payments'),
    demoEvent('e20', 'Warning', 'Unhealthy', 'Liveness probe failed: HTTP 503', 9, 12, 0.4, 'Pod', 'image-resizer-7f8d9c-b3k', 'shop')
  ]
}

function upsertDemoCluster(entry: PersistedClusterEntry): void {
  const existing = listClusters().find((c) => c.id === entry.id)
  if (!existing) {
    addCluster(entry, { force: true })
    return
  }
  updateCluster({ ...existing, ...entry, source: entry.source })
}

export function seedDemoWorkspace(): void {
  if (!isDemoMode()) return
  setHasSeenWelcome(true)
  setLastSeenSplashVersion(app.getVersion())

  const clusters: PersistedClusterEntry[] = [
    {
      id: DEMO_CLUSTER_IDS.prod,
      customName: 'aurora-prod',
      contextName: 'aurora-prod',
      source: { type: 'raw', yaml: kubeconfig('aurora-prod', 'https://A1B2C3D4.gr7.eu-west-1.eks.amazonaws.com') },
      endpoint: 'https://A1B2C3D4.gr7.eu-west-1.eks.amazonaws.com',
      isFavorite: true,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Nodes',
      environment: 'production'
    },
    {
      id: DEMO_CLUSTER_IDS.staging,
      customName: 'aurora-staging',
      contextName: 'gke_aurora-staging',
      source: { type: 'raw', yaml: kubeconfig('gke_aurora-staging', 'https://container.googleapis.com/v1/projects/aurora/locations/europe-west4/clusters/staging') },
      endpoint: 'https://container.googleapis.com/v1/projects/aurora/locations/europe-west4/clusters/staging',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Deployments',
      environment: 'staging'
    },
    {
      id: DEMO_CLUSTER_IDS.test,
      customName: 'aurora-test',
      contextName: 'aurora-test',
      source: { type: 'raw', yaml: kubeconfig('aurora-test', 'https://aurora-test-a1b2c3d4.hcp.westeurope.azmk8s.io') },
      endpoint: 'https://aurora-test-a1b2c3d4.hcp.westeurope.azmk8s.io',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Pods',
      environment: 'test'
    },
    {
      id: DEMO_EMPTY_CLUSTER_IDS.platform,
      customName: 'platform-prod',
      contextName: 'gke_platform-prod',
      source: { type: 'raw', yaml: kubeconfig('gke_platform-prod', 'https://container.googleapis.com/v1/projects/aurora/locations/europe-west1/clusters/platform') },
      endpoint: 'https://container.googleapis.com/v1/projects/aurora/locations/europe-west1/clusters/platform',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Nodes',
      environment: 'production'
    },
    {
      id: DEMO_EMPTY_CLUSTER_IDS.payments,
      customName: 'payments-prod',
      contextName: 'payments-prod',
      source: { type: 'raw', yaml: kubeconfig('payments-prod', 'https://payments-a1b2c3d4.hcp.westeurope.azmk8s.io') },
      endpoint: 'https://payments-a1b2c3d4.hcp.westeurope.azmk8s.io',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Deployments',
      environment: 'production'
    },
    {
      id: DEMO_EMPTY_CLUSTER_IDS.edgeEu,
      customName: 'edge-eu',
      contextName: 'edge-eu',
      source: { type: 'raw', yaml: kubeconfig('edge-eu', 'https://E1F2G3H4.gr7.eu-central-1.eks.amazonaws.com') },
      endpoint: 'https://E1F2G3H4.gr7.eu-central-1.eks.amazonaws.com',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Nodes',
      environment: 'production'
    },
    {
      id: DEMO_EMPTY_CLUSTER_IDS.edgeUs,
      customName: 'edge-us',
      contextName: 'edge-us',
      source: { type: 'raw', yaml: kubeconfig('edge-us', 'https://I5J6K7L8.gr7.us-east-1.eks.amazonaws.com') },
      endpoint: 'https://I5J6K7L8.gr7.us-east-1.eks.amazonaws.com',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Nodes',
      environment: 'production'
    },
    {
      id: DEMO_EMPTY_CLUSTER_IDS.obs,
      customName: 'obs-central',
      contextName: 'obs-central',
      source: { type: 'raw', yaml: kubeconfig('obs-central', 'https://obs.cce.myhuaweicloud.com') },
      endpoint: 'https://obs.cce.myhuaweicloud.com',
      isFavorite: false,
      selectedNamespace: 'ALL',
      selectedResourceKind: 'Nodes',
      environment: 'production'
    }
  ]
  for (const cluster of clusters) upsertDemoCluster(cluster)

  saveClusterGroups([
    {
      id: 'demo-ws-aurora',
      name: 'Aurora',
      clusterIds: [DEMO_CLUSTER_IDS.prod, DEMO_CLUSTER_IDS.staging, DEMO_CLUSTER_IDS.test],
      collapsed: false,
      accent: 'amber'
    },
    {
      id: 'demo-ws-platform',
      name: 'Platform',
      clusterIds: [DEMO_EMPTY_CLUSTER_IDS.platform],
      collapsed: false,
      accent: 'purple'
    },
    {
      id: 'demo-ws-payments',
      name: 'Payments',
      clusterIds: [DEMO_EMPTY_CLUSTER_IDS.payments],
      collapsed: false,
      accent: 'pink'
    },
    {
      id: 'demo-ws-edge-eu',
      name: 'Edge EU',
      clusterIds: [DEMO_EMPTY_CLUSTER_IDS.edgeEu],
      collapsed: false,
      accent: 'teal'
    },
    {
      id: 'demo-ws-edge-us',
      name: 'Edge US',
      clusterIds: [DEMO_EMPTY_CLUSTER_IDS.edgeUs],
      collapsed: false,
      accent: 'blue'
    },
    {
      id: 'demo-ws-obs',
      name: 'Observability',
      clusterIds: [DEMO_EMPTY_CLUSTER_IDS.obs],
      collapsed: false,
      accent: 'green'
    }
  ])

  const ui = getUiState()
  setUiState({
    ...ui,
    openedTabs: [DEMO_CLUSTER_IDS.prod, DEMO_CLUSTER_IDS.staging, DEMO_CLUSTER_IDS.test],
    activeClusterId: DEMO_CLUSTER_IDS.prod,
    activeView: 'tabs'
  })
}
