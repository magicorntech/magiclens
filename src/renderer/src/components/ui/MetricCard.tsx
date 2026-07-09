import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'
import { MotionDiv, slideUp } from './Motion'

interface MetricCardProps {
  icon: LucideIcon
  title: string
  value: string
  subtitle?: string
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  accent?: string
}

export function MetricCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  accent = 'var(--ml-primary)'
}: MetricCardProps): React.JSX.Element {
  return (
    <MotionDiv className="ml-metric-card" {...slideUp}>
      <div className="ml-metric-card-icon" style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
        <Icon icon={icon} variant="toolbar" />
      </div>
      <div className="ml-metric-card-body">
        <span className="ml-metric-card-title">{title}</span>
        <span className="ml-metric-card-value">{value}</span>
        {subtitle && <span className="ml-metric-card-subtitle">{subtitle}</span>}
        {trend && (
          <span className={`ml-metric-card-trend ml-metric-card-trend--${trend.direction}`}>
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '•'} {trend.label}
          </span>
        )}
      </div>
    </MotionDiv>
  )
}
