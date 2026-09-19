import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  Columns2,
  FolderOpen,
  Globe,
  HardDrive,
  Hexagon,
  KeyRound,
  LayoutDashboard,
  Puzzle,
  Search,
  Settings,
  Star,
  Waypoints
} from 'lucide-react'
import { CLUSTERS, type PageKey } from '../data'

/** Mirrors MagicLens `resourceNavLayout` — same order and groupings. */
const NAV = [
  { type: 'favorites' as const },
  { type: 'item' as const, id: 'nodes' as PageKey, label: 'Nodes', icon: Hexagon },
  { type: 'item' as const, id: 'topology' as PageKey, label: 'Topology', icon: LayoutDashboard },
  { type: 'item' as const, id: 'visualizer' as PageKey, label: 'Visualizer', icon: Waypoints },
  {
    type: 'section' as const,
    id: 'workloads',
    label: 'Workloads',
    icon: Hexagon,
    children: [
      { id: 'pods' as PageKey, label: 'Pods' },
      { id: 'deployments' as PageKey, label: 'Deployments' },
      { id: 'logs' as PageKey, label: 'Logs' }
    ]
  },
  {
    type: 'section' as const,
    id: 'network',
    label: 'Network',
    icon: Globe,
    children: [{ id: 'ingress' as PageKey, label: 'Ingresses' }]
  },
  {
    type: 'section' as const,
    id: 'storage',
    label: 'Storage',
    icon: HardDrive,
    children: [{ id: 'storage' as PageKey, label: 'PersistentVolumeClaims' }]
  },
  { type: 'item' as const, id: 'timeline' as PageKey, label: 'Timeline', icon: Activity },
  { type: 'item' as const, id: 'helm' as PageKey, label: 'Helm', icon: Settings },
  {
    type: 'section' as const,
    id: 'argocd',
    label: 'Argo CD',
    icon: Puzzle,
    children: [{ id: 'argocd' as PageKey, label: 'Applications' }]
  },
  { type: 'mute' as const, label: 'Config', icon: Settings },
  { type: 'mute' as const, label: 'Namespaces', icon: FolderOpen },
  { type: 'mute' as const, label: 'Events', icon: Calendar },
  { type: 'mute' as const, label: 'Grafana', icon: Star },
  { type: 'mute' as const, label: 'Prometheus', icon: Star },
  { type: 'mute' as const, label: 'Access Control', icon: KeyRound },
  { type: 'mute' as const, label: 'Custom Resources', icon: Puzzle }
]

