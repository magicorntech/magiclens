import { useState } from 'react'
import { TIMELINE } from '../data'

export function TimelineSlice() {
  const [hover, setHover] = useState<(typeof TIMELINE)[0] | null>(null)
  return (
    <div className="ml-timeline">
      <div className="ml-page-toolbar">
        <span className="ml-kind-chip">Timeline</span>
        <select className="ml-ns" defaultValue="shop">
          <option>shop</option>
          <option>payments</option>
          <option>data</option>
        </select>
        <div className="ml-seg">
          <button type="button" className="is-on">
            All
          </button>
          <button type="button">Warning</button>
          <button type="button">Normal</button>
        </div>
        <input className="ml-search" placeholder="Filter reason / message…" />
      </div>
      <div className="ml-timeline-density">
        {Array.from({ length: 40 }, (_, i) => (
          <i key={i} style={{ height: `${8 + ((i * 7) % 18)}px`, opacity: 0.35 + ((i * 3) % 10) / 20 }} />
        ))}
      </div>
      <div className="ml-timeline-axis">
        <span>−30m</span>
        <span>−20m</span>
        <span>−10m</span>
        <span>now</span>
      </div>
      <div className="ml-timeline-rows">
        {TIMELINE.map((bar) => (
          <div key={`${bar.object}-${bar.reason}`} className="ml-timeline-row">
            <div className="ml-timeline-label">
              <em>{bar.kind}</em>
              <strong>{bar.object}</strong>
            </div>
            <div className="ml-timeline-track">
              <button
                type="button"
                className={`ml-timeline-bar ml-timeline-bar--${bar.type.toLowerCase()}`}
                style={{ left: `${bar.start}%`, width: `${bar.width}%` }}
                onMouseEnter={() => setHover(bar)}
                onMouseLeave={() => setHover(null)}
              >
                {bar.reason}
              </button>
            </div>
          </div>
        ))}
      </div>
      {hover ? (
        <div className="ml-timeline-tip">
          <b>
            {hover.kind}/{hover.object}
          </b>
          <span>
            {hover.reason} · {hover.type} · ×{hover.count}
          </span>
        </div>
      ) : null}
    </div>
  )
}
