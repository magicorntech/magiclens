import { NODES } from '../data'

export function NodesSlice() {
  const ready = NODES.filter((n) => n.status === 'Ready').length
  const notReady = NODES.length - ready
  return (
    <div className="ml-nodes">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">Nodes</span>
        <select className="ml-ns">
          <option>All namespaces</option>
        </select>
        <input className="ml-search" placeholder="Search nodes…" />
        <button type="button" className="ml-btn-primary">
          + Create
        </button>
        <button type="button" className="ml-btn-ghost">
          Refresh
        </button>
      </div>

      <div className="ml-nodes-grid">
        <div className="ml-stat-card">
          <em>Kubelet versions</em>
          <div className="ml-bars">
            <div>
              <span>v1.31.2</span>
              <b style={{ width: '86%' }} />
              <i>6</i>
            </div>
            <div>
              <span>v1.31.1</span>
              <b style={{ width: '14%' }} />
              <i>1</i>
            </div>
          </div>
        </div>
        <div className="ml-stat-card">
          <em>Node roles</em>
          <div className="ml-bars">
            <div>
              <span>worker</span>
              <b style={{ width: '71%' }} />
              <i>5</i>
            </div>
            <div>
              <span>control-plane</span>
              <b style={{ width: '29%' }} />
              <i>2</i>
            </div>
          </div>
        </div>
        <div className="ml-metric-chip">
          <b>12</b>
          <span>Namespaces</span>
        </div>
        <div className="ml-metric-chip">
          <b>21</b>
          <span>Deployments</span>
        </div>
        <div className="ml-metric-chip">
          <b>27</b>
          <span>Services</span>
        </div>
        <div className="ml-metric-chip is-warn">
          <b>1</b>
          <span>Problem pods</span>
        </div>
      </div>

      <div className="ml-health-row">
        <div className={`ml-health-card${notReady ? ' is-degraded' : ''}`}>
          <em>Cluster health</em>
          <strong>{notReady ? 'Degraded' : 'Healthy'}</strong>
          <span>
            {notReady} not ready · 0 failed pods
          </span>
        </div>
        <div className="ml-health-card">
          <em>Nodes</em>
          <strong>{NODES.length} total</strong>
          <div className="ml-segbar">
            <i style={{ flex: ready, background: '#3f9c6c' }} />
            <i style={{ flex: Math.max(notReady, 0.01), background: '#d94c4c' }} />
          </div>
          <span>
            {ready} ready · {notReady} not ready
          </span>
        </div>
        <div className="ml-health-card">
          <em>Pods</em>
          <strong>77 total</strong>
          <div className="ml-segbar">
            <i style={{ flex: 76, background: '#3f9c6c' }} />
            <i style={{ flex: 1, background: '#d4a017' }} />
          </div>
          <span>76 running · 1 pending</span>
        </div>
      </div>

      <div className="ml-usage-row">
        <Usage label="CPU" pct={36} detail="18.60 / 52.00 cores" />
        <Usage label="Memory" pct={46} detail="97.0 / 210.0 GiB" />
        <Usage label="Pods capacity" pct={10} detail="77 / 770 pods" />
      </div>

      <div className="ml-table-wrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Version</th>
              <th>CPU</th>
              <th>Memory</th>
              <th>Pods</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {NODES.map((n) => (
              <tr key={n.name}>
                <td>{n.name}</td>
                <td>{n.role}</td>
                <td>
                  <span className={`ml-status ${n.status === 'Ready' ? '' : 'ml-status--Pending'}`}>
                    <i />
                    {n.status}
                  </span>
                </td>
                <td>{n.version}</td>
                <td>{n.cpu}</td>
                <td>{n.memory}</td>
                <td>{n.pods}</td>
                <td>{n.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Usage({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div className="ml-usage">
      <div className="ml-usage__top">
        <em>{label}</em>
        <b>{pct}%</b>
      </div>
      <div className="ml-usage__bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>{detail}</span>
    </div>
  )
}
