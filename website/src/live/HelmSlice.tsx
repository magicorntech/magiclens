import { useState } from 'react'
import { HELM_CHARTS, HELM_RELEASES } from '../data'

export function HelmSlice() {
  const [mode, setMode] = useState<'charts' | 'releases'>('charts')
  const [picked, setPicked] = useState(HELM_CHARTS[0]?.name ?? '')
  const chart = HELM_CHARTS.find((c) => c.name === picked) ?? HELM_CHARTS[0]

  return (
    <div className="ml-helm">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">Helm / Package Editor</span>
        <div className="ml-seg">
          <button type="button" className={mode === 'charts' ? 'is-on' : ''} onClick={() => setMode('charts')}>
            Charts
          </button>
          <button type="button" className={mode === 'releases' ? 'is-on' : ''} onClick={() => setMode('releases')}>
            Releases
          </button>
        </div>
      </div>
      {mode === 'releases' ? (
        <div className="ml-table-wrap">
          <table className="ml-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Namespace</th>
                <th>Chart</th>
                <th>Revision</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {HELM_RELEASES.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.ns}</td>
                  <td>{r.chart}</td>
                  <td>{r.revision}</td>
                  <td>
                    <span className="ml-status">
                      <i />
                      {r.status}
                    </span>
                  </td>
                  <td>{r.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ml-helm-grid">
          <aside className="ml-helm-list">
            <div className="ml-helm-list__h">
              <b>{HELM_CHARTS.length} charts</b>
              <input placeholder="Search charts…" />
            </div>
            {HELM_CHARTS.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`ml-helm-item${picked === c.name ? ' is-on' : ''}`}
                onClick={() => setPicked(c.name)}
              >
                <img src={`/icons/${c.icon}.svg`} alt="" />
                <div>
                  <strong>{c.name}</strong>
                  <span>
                    {c.version} · {c.repo}
                  </span>
                  <em>{c.desc}</em>
                </div>
              </button>
            ))}
          </aside>
          <div className="ml-helm-doc">
            <h3>{chart.name}</h3>
            <p>
              {chart.desc} Version {chart.version} from {chart.repo}.
            </p>
            <pre>{`helm install ${chart.name} ${chart.repo}/${chart.name} --version ${chart.version}`}</pre>
            <h4>Prerequisites</h4>
            <ul>
              <li>Kubernetes 1.19+</li>
              <li>Helm 3</li>
            </ul>
          </div>
          <aside className="ml-helm-install">
            <div className="ml-helm-install__h">
              <b>Install</b>
              <button type="button" className="ml-btn-primary">
                Deploy
              </button>
            </div>
            <label>
              Release name
              <input defaultValue={chart.name} />
            </label>
            <label>
              Namespace
              <select defaultValue="default">
                <option>default</option>
                <option>monitoring</option>
                <option>argocd</option>
              </select>
            </label>
            <label>
              values.yaml
              <textarea
                defaultValue={`replicaCount: 1\nimage:\n  repository: ${chart.name}\n  tag: "${chart.version}"\nservice:\n  type: ClusterIP\n  port: 80`}
              />
            </label>
          </aside>
        </div>
      )}
    </div>
  )
}
