import { ARGO_APPS } from '../data'

export function ArgoSlice() {
  return (
    <div className="ml-storage">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">Argo CD · Applications</span>
        <button type="button" className="ml-btn-primary">
          Sync
        </button>
        <button type="button" className="ml-btn-ghost">
          Refresh
        </button>
      </div>
      <div className="ml-table-wrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Project</th>
              <th>Sync</th>
              <th>Health</th>
              <th>Repository</th>
            </tr>
          </thead>
          <tbody>
            {ARGO_APPS.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.project}</td>
                <td>
                  <span className={`ml-status${a.sync === 'OutOfSync' ? ' ml-status--Pending' : ''}`}>
                    <i />
                    {a.sync}
                  </span>
                </td>
                <td>
                  <span className={`ml-status${a.health === 'Degraded' ? ' ml-status--Pending' : ''}`}>
                    <i />
                    {a.health}
                  </span>
                </td>
                <td>{a.repo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
