import { Feature, PageHero, Shots, type Pair } from '../ui'

interface Area {
  id: string
  video: string
  kicker: Pair
  title: Pair
  copy: Pair
  bullets: readonly Pair[]
  shots: ReadonlyArray<{ id: string; cap: Pair }>
}

const AREAS: Area[] = [
  {
    id: 'nodes',
    video: 'nodes-deep',
    kicker: 'Nodes',
    title: 'The whole fleet, then one node in depth.',
    copy: 'Roles, versions and health in one table; open a node for its conditions, capacity, allocations, live CPU and memory, and the pods running on it. Shown here on aurora-staging.',
    bullets: ['Sortable node table with health at a glance', 'Inspector with conditions and pods', 'Metrics tab with CPU and memory history'],
    shots: [
      { id: 'feat-nodes-inspector', cap: 'Node inspector' },
      { id: 'feat-nodes-metrics', cap: 'Live metrics' }
    ]
  },
  {
    id: 'deployments',
    video: 'deployment-deep',
    kicker: 'Deployments',
    title: 'From rollout to root cause without leaving the panel.',
    copy: 'A deployment\'s overview, its pods, merged logs and events live in one resizable panel. Scale replicas or restart a rollout from the header — and read every replica\'s log in a single colour-coded stream.',
    bullets: [
      'Scale replicas and restart rollout',
      'Merged logs across all pods',
      'Events, YAML and Sparks notes in tabs'
    ],
    shots: [
      { id: 'feat-deployment-detail', cap: 'Overview' },
      { id: 'feat-deployment-scale', cap: 'Scale replicas' },
      { id: 'feat-deployment-logs', cap: 'Merged logs' }
    ]
  },
  {
    id: 'pods',
    video: 'pods-deep',
    kicker: 'Pods',
    title: 'Every pod, with the numbers that matter.',
    copy: 'CPU, memory, restarts, QoS, node and status in one dense table. Open a pod for its containers, events and logs; a pending pod tells you why.',
    bullets: [
      'Sort, filter and choose your columns',
      'Container states at a glance',
      'Logs one click away'
    ],
    shots: [
      { id: 'feat-pods-table', cap: 'Pods table' },
      { id: 'feat-pod-detail', cap: 'Pod detail' },
      { id: 'feat-pod-logs', cap: 'Pod logs' }
    ]
  },
  {
    id: 'network',
    video: 'network-deep',
    kicker: 'Network',
    title: 'Services, ingresses and endpoints — connected.',
    copy: 'See every service with its type, cluster IP and ports; open one to see where it points, or open an ingress for its hosts, paths and backends. Shown here on payments-prod.',
    bullets: ['Services with type, IP and ports', 'Service and ingress detail panels', 'Endpoints, slices and network policies one click away'],
    shots: [
      { id: 'feat-network-services', cap: 'Services' },
      { id: 'feat-network-service-detail', cap: 'Service detail' },
      { id: 'feat-network-ingress', cap: 'Ingress detail' }
    ]
  },
  {
    id: 'topology',
    video: 'topology-deep',
    kicker: 'Topology',
    title: 'A live map of how your workloads connect.',
    copy: 'Ingress to service to pods to config — drawn per namespace. Select any node for details and insights, or switch to Applications and Resources for grouped views.',
    bullets: [
      'Per-namespace dependency graph',
      'Insights beside the graph',
      'Applications and Resources views'
    ],
    shots: [
      { id: 'feat-topology-graph', cap: 'Dependency graph' },
      { id: 'feat-topology-selected', cap: 'A selected pod' },
      { id: 'feat-topology-apps', cap: 'Applications' }
    ]
  },
  {
    id: 'visualizer',
    video: 'visualizer-deep',
    kicker: 'Visualizer',
    title: 'Namespaces as maps.',
    copy: 'Service cards, ingress and egress chips, workload logos and replica squares — grouped the way you think about the cluster: by namespace and Helm release. Shown here on aurora-test.',
    bullets: ['Brand icons for well-known services', 'Replica squares show health', 'Pan, zoom and a minimap'],
    shots: [
      { id: 'feat-visualizer-map', cap: 'Namespace map' },
      { id: 'visualizer', cap: 'Full page' }
    ]
  },
  {
    id: 'webapps',
    video: 'webapps',
    kicker: 'Your web tools',
    title: 'Argo CD, Grafana and Prometheus — inside the app.',
    copy: 'MagicLens finds these services in the cluster, opens a port-forward for you and shows the web UI in a tab, with the admin credentials one click away. No browser tabs, no kubectl port-forward.',
    bullets: ['Found automatically, or point it at a URL', 'Credentials read from the cluster, copy in one click', 'Open in your browser whenever you like'],
    shots: [
      { id: 'feat-webapp-argocd', cap: 'Argo CD' },
      { id: 'feat-webapp-grafana', cap: 'Grafana' },
      { id: 'feat-webapp-prometheus', cap: 'Prometheus' }
    ]
  },
  {
    id: 'security',
    video: 'security-deep',
    kicker: 'Security',
    title: 'A read-only security scan, with a rule book.',
    copy: 'MagicLens reviews a cluster (platform-prod here) for common misconfigurations — privileged containers, risky bindings, missing network policies, host mounts — and maps each finding to a rule. Nothing is changed.',
    bullets: [
      'Animated scan progress and saved history',
      'Filters, search and a rule book',
      'Finding drawer that can ask Molly'
    ],
    shots: [
      { id: 'feat-security-results', cap: 'The latest scan' },
      { id: 'feat-security-intro', cap: 'What a scan covers' },
      { id: 'feat-security-scanning', cap: 'A scan in progress' },
      { id: 'feat-security-finding', cap: 'A finding in detail' }
    ]
  }
]

export function Explore(): React.JSX.Element {
  return (
    <>
      <PageHero
        kicker={'Explore'}
        title={'Every Kubernetes page,'}
        em={'drawn with care.'}
        lede={'Nodes, deployments, pods, network, topology, visualizer and security — shown here with demo data, exactly as they look in the app.'}
        video="tour"
      />
      <div className="subnav">
        {AREAS.map((a) => (
          <a key={a.id} href={`#/explore/${a.id}`}>
            {a.kicker}
          </a>
        ))}
      </div>
      <div className="features">
        {AREAS.map((a, i) => (
          <div key={a.id} id={a.id} className="area">
            <Feature
              video={a.video}
              kicker={a.kicker}
              title={a.title}
              copy={a.copy}
              bullets={a.bullets}
              flip={i % 2 === 1}
            />
            <Shots items={a.shots} cols={a.shots.length === 2 ? 2 : 3} />
          </div>
        ))}
      </div>
    </>
  )
}
