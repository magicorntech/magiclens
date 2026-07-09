interface ProgressBarProps {
  label: string
  percent?: number
  detail?: string
  accent?: string
  size?: 'sm' | 'md'
  animated?: boolean
}

export function ProgressBar({
  label,
  percent,
  detail,
  accent = 'var(--ml-primary)',
  size = 'md',
  animated = true
}: ProgressBarProps): React.JSX.Element {
  const clamped = percent !== undefined ? Math.min(100, Math.max(0, percent)) : undefined
  const statusClass =
    clamped !== undefined && clamped >= 90 ? ' ml-progress-bar--critical' : clamped !== undefined && clamped >= 75 ? ' ml-progress-bar--warn' : ''
  const showLabel = label.length > 0

  return (
    <div className={`ml-progress-bar ml-progress-bar--${size}${statusClass}`}>
      {(showLabel || clamped !== undefined) && (
        <div className="ml-progress-bar-head">
          {showLabel && <span className="ml-progress-bar-label">{label}</span>}
          {clamped !== undefined && <span className="ml-progress-bar-pct">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className="ml-progress-bar-track">
        {clamped !== undefined && (
          <div
            className={`ml-progress-bar-fill${animated ? ' ml-progress-bar-fill--animated' : ''}`}
            style={{ width: `${clamped}%`, background: accent }}
          />
        )}
      </div>
      {detail && <span className="ml-progress-bar-detail">{detail}</span>}
    </div>
  )
}
