import { Plus, Search, Star } from 'lucide-react'
import { CLUSTERS } from '../data'

export function ClustersSlice() {
  return (
    <div className="ml-hub">
      <aside className="ml-hub-rail">
        <div className="ml-hub-brand">
          <img src="/icon-64.png" alt="" width={22} height={22} />
          MagicLens
        </div>
        <button type="button" className="ml-nav-item is-on">
          Clusters
        </button>
        <div className="ml-nav-item is-mute">Sparks</div>
        <div className="ml-nav-item is-mute">VPN</div>
        <div className="ml-nav-sec">Favorites</div>
        <button type="button" className="ml-nav-item is-on">
          <span className="ml-tab__logo" style={{ background: '#e84d5c' }}>
            A
          </span>
          aurora-prod
        </button>
        <div className="ml-nav-sec">Workspaces</div>
        {['Aurora', 'Platform', 'Payments'].map((w) => (
          <div key={w} className="ml-nav-item is-mute">
            {w}
          </div>
        ))}
      </aside>
      <div className="ml-hub-main">
        <header className="ml-hub-hero">
          <div>
            <div className="ml-hub-eyebrow">MagicLens</div>
            <h3>Clusters</h3>
            <p>Add, connect, and manage every Kubernetes cluster from one place.</p>
          </div>
          <button type="button" className="ml-btn-primary">
            <Plus size={14} /> Add cluster
          </button>
        </header>
        <div className="ml-hub-stats">
          <div>
            <b>3</b>
            <span>Total</span>
          </div>
          <div>
            <b>3</b>
            <span>Connected</span>
          </div>
          <div>
            <b>1</b>
            <span>Favorites</span>
          </div>
        </div>
        <div className="ml-hub-tools">
          <label className="ml-hub-search">
            <Search size={13} />
            <input placeholder="Search by name, context, endpoint…" />
          </label>
          <div className="ml-seg">
            <button type="button" className="is-on">
              All
            </button>
            <button type="button">Favorites</button>
            <button type="button">Connected</button>
          </div>
        </div>
        <div className="ml-hub-rows">
          {CLUSTERS.map((c, i) => (
            <div key={c.id} className={`ml-hub-row${i === 0 ? ' is-on' : ''}`}>
              <span className="ml-tab__logo" style={{ background: c.accent }}>
                {c.letter}
              </span>
              <div>
                <strong>{c.name}</strong>
                <em>{c.endpoint}</em>
              </div>
              <Star size={13} className={i === 0 ? 'is-star' : ''} />
              <span className="ml-status">
                <i />
                Connected
              </span>
              <span className="ml-hub-meta">v1.31.2 · 12 namespaces · 7 nodes</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
