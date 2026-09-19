import { useMemo, useState } from 'react'
import { namespaces, PODS, type PodRow } from '../data'

export function PodsSlice() {
  const [ns, setNs] = useState('ALL')
  const [q, setQ] = useState('')
  const [pod, setPod] = useState<PodRow | null>(PODS[0] ?? null)
  const [tab, setTab] = useState<'overview' | 'logs' | 'exec'>('overview')

  const rows = useMemo(
    () =>
      PODS.filter((p) => (ns === 'ALL' ? true : p.ns === ns)).filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      ),
    [ns, q]
  )

  return (
    <div className="ml-pods">
      <div className="ml-pods__main">
        <div className="ml-page-toolbar">
          <select className="ml-ns" value={ns} onChange={(e) => setNs(e.target.value)}>
            <option value="ALL">All namespaces</option>
            {namespaces().map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input className="ml-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pods…" />
          <button type="button" className="ml-btn-primary">
            + Create
          </button>
          <button type="button" className="ml-btn-ghost">
            Refresh
          </button>
          <button type="button" className="ml-btn-ghost">
            Columns
          </button>
        </div>
        <div className="ml-table-wrap">
          <table className="ml-table">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Namespace</th>
                <th>Containers</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Restarts</th>
                <th>Controlled by</th>
                <th>Node</th>
                <th>Status</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 14).map((p) => (
                <tr
                  key={`${p.ns}/${p.name}`}
                  className={pod?.name === p.name ? 'is-on' : ''}
                  onClick={() => {
                    setPod(p)
                    setTab('overview')
                  }}
                >
                  <td>
                    <input type="checkbox" readOnly checked={pod?.name === p.name} />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.ns}</td>
                  <td>
                    <span className={`ml-container-dot${p.status === 'Pending' ? ' is-warn' : ''}`} />
                  </td>
                  <td>{p.cpu}</td>
                  <td>{p.memory}</td>
                  <td>{p.restarts}</td>
                  <td>{p.owner.split('/')[0]}</td>
                  <td>{p.node}</td>
                  <td>
                    <span className={`ml-status ml-status--${p.status}`}>
                      <i />
                      {p.status}
                    </span>
                  </td>
                  <td>{p.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pod ? (
        <aside className="ml-detail">
          <div className="ml-detail__h">
            <strong>{pod.name}</strong>
            <span>
              {pod.ns} · {pod.owner}
            </span>
          </div>
          <div className="ml-detail__tabs">
            {(['overview', 'logs', 'exec'] as const).map((t) => (
              <button key={t} type="button" className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>
                {t === 'overview' ? 'Overview' : t === 'logs' ? 'Logs' : 'Exec'}
              </button>
            ))}
          </div>
          {tab === 'overview' ? (
            <div className="ml-facts">
              <div className="ml-fact">
                <em>Status</em>
                {pod.status}
              </div>
              <div className="ml-fact">
                <em>Ready</em>
                {pod.ready}
              </div>
              <div className="ml-fact">
                <em>Restarts</em>
                {pod.restarts}
              </div>
              <div className="ml-fact">
                <em>Node</em>
                {pod.node}
              </div>
              <div className="ml-fact">
                <em>CPU</em>
                {pod.cpu}
              </div>
              <div className="ml-fact">
                <em>Memory</em>
                {pod.memory}
              </div>
              <div className="ml-fact">
                <em>Image</em>
                {pod.image}
              </div>
              <div className="ml-fact">
                <em>QoS</em>
                {pod.qos}
              </div>
            </div>
          ) : tab === 'logs' ? (
            <pre className="ml-log">
              {`2026-09-19T00:12:01Z  listening on :8080
2026-09-19T00:12:04Z  ready probe ok
2026-09-19T00:13:11Z  GET /health 200
2026-09-19T00:13:40Z  sync ${pod.owner.split('/')[1]} replica
2026-09-19T00:14:02Z  metrics scrape ok`}
            </pre>
          ) : (
            <pre className="ml-log ml-log--term">
              {`root@${pod.name}:/# kubectl get pods -n ${pod.ns}
NAME                     READY   STATUS
${pod.name}   ${pod.ready}     ${pod.status}
root@${pod.name}:/# ▌`}
            </pre>
          )}
        </aside>
      ) : null}
    </div>
  )
}
