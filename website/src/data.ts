export type PageKey =
  | 'nodes'
  | 'visualizer'
  | 'topology'
  | 'pods'
  | 'deployments'
  | 'helm'
  | 'storage'
  | 'timeline'
  | 'logs'
  | 'ingress'
  | 'argocd'
  | 'security'
  | 'ai'

export interface Cluster {
  id: string
  name: string
  letter: string
  accent: string
  endpoint: string
  provider?: 'aws' | 'gcp' | 'azure' | 'local'
}

export const CLUSTERS: Cluster[] = [
  { id: 'prod', name: 'aurora-prod', letter: 'A', accent: '#e84d5c', endpoint: 'https://demo.magiclens.local', provider: 'local' },
  { id: 'staging', name: 'aurora-staging', letter: 'A', accent: '#4285f4', endpoint: 'https://gke.aurora.demo', provider: 'gcp' },
  { id: 'test', name: 'aurora-test', letter: 'A', accent: '#64748b', endpoint: 'https://demo.magiclens.local', provider: 'local' }
]

export interface Workload {
  name: string
  ns: string
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet'
  replicas: number
  ready: number
  image: string
  icon: string
  port: number
  ingress?: boolean
}

export const WORKLOADS: Workload[] = [
  { name: 'storefront', ns: 'shop', kind: 'Deployment', replicas: 5, ready: 5, image: 'nginx:1.27', icon: 'nginx', port: 80, ingress: true },
  { name: 'checkout-api', ns: 'shop', kind: 'Deployment', replicas: 3, ready: 3, image: 'golang:1.23', icon: 'go', port: 8080 },
  { name: 'catalog-api', ns: 'shop', kind: 'Deployment', replicas: 3, ready: 3, image: 'python:3.12', icon: 'python', port: 8000 },
  { name: 'search-index', ns: 'shop', kind: 'Deployment', replicas: 2, ready: 2, image: 'elasticsearch:8.15', icon: 'elasticsearch', port: 9200 },
  { name: 'image-resizer', ns: 'shop', kind: 'Deployment', replicas: 2, ready: 1, image: 'image-resizer:1.4', icon: 'docker', port: 8080 },
  { name: 'payments-api', ns: 'payments', kind: 'Deployment', replicas: 3, ready: 3, image: 'eclipse-temurin:21', icon: 'java', port: 8080 },
  { name: 'payments-worker', ns: 'payments', kind: 'Deployment', replicas: 2, ready: 2, image: 'eclipse-temurin:21', icon: 'java', port: 8080 },
  { name: 'fraud-engine', ns: 'payments', kind: 'Deployment', replicas: 2, ready: 2, image: 'python:3.12', icon: 'python', port: 8090 },
  { name: 'postgres', ns: 'data', kind: 'StatefulSet', replicas: 3, ready: 3, image: 'postgres:16', icon: 'postgresql', port: 5432 },
  { name: 'redis', ns: 'data', kind: 'StatefulSet', replicas: 3, ready: 3, image: 'redis:7.4', icon: 'redis', port: 6379 },
  { name: 'rabbitmq', ns: 'data', kind: 'StatefulSet', replicas: 3, ready: 3, image: 'rabbitmq:3.13', icon: 'rabbitmq', port: 5672 },
  { name: 'argocd-server', ns: 'argocd', kind: 'Deployment', replicas: 2, ready: 2, image: 'argocd:v2.14', icon: 'argocd', port: 8080, ingress: true },
  { name: 'grafana', ns: 'monitoring', kind: 'Deployment', replicas: 1, ready: 1, image: 'grafana:11.5', icon: 'grafana', port: 3000, ingress: true },
  { name: 'prometheus', ns: 'monitoring', kind: 'Deployment', replicas: 2, ready: 2, image: 'prometheus:v2.55', icon: 'prometheus', port: 9090 }
]