export function Shell({
  page,
  onPage,
  clusterId,
  onCluster,
  split,
  onSplit,
  rightClusterId,
  focus,
  onFocus,
  style,
  tall,
  children,
  right,
  openTabs
}: {
  page: PageKey
  onPage?: (p: PageKey) => void
  clusterId: string
  onCluster?: (id: string) => void
  split?: boolean
  onSplit?: () => void
  rightClusterId?: string
  focus?: 'left' | 'right'
  onFocus?: (p: 'left' | 'right') => void
  style?: CSSProperties
  tall?: boolean
  children: ReactNode
  right?: ReactNode
  openTabs?: PageKey[]
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ workloads: true, storage: true, network: true, argocd: true })
  const cluster = CLUSTERS.find((c) => c.id === clusterId) ?? CLUSTERS[0]
  const tabs = openTabs ?? [page]

  return (
    <div className={`ml-live${tall ? ' ml-live--tall' : ''}`} style={style} data-theme="light">
      <div className="ml-cluster-tab-strip ml-cluster-tab-strip--browser ml-cluster-tab-strip--traffic">
        <div className="ml-strip__rail">
          <span className="ml-traffic" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <img src="/icon-64.png" alt="" width={16} height={16} />
          MagicLens
        </div>
        <div className="ml-cluster-tab-strip-tabs">
          <div className="ml-browser-tabs">
            <div className="ml-browser-tabs__list" role="tablist">
              {CLUSTERS.map((c) => {
                const inLeft = split && c.id === clusterId
                const inRight = split && c.id === rightClusterId
                const active = split
                  ? (focus === 'left' && inLeft) || (focus === 'right' && inRight)
                  : c.id === clusterId
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`ml-browser-tab${active ? ' is-active' : ''}${inLeft ? ' is-split-left' : ''}${
                      inRight ? ' is-split-right' : ''
                    }`}
                    onClick={() => onCluster?.(c.id)}
                  >
                    <span className="ml-browser-tab__status ml-browser-tab__status--connected" />
                    <span className="ml-browser-tab__logo" style={{ background: c.accent }}>
                      {c.letter}
                    </span>
                    <span className="ml-browser-tab__label">{c.name}</span>
                    <span className="ml-browser-tab__close">×</span>
                  </button>
                )
              })}
            </div>
            <div className="ml-browser-tabs__actions">
              {onSplit ? (
                <button type="button" className={`ml-browser-tabs__action${split ? ' is-active' : ''}`} title="Split view" onClick={onSplit}>
                  <Columns2 size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="ml-body">
        <aside className="ml-sider">
          <div className="ml-cluster-chip">
            <span className="ml-browser-tab__status ml-browser-tab__status--connected" />
            {cluster.name}
          </div>
          <div className="ml-nav-search">
            <Search size={13} />
            <input placeholder="Filter navigation" />
          </div>
          <div className="ml-nav-scroll">
            {NAV.map((item) => {
              if (item.type === 'favorites') {
                return (
                  <div key="fav">
                    <div className="ml-nav-sec">
                      <Star size={11} /> Favorites
                    </div>
                    {(['nodes', 'topology', 'visualizer'] as PageKey[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`ml-nav-item${page === id ? ' is-on' : ''}`}
                        onClick={() => onPage?.(id)}
                      >
                        {id === 'nodes' ? 'Nodes' : id === 'topology' ? 'Topology' : 'Visualizer'}
                      </button>
                    ))}
                  </div>
                )
              }
              if (item.type === 'mute') {
                const Icon = item.icon
                return (
                  <div key={item.label} className="ml-nav-item is-mute">
                    <Icon size={14} strokeWidth={1.8} />
                    {item.label}
                  </div>
                )
              }
              if (item.type === 'item') {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`ml-nav-item${page === item.id ? ' is-on' : ''}`}
                    onClick={() => onPage?.(item.id)}
                  >
                    <Icon size={14} strokeWidth={1.8} />
                    {item.label}
                  </button>
                )
              }
              const Icon = item.icon
              const expanded = open[item.id]
              const childOn = item.children.some((c) => c.id === page)
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    className={`ml-nav-item ml-nav-section-btn${childOn ? ' is-on' : ''}`}
                    onClick={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))}
                  >
                    <Icon size={14} strokeWidth={1.8} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  {expanded
                    ? item.children.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`ml-nav-item ml-nav-item--nested${page === c.id ? ' is-on' : ''}`}
                          onClick={() => onPage?.(c.id)}
                        >
                          {c.label}
                        </button>
                      ))
                    : null}
                </div>
              )
            })}
          </div>
        </aside>

        <div className={`ml-split${split && right ? '' : ' is-single'}`}>
          <Pane
            focused={!split || focus === 'left'}
            side="L"
            cluster={cluster.name}
            tabs={tabs}
            active={page}
            onTab={onPage}
            onFocus={() => onFocus?.('left')}
          >
            {children}
          </Pane>
          {split && right ? (
            <Pane
              focused={focus === 'right'}
              side="R"
              cluster={(CLUSTERS.find((c) => c.id === rightClusterId) ?? CLUSTERS[1]).name}
              tabs={['topology']}
              active="topology"
              onFocus={() => onFocus?.('right')}
            >
              {right}
            </Pane>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Pane({
  focused,
  side,
  cluster,
  tabs,
  active,
  onTab,
  onFocus,
  children
}: {
  focused: boolean
  side: 'L' | 'R'
  cluster: string
  tabs: PageKey[]
  active: PageKey
  onTab?: (p: PageKey) => void
  onFocus?: () => void
  children: ReactNode
}) {
  return (
    <section className={`ml-pane${focused ? ' is-focus' : ''}`} onMouseDown={onFocus}>
      <div className="ml-kind-tabs">
        {tabs.map((t) => (
          <button key={t} type="button" className={`ml-kind-tab${active === t ? ' is-on' : ''}`} onClick={() => onTab?.(t)}>
            {labelOf(t)}
            <span>×</span>
          </button>
        ))}
        <span className="ml-pane__cluster">{cluster}</span>
        <span className="ml-pane__side">{side}</span>
      </div>
      <div className="ml-pane__body">{children}</div>
    </section>
  )
}

function labelOf(p: PageKey): string {
  const map: Record<PageKey, string> = {
    nodes: 'Nodes',
    visualizer: 'Visualizer',
    topology: 'Topology',
    pods: 'Pods',
    deployments: 'Deployments',
    helm: 'Helm',
    storage: 'PVCs',
    timeline: 'Timeline',
    logs: 'Logs',
    ingress: 'Ingresses',
    argocd: 'Applications'
  }
  return map[p]
}
