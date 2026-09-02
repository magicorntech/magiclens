import type { ReactNode } from 'react'

/**
 * Shared header for every Argo page, so the four of them read as one section rather than four
 * separately-styled screens. Mirrors `.ml-overview-page__header`'s title/subtitle/actions shape.
 */
export function ArgoPageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <header className="ml-argo-header">
      <div className="ml-argo-header__text">
        <h2 className="ml-argo-header__title">{title}</h2>
        {subtitle ? <p className="ml-argo-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ml-argo-header__actions">{actions}</div> : null}
    </header>
  )
}
