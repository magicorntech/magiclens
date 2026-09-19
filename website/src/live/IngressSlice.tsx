import { INGRESSES } from '../data'

export function IngressSlice() {
  return (
    <div className="ml-storage">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">Ingresses</span>
        <select className="ml-ns">
          <option>All namespaces</option>
        </select>
        <input className="ml-search" placeholder="Search ingresses…" />
      </div>
      <div className="ml-table-wrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Class</th>
              <th>Hosts</th>
              <th>Address</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {INGRESSES.map((r) => (
              <tr key={`${r.ns}/${r.name}`}>
                <td>{r.name}</td>
                <td>{r.ns}</td>
                <td>{r.className}</td>
                <td className="ml-hosts">{r.hosts}</td>
                <td>{r.address}</td>
                <td>{r.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
