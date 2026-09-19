import { useMemo, useState } from 'react'
import { WORKLOADS } from '../data'

export function VisualizerSlice({ clusterName }: { clusterName: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  const groups = useMemo(() => {
    const map = new Map<string, typeof WORKLOADS>()
    for (const w of WORKLOADS) {
      const list = map.get(w.ns) ?? []
      list.push(w)
      map.set(w.ns, list)
    }
    return [...map.entries()]
  }, [])

  return (
    <div className="ml-viz-page">
      <div className="ml-viz-toolbar">
        <div className="ml-viz-title">
          <span className="ml-viz-title__name">Visualizer</span>
          <span className="ml-viz-title__meta">
            {groups.length} namespaces · {WORKLOADS.length} workloads · {WORKLOADS.length} services
            {clusterName ? ` · ${clusterName}` : ''}
          </span>
        </div>
      </div>
      <div className="ml-viz-canvas">
        {groups.map(([ns, apps]) => (
          <section key={ns} className="ml-viz-frame ml-viz-frame--namespace">
            <span className="ml-viz-frame__label">{ns}</span>
            <div className="ml-viz-cols">
              {apps.map((app) => {
                const id = `${ns}/${app.name}`
                const degraded = app.ready < app.replicas
                return (
                  <div key={id} className="ml-viz-col">
                    <button
                      type="button"
                      className={`ml-viz-svc${picked === `${id}-svc` ? ' is-on' : ''}`}
                      onClick={() => setPicked(`${id}-svc`)}
                    >
                      <div className="ml-viz-svc__head">
                        <span className="ml-viz-svc__icon" />
                        <span className="ml-viz-svc__name">{app.name}</span>
                      </div>
                      <div className="ml-viz-svc__type">Service: {app.ingress ? 'LoadBalancer' : 'ClusterIP'}</div>
                      <div className="ml-viz-svc__ports">
                        <div className="ml-viz-svc__port">
                          <span>{app.port}</span>
                          <span>http</span>
                        </div>
                      </div>
                    </button>
                    <div className="ml-viz-link" />
                    <button
                      type="button"
                      className={`ml-viz-wl${degraded ? ' ml-viz-wl--degraded' : ''}${picked === id ? ' is-on' : ''}`}
                      onClick={() => setPicked(id)}
                    >
                      <div className="ml-viz-wl__chips">
                        {app.ingress ? (
                          <span className="ml-viz-chip">
                            <span className="ml-viz-chip__x">×</span> Ingress
                          </span>
                        ) : null}
                        <span className="ml-viz-chip">
                          <span className="ml-viz-chip__x">×</span> Egress
                        </span>
                      </div>
                      <div className="ml-viz-wl__head">
                        <span className="ml-viz-wl__kind-icon" />
                        <span className="ml-viz-wl__name">{app.name}</span>
                      </div>
                      <div className="ml-viz-wl__body">
                        <img className="ml-viz-wl__logo" src={`/icons/${app.icon}.svg`} alt="" />
                      </div>
                      <div className="ml-viz-wl__replicas">
                        {Array.from({ length: app.replicas }, (_, i) => (
                          <i key={i} className={`ml-viz-replica${i < app.ready ? ' ml-viz-replica--on' : ''}`} />
                        ))}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