export interface PodRow {
  name: string
  ns: string
  status: 'Running' | 'Pending'
  ready: string
  restarts: number
  node: string
  age: string
  image: string
  owner: string
  cpu: string
  memory: string
  qos: string
}

const NODE_NAMES = ['aurora-pool-a-1', 'aurora-pool-a-2', 'aurora-pool-b-1', 'aurora-cp-1']

export const PODS: PodRow[] = WORKLOADS.flatMap((w) =>
  Array.from({ length: w.replicas }, (_, i) => {
    const pending = i >= w.ready
    return {
      name: w.kind === 'StatefulSet' ? `${w.name}-${i}` : `${w.name}-7f8d9c-${i + 2}k`,
      ns: w.ns,
      status: pending ? 'Pending' : 'Running',
      ready: pending ? '0/1' : '1/1',
      restarts: pending ? 0 : (i * 2) % 5,
      node: pending ? '—' : NODE_NAMES[i % NODE_NAMES.length],
      age: `${Math.max(1, 18 - i)}d`,
      image: w.image,
      owner: `${w.kind}/${w.name}`,
      cpu: pending ? '—' : `${(0.04 + i * 0.05).toFixed(2)}`,
      memory: pending ? '—' : `${(48 + i * 18).toFixed(0)}.0 MiB`,
      qos: 'Burstable'
    }
  })
)

export interface NodeRow {
  name: string
  role: 'worker' | 'control-plane'
  status: 'Ready' | 'NotReady'
  version: string
  cpu: string
  memory: string
  pods: string
  age: string
}

export const NODES: NodeRow[] = [
  { name: 'aurora-pool-a-1', role: 'worker', status: 'Ready', version: 'v1.31.2', cpu: '4.4 / 8', memory: '28.0 / 32 GiB', pods: '18 / 110', age: '48d' },
  { name: 'aurora-pool-a-2', role: 'worker', status: 'Ready', version: 'v1.31.2', cpu: '3.1 / 8', memory: '19.2 / 32 GiB', pods: '14 / 110', age: '48d' },
  { name: 'aurora-pool-b-1', role: 'worker', status: 'Ready', version: 'v1.31.2', cpu: '2.8 / 8', memory: '16.4 / 32 GiB', pods: '12 / 110', age: '41d' },
  { name: 'aurora-pool-b-2', role: 'worker', status: 'NotReady', version: 'v1.31.2', cpu: '—', memory: '—', pods: '0 / 110', age: '12d' },
  { name: 'aurora-pool-c-1', role: 'worker', status: 'Ready', version: 'v1.31.1', cpu: '1.9 / 8', memory: '11.0 / 32 GiB', pods: '9 / 110', age: '33d' },
  { name: 'aurora-cp-1', role: 'control-plane', status: 'Ready', version: 'v1.31.2', cpu: '0.9 / 4', memory: '4.2 / 16 GiB', pods: '8 / 110', age: '62d' },
  { name: 'aurora-cp-2', role: 'control-plane', status: 'Ready', version: 'v1.31.2', cpu: '0.7 / 4', memory: '3.8 / 16 GiB', pods: '7 / 110', age: '6d' }
]

export interface HelmChart {
  name: string
  version: string
  repo: string
  desc: string
  icon: string
}

export const HELM_CHARTS: HelmChart[] = [
  { name: 'kube-prometheus-stack', version: 'v91.4.1', repo: 'prometheus-community', desc: 'Prometheus, Grafana, Alertmanager.', icon: 'prometheus' },
  { name: 'cert-manager', version: 'v1.17.1', repo: 'jetstack', desc: 'TLS certificates for Kubernetes.', icon: 'docker' },
  { name: 'argo-cd', version: 'v7.8.2', repo: 'argo', desc: 'Declarative GitOps continuous delivery.', icon: 'argocd' },
  { name: 'ingress-nginx', version: 'v4.12.0', repo: 'ingress-nginx', desc: 'NGINX Ingress Controller.', icon: 'nginx' },
  { name: 'redis', version: 'v20.6.3', repo: 'bitnami', desc: 'Redis® in-memory data store.', icon: 'redis' },
  { name: 'postgresql', version: 'v16.4.1', repo: 'bitnami', desc: 'PostgreSQL object-relational database.', icon: 'postgresql' }
]

