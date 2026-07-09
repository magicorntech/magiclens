import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'

interface MetricStatChipProps {
  icon: LucideIcon
  label: string
  value: string
  accent?: string
}

export function MetricStatChip({ icon, label, value, accent }: MetricStatChipProps): React.JSX.Element {
  return (
    <div className="ml-metric-stat-chip">
      <Icon icon={icon} variant="action" color={accent ?? 'var(--ml-text-secondary)'} />
      <div className="ml-metric-stat-chip-body">
        <span className="ml-metric-stat-chip-value">{value}</span>
        <span className="ml-metric-stat-chip-label">{label}</span>
      </div>
    </div>
  )
}
