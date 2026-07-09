import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'
import { MotionDiv, scaleIn } from './Motion'

interface ResourceUsageCardProps {
  icon: LucideIcon
  label: string
  percent?: number
  usage: string
  capacity: string
  accent?: string
  unavailable?: boolean
}

export function ResourceUsageCard({
  icon,
  label,
  percent,
  usage,
  capacity,
  accent = 'var(--ml-primary)',
  unavailable
}: ResourceUsageCardProps): React.JSX.Element {
  return (
    <MotionDiv className="ml-resource-usage-card" {...scaleIn}>
      <div className="ml-resource-usage-card-head">
        <span className="ml-resource-usage-card-icon">
          <Icon icon={icon} variant="action" color={accent} />
        </span>
        <span className="ml-resource-usage-card-label">{label}</span>
        {percent !== undefined && !unavailable && (
          <span className="ml-resource-usage-card-pct">{Math.round(percent)}%</span>
        )}
      </div>
      <span className="ml-resource-usage-card-values">
        {unavailable ? 'Unavailable' : `${usage} / ${capacity}`}
      </span>
      <ProgressBar
        label=""
        percent={unavailable ? undefined : percent}
        accent={accent}
        size="sm"
      />
    </MotionDiv>
  )
}