export interface HelmRelease {
  name: string
  ns: string
  chart: string
  revision: number
  status: 'deployed' | 'failed'
  updated: string
}

export const HELM_RELEASES: HelmRelease[] = [
  { name: 'kube-prometheus-stack', ns: 'monitoring', chart: 'kube-prometheus-stack-91.4.1', revision: 4, status: 'deployed', updated: '2d ago' },
  { name: 'argo-cd', ns: 'argocd', chart: 'argo-cd-7.8.2', revision: 2, status: 'deployed', updated: '5d ago' },
  { name: 'ingress-nginx', ns: 'ingress-nginx', chart: 'ingress-nginx-4.12.0', revision: 6, status: 'deployed', updated: '12d ago' },
  { name: 'shop-postgres', ns: 'data', chart: 'postgresql-16.4.1', revision: 1, status: 'deployed', updated: '18d ago' }
]

export interface PvcRow {
  name: string
  ns: string
  status: 'Bound' | 'Pending'
  capacity: string
  used: string
  percent: number
  storageClass: string
  age: string
}

export const PVCS: PvcRow[] = [
  { name: 'postgres-data-0', ns: 'data', status: 'Bound', capacity: '100 GiB', used: '42.1 GiB', percent: 42, storageClass: 'ssd-csi', age: '48d' },
  { name: 'postgres-data-1', ns: 'data', status: 'Bound', capacity: '100 GiB', used: '39.8 GiB', percent: 40, storageClass: 'ssd-csi', age: '48d' },
  { name: 'redis-data-0', ns: 'data', status: 'Bound', capacity: '20 GiB', used: '4.2 GiB', percent: 21, storageClass: 'ssd-csi', age: '41d' },
  { name: 'catalog-idx', ns: 'shop', status: 'Bound', capacity: '50 GiB', used: '39.0 GiB', percent: 78, storageClass: 'ssd-csi', age: '22d' },
  { name: 'grafana-store', ns: 'monitoring', status: 'Bound', capacity: '10 GiB', used: '1.4 GiB', percent: 14, storageClass: 'standard', age: '30d' }
]

export interface TimelineBar {
  object: string
  kind: string
  reason: string
  type: 'Normal' | 'Warning'
  start: number
  width: number
  count: number
}

export const TIMELINE: TimelineBar[] = [
  { object: 'storefront', kind: 'Deployment', reason: 'ScalingReplicaSet', type: 'Normal', start: 8, width: 18, count: 3 },
  { object: 'storefront-7f8d9c-2k', kind: 'Pod', reason: 'Started', type: 'Normal', start: 12, width: 8, count: 1 },
  { object: 'image-resizer', kind: 'Deployment', reason: 'Unhealthy', type: 'Warning', start: 42, width: 22, count: 6 },
  { object: 'image-resizer-7f8d9c-3k', kind: 'Pod', reason: 'BackOff', type: 'Warning', start: 48, width: 28, count: 12 },
  { object: 'payments-api', kind: 'Deployment', reason: 'SuccessfulCreate', type: 'Normal', start: 62, width: 12, count: 2 },
  { object: 'catalog-idx', kind: 'PersistentVolumeClaim', reason: 'Resizing', type: 'Normal', start: 70, width: 16, count: 1 }
]

export interface IngressRow {
  name: string
  ns: string
  className: string
  hosts: string
  address: string
  age: string
}

export const INGRESSES: IngressRow[] = [
  { name: 'storefront', ns: 'shop', className: 'nginx', hosts: 'shop.aurora.demo  +2', address: '34.90.12.8', age: '18d' },
  { name: 'argocd', ns: 'argocd', className: 'nginx', hosts: 'argo.aurora.demo', address: '34.90.12.8', age: '30d' },
  { name: 'grafana', ns: 'monitoring', className: 'nginx', hosts: 'grafana.aurora.demo', address: '34.90.12.8', age: '30d' }
]

