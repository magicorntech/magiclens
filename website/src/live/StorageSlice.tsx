import { PVCS } from '../data'

export function StorageSlice() {
  return (
    <div className="ml-storage">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">PersistentVolumeClaims</span>
        <select className="ml-ns">
          <option>All namespaces</option>
          <option>data</option>
          <option>shop</option>
          <option>monitoring</option>
        </select>
        <input className="ml-search" placeholder="Search claims…" />
      </div>
      <div className="ml-table-wrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Used</th>
              <th>Full</th>
              <th>StorageClass</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {PVCS.map((p) => (
              <tr key={`${p.ns}/${p.name}`}>
                <td>{p.name}</td>
                <td>{p.ns}</td>
                <td>
                  <span className="ml-status">
                    <i />
                    {p.status}
                  </span>
                </td>
                <td>{p.capacity}</td>
                <td>{p.used}</td>
                <td>
                  <div className="ml-pvc-bar">
                    <i className={p.percent >= 70 ? 'is-warn' : ''} style={{ width: `${p.percent}%` }} />
                    <span>{p.percent}%</span>
                  </div>
                </td>
                <td>{p.storageClass}</td>
                <td>{p.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
