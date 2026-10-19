import { usagePercent } from '@shared/quantity'
import { ProgressBar } from '../ui/ProgressBar'

export function UsageRequestCell({
  usage,
  request,
  formatUsage,
  formatRequest
}: {
  usage?: number
  request?: number
  formatUsage: (n: number) => string
  formatRequest: (n: number) => string
}): React.JSX.Element {
  if (usage == null) return <span>—</span>
  const req = request && request > 0 ? request : 0
  const pct = usagePercent(usage, req)
  return (
    <div className="ml-node-metric-cell ml-node-metric-cell--table">
      {pct != null ? <ProgressBar label="" percent={Math.min(pct, 100)} size="sm" /> : null}
      <span className={`ml-node-metric-cell-pct${pct != null && pct > 100 ? ' is-over' : ''}`}>
        {pct != null ? `${Math.round(pct)}%` : '—'}
      </span>
      <span className="ml-node-metric-cell-detail">
        {formatUsage(usage)}
        {req > 0 ? ` / ${formatRequest(req)}` : ''}
      </span>
    </div>
  )
}