export interface ArgoApp {
  name: string
  project: string
  sync: 'Synced' | 'OutOfSync'
  health: 'Healthy' | 'Degraded' | 'Progressing'
  repo: string
}

export const ARGO_APPS: ArgoApp[] = [
  { name: 'shop-storefront', project: 'aurora', sync: 'Synced', health: 'Healthy', repo: 'gitops/shop' },
  { name: 'payments-api', project: 'aurora', sync: 'Synced', health: 'Healthy', repo: 'gitops/payments' },
  { name: 'image-resizer', project: 'aurora', sync: 'OutOfSync', health: 'Degraded', repo: 'gitops/shop' },
  { name: 'monitoring-stack', project: 'platform', sync: 'Synced', health: 'Healthy', repo: 'gitops/platform' }
]

export const SECURITY_FLAGS = [
  'escape-host',
  'privileged-sa',
  'token-leak',
  'read-secrets',
  'cluster-escalation',
  'workload-injection',
  'cloud-access',
  'pipeline-entry',
  'data-theft',
  'exec-bridge'
] as const

export const SECURITY_TYPE_COUNTS = [
  { axis: 'securityContext', count: 8 },
  { axis: 'service', count: 3 },
  { axis: 'podSpec', count: 4 },
  { axis: 'volumes', count: 2 },
  { axis: 'rbac', count: 5 }
] as const

export const SECURITY_SEVERITY = [
  { level: 'Low', count: 0, color: '#94a3b8' },
  { level: 'Medium', count: 42, color: '#e3b341' },
  { level: 'High', count: 18, color: '#e07a3a' },
  { level: 'Critical', count: 6, color: '#d94c4c' }
] as const

export const SECURITY_BY_NS = [
  { ns: 'shop', medium: 8, high: 3, critical: 1 },
  { ns: 'payments', medium: 6, high: 4, critical: 2 },
  { ns: 'data', medium: 5, high: 2, critical: 1 },
  { ns: 'argocd', medium: 4, high: 2, critical: 0 },
  { ns: 'monitoring', medium: 7, high: 3, critical: 1 },
  { ns: 'ingress-nginx', medium: 6, high: 2, critical: 1 },
  { ns: 'kube-system', medium: 6, high: 2, critical: 0 }
] as const

export interface VulnRow {
  severity: 'Critical' | 'High' | 'Medium'
  workload: string
  title: string
  ns: string
  rule: string
  source: 'securityContext' | 'rbac' | 'podSpec' | 'volumes' | 'service'
  policy: 'Restricted' | 'Privileged' | 'Baseline'
  description: string
  recommendation: string
  exploitation: string
}

