import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

interface HubPageHeroProps {
  icon: LucideIcon
  eyebrow: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

/** Shared MagicLens hub hero — Sparks / Clusters / VPN. */
export function HubPageHero({
  icon,
  eyebrow,
  title,
  subtitle,
  actions,
  className
}: HubPageHeroProps): React.JSX.Element {
  return (
    <header className={`ml-hub-hero${className ? ` ${className}` : ''}`}>
      <div className="ml-hub-hero__copy">
        <div className="ml-hub-hero__mark">
          <Icon icon={icon} size={22} />
        </div>
        <div>
          <p className="ml-hub-hero__eyebrow">{eyebrow}</p>
          <h1 className="ml-hub-hero__title">{title}</h1>
          {subtitle ? <p className="ml-hub-hero__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="ml-hub-hero__actions">{actions}</div> : null}
    </header>
  )
}
