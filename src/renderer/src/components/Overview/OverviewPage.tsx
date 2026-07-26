import type { ReactNode } from 'react'

export function OverviewPage({
  title,
  subtitle,
  actions,
  children
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="ml-overview-page">
      <header className="ml-overview-page__header">
        <div>
          <h2 className="ml-overview-page__title">{title}</h2>
          {subtitle ? <p className="ml-overview-page__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ml-overview-page__actions">{actions}</div> : null}
      </header>
      <div className="ml-overview-page__body">{children}</div>
    </div>
  )
}

export function OverviewGrid({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="ml-overview-grid">{children}</div>
}

export function OverviewStat({
  label,
  value,
  hint,
  tone
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'ok' | 'warn' | 'error' | 'neutral'
}): React.JSX.Element {
  return (
    <div className={`ml-overview-stat${tone ? ` ml-overview-stat--${tone}` : ''}`}>
      <span className="ml-overview-stat__label">{label}</span>
      <span className="ml-overview-stat__value">{value}</span>
      {hint ? <span className="ml-overview-stat__hint">{hint}</span> : null}
    </div>
  )
}