export const VULNS: VulnRow[] = [
  {
    severity: 'High',
    workload: 'storefront',
    title: 'Allows privilege escalation',
    ns: 'shop',
    rule: 'SEC-SC-002',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'storefront' allows privilege escalation.",
    recommendation: 'Set allowPrivilegeEscalation: false',
    exploitation: 'Attackers can use setuid/setgid binary to escalate privileges'
  },
  {
    severity: 'High',
    workload: 'storefront',
    title: 'Container may run as root',
    ns: 'shop',
    rule: 'SEC-SC-005',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'storefront' may run as root.",
    recommendation: 'Set runAsNonRoot: true at pod or container level',
    exploitation: 'Root in container expands blast radius on escape'
  },
  {
    severity: 'Medium',
    workload: 'checkout-api',
    title: 'Does not drop all Linux capabilities',
    ns: 'shop',
    rule: 'SEC-SC-007',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'checkout-api' does not drop all Linux capabilities.",
    recommendation: "Set securityContext.capabilities.drop: ['ALL']",
    exploitation: 'Default Linux capabilities expose a large attack surface'
  },
  {
    severity: 'Medium',
    workload: 'payments-api',
    title: 'Writable root filesystem',
    ns: 'payments',
    rule: 'SEC-SC-004',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'payments-api' has a writable root filesystem.",
    recommendation: 'Set readOnlyRootFilesystem: true',
    exploitation: 'Writable root lets malware persist binaries in the container'
  },
  {
    severity: 'Medium',
    workload: 'payments-worker',
    title: 'Seccomp profile is not set',
    ns: 'payments',
    rule: 'SEC-SC-009',
    source: 'securityContext',
    policy: 'Restricted',
    description: "Container 'payments-worker' has no seccomp profile.",
    recommendation: 'Set seccompProfile.type: RuntimeDefault',
    exploitation: 'Missing seccomp leaves unused syscalls available'
  },
  {
    severity: 'High',
    workload: 'postgres',
    title: 'Uses default service account',
    ns: 'data',
    rule: 'SEC-RBAC-008',
    source: 'rbac',
    policy: 'Restricted',
    description: "Workload 'postgres' uses the default service account.",
    recommendation: 'Create a dedicated ServiceAccount and set automountServiceAccountToken: false when unused',
    exploitation: 'Default SA often inherits broader cluster permissions'
  },
  {
    severity: 'Critical',
    workload: 'argocd-server',
    title: 'Service account token is mounted',
    ns: 'argocd',
    rule: 'SEC-RBAC-011',
    source: 'rbac',
    policy: 'Privileged',
    description: "Pod 'argocd-server' mounts a service account token with cluster-admin bindings.",
    recommendation: 'Scope the ServiceAccount Role and avoid cluster-admin',
    exploitation: 'Stolen token enables cluster-wide privilege escalation'
  },
  {
    severity: 'Critical',
    workload: 'image-resizer',
    title: 'Privileged container',
    ns: 'shop',
    rule: 'SEC-SC-001',
    source: 'securityContext',
    policy: 'Privileged',
    description: "Container 'image-resizer' runs privileged: true.",
    recommendation: 'Remove privileged: true; use capabilities instead',
    exploitation: 'Privileged containers can escape to the host'
  },
  {
    severity: 'Medium',
    workload: 'grafana',
    title: 'HostPath volume mounted',
    ns: 'monitoring',
    rule: 'SEC-VOL-003',
    source: 'volumes',
    policy: 'Baseline',
    description: "Pod 'grafana' mounts a hostPath volume.",
    recommendation: 'Prefer PVC or emptyDir instead of hostPath',
    exploitation: 'hostPath can expose sensitive host files'
  },
  {
    severity: 'High',
    workload: 'redis',
    title: 'ClusterRole binds to wildcard verbs',
    ns: 'data',
    rule: 'SEC-RBAC-014',
    source: 'rbac',
    policy: 'Restricted',
    description: "ServiceAccount for 'redis' binds a ClusterRole with verbs: ['*'].",
    recommendation: 'Replace wildcard verbs with least privilege',
    exploitation: 'Wildcard RBAC is a lateral-movement shortcut'
  }
]

export interface EntryPointRow {
  name: string
  ns: string
  type: 'LoadBalancer' | 'NodePort'
  ports: string
  age: string
  status: 'Active' | 'Pending'
}

export const ENTRY_POINTS: EntryPointRow[] = [
  { name: 'storefront', ns: 'shop', type: 'LoadBalancer', ports: '80:http/TCP', age: '18d', status: 'Active' },
  { name: 'argocd-server', ns: 'argocd', type: 'LoadBalancer', ports: '443:https/TCP, 80:http/TCP', age: '30d', status: 'Active' },
  { name: 'grafana', ns: 'monitoring', type: 'LoadBalancer', ports: '3000:http/TCP', age: '30d', status: 'Active' },
  { name: 'ingress-nginx-controller', ns: 'ingress-nginx', type: 'LoadBalancer', ports: '80:http/TCP, 443:https/TCP', age: '41d', status: 'Active' },
  { name: 'rabbitmq', ns: 'data', type: 'NodePort', ports: '5672:amqp/TCP, 15672:mgmt/TCP', age: '48d', status: 'Active' },
  { name: 'redis', ns: 'data', type: 'NodePort', ports: '6379:tcp-redis/TCP', age: '41d', status: 'Pending' },
  { name: 'prometheus', ns: 'monitoring', type: 'NodePort', ports: '9090:http/TCP', age: '30d', status: 'Active' }
]

