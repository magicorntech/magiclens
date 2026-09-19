import { useMemo, useState } from 'react'
import { TOPOLOGY_NS, WORKLOADS } from '../data'

const CARD = { w: 180, h: 62 }
const COL = [16, 232, 448, 664]

export function TopologySlice({ namespace, compact }: { namespace: string; compact?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [view, setView] = useState<'topology' | 'apps'>('topology')
  const [ns, setNs] = useState(
    TOPOLOGY_NS.includes(namespace as (typeof TOPOLOGY_NS)[number]) ? namespace : 'payments'
  )
  const apps = useMemo(
    () => WORKLOADS.filter((w) => w.ns === ns).slice(0, compact ? 1 : 3),
    [ns, compact]
  )

  const nodes = useMemo(() => {
    const list: { id: string; kind: string; name: string; meta: string; status: 'healthy' | 'degraded'; x: number; y: number }[] = []
    apps.forEach((app, row) => {
      const y = 20 + row * 196
      const warn = app.ready < app.replicas
      list.push({ id: `d-${app.name}`, kind: app.kind, name: app.name, meta: `${app.ready}/${app.replicas}`, status: warn ? 'degraded' : 'healthy', x: COL[0], y: y + 70 })
      list.push({ id: `rs-${app.name}`, kind: 'ReplicaSet', name: `${app.name}-7f8d9c`, meta: `${app.ready}/${app.replicas}`, status: warn ? 'degraded' : 'healthy', x: COL[1], y: y + 70 })
      list.push({ id: `s-${app.name}`, kind: 'Service', name: app.name, meta: `${app.port}/TCP`, status: 'healthy', x: COL[1], y })
      const pods = Math.min(app.replicas, 3)
      for (let i = 0; i < pods; i++) {
        list.push({
          id: `p-${app.name}-${i}`,
          kind: 'Pod',
          name: app.kind === 'StatefulSet' ? `${app.name}-${i}` : `${app.name}-7f8d9c-${i + 2}k`,
          meta: i < app.ready ? 'Running' : 'Pending',
          status: i < app.ready ? 'healthy' : 'degraded',
          x: COL[2],
          y: y + i * 68
        })
      }
      list.push({ id: `cm-${app.name}`, kind: 'ConfigMap', name: `${app.name}-cm`, meta: '2 keys', status: 'healthy', x: COL[3], y: y + 68 })
    })
    return list
  }, [apps])

  const edges = useMemo(() => {
    const list: { from: string; to: string; rel: string }[] = []
    for (const app of apps) {
      list.push({ from: `d-${app.name}`, to: `rs-${app.name}`, rel: 'owns' })
      list.push({ from: `s-${app.name}`, to: `p-${app.name}-0`, rel: 'selects' })
      const pods = Math.min(app.replicas, 3)
      for (let i = 0; i < pods; i++) {
        list.push({ from: `rs-${app.name}`, to: `p-${app.name}-${i}`, rel: 'owns' })
        list.push({ from: `p-${app.name}-${i}`, to: `cm-${app.name}`, rel: 'mounts' })
      }
    }
    return list
  }, [apps])

  const height = Math.max(280, 20 + apps.length * 196 + 20)
  const width = COL[3] + CARD.w + 24
  const degraded = apps.find((a) => a.ready < a.replicas)

  function center(id: string) {
    const n = nodes.find((x) => x.id === id)
    if (!n) return { x: 0, y: 0 }
    return { x: n.x + CARD.w, y: n.y + CARD.h / 2 }
  }
  function left(id: string) {
    const n = nodes.find((x) => x.id === id)
    if (!n) return { x: 0, y: 0 }
    return { x: n.x, y: n.y + CARD.h / 2 }
  }

  return (
    <div className="ml-topo-page">
      <header className="ml-topo-hero">
        <div>
          <h3>Topology & Applications</h3>
          <p>Live map of workloads, services, and dependencies in this namespace.</p>
        </div>
        <div className="ml-topo-hero__right">
          <div className="ml-seg">
            <button type="button" className={view === 'topology' ? 'is-on' : ''} onClick={() => setView('topology')}>
              Topology
            </button>
            <button type="button" className={view === 'apps' ? 'is-on' : ''} onClick={() => setView('apps')}>
              Applications
            </button>
          </div>
          <select className="ml-ns" value={ns} onChange={(e) => setNs(e.target.value)}>
            {TOPOLOGY_NS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="ml-topo-body">
        {view === 'apps' ? (
          <div className="ml-apps">
            {WORKLOADS.filter((w) => w.ns === ns).map((app) => (
              <button key={app.name} type="button" className="ml-app-card">
                <b>{app.name}</b>
                <span>
                  {app.kind} · {app.ready}/{app.replicas}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ml-topo-canvas">
            <div className="ml-topo-map" style={{ width, height }}>
              <svg className="ml-topo-svg" width={width} height={height}>
                {edges.map((e) => {
                  const a = center(e.from)
                  const b = left(e.to)
                  const mx = (a.x + b.x) / 2
                  return (
                    <g key={`${e.from}-${e.to}-${e.rel}`}>
                      <path d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`} />
                      <text x={mx} y={(a.y + b.y) / 2 - 5} textAnchor="middle">
                        {e.rel}
                      </text>
                    </g>
                  )
                })}
              </svg>
              {nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`ml-topo-node ml-topo-node--${n.status}${picked === n.id ? ' is-on' : ''}`}
                  style={{ left: n.x, top: n.y }}
                  onClick={() => setPicked(n.id)}
                >
                  <div className="ml-topo-node__kind">{n.kind}</div>
                  <div className="ml-topo-node__name">{n.name}</div>
                  <div className="ml-topo-node__meta">{n.meta}</div>
                </button>
              ))}
            </div>
            <div className="ml-minimap" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        )}
        <aside className="ml-topo-aside">
          <h4>Insights</h4>
          <p>{degraded ? `${degraded.name} is degraded (${degraded.ready}/${degraded.replicas} ready).` : 'No issues detected.'}</p>
        </aside>
      </div>
    </div>
  )
}