export interface VectorRow {
  from: string
  fromDetail: string
  to: string
  toDetail: string
}

export const VECTORS: VectorRow[] = [
  { from: 'storefront', fromDetail: 'storefront', to: 'checkout-api', toDetail: 'checkout-api' },
  { from: 'storefront', fromDetail: 'storefront', to: 'catalog-api', toDetail: 'catalog-api' },
  { from: 'checkout-api', fromDetail: 'checkout-api', to: 'payments-api', toDetail: 'payments-api' },
  { from: 'payments-api', fromDetail: 'payments-api', to: 'postgres', toDetail: 'postgres-0' },
  { from: 'payments-api', fromDetail: 'payments-api', to: 'redis', toDetail: 'redis-0' },
  { from: 'payments-worker', fromDetail: 'payments-worker', to: 'rabbitmq', toDetail: 'rabbitmq-0' },
  { from: 'fraud-engine', fromDetail: 'fraud-engine', to: 'payments-api', toDetail: 'payments-api' },
  { from: 'argocd-server', fromDetail: 'argocd-server', to: 'argocd-redis', toDetail: 'argocd-redis' },
  { from: 'grafana', fromDetail: 'grafana', to: 'prometheus', toDetail: 'prometheus' },
  { from: 'catalog-api', fromDetail: 'catalog-api', to: 'search-index', toDetail: 'search-index' }
]

export interface AiProvider {
  id: string
  name: string
  kind: 'API' | 'LOCAL' | 'CLI'
  hint: string
  field: string
  fieldValue: string
  model: string
  status: 'Needs key' | 'Ready' | 'Not installed'
  isDefault?: boolean
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI API',
    kind: 'API',
    hint: 'Add an OpenAI API key',
    field: 'API key',
    fieldValue: '',
    model: 'gpt-3.5-turbo',
    status: 'Needs key'
  },
  {
    id: 'claude',
    name: 'Claude API',
    kind: 'API',
    hint: 'Add an Anthropic API key',
    field: 'API key',
    fieldValue: '',
    model: 'claude-sonnet-4-6',
    status: 'Needs key'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    kind: 'LOCAL',
    hint: 'Local models stay on this machine',
    field: 'Host',
    fieldValue: 'http://localhost:11434',
    model: 'llama3.2',
    status: 'Ready'
  },
  {
    id: 'claude-cli',
    name: 'Claude Code CLI',
    kind: 'CLI',
    hint: '/Users/huseyinyener/.local/bin/claude',
    field: 'Command',
    fieldValue: 'claude',
    model: 'sonnet',
    status: 'Ready',
    isDefault: true
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    kind: 'CLI',
    hint: 'Could not find CLI executable in PATH',
    field: 'Command',
    fieldValue: 'codex',
    model: 'default',
    status: 'Not installed'
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    kind: 'CLI',
    hint: 'Could not find CLI executable in PATH',
    field: 'Command',
    fieldValue: 'gh',
    model: 'default',
    status: 'Not installed'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    kind: 'CLI',
    hint: 'Could not find CLI executable in PATH',
    field: 'Command',
    fieldValue: 'gemini',
    model: 'default',
    status: 'Not installed'
  }
]

export const TOPOLOGY_NS = ['payments', 'shop', 'data'] as const

export function namespaces(): string[] {
  return [...new Set(WORKLOADS.map((w) => w.ns))]
}
