import type { LucideIcon } from 'lucide-react'
import { Box, FileSearch, Inbox, ScrollText, BarChart3 } from 'lucide-react'
import { Icon } from './Icon'

interface EmptyIllustrationProps {
  icon: LucideIcon
  accent?: string
}

function EmptyIllustration({ icon, accent = 'var(--ml-primary)' }: EmptyIllustrationProps): React.JSX.Element {
  return (
    <div className="ml-empty-illustration" style={{ color: accent }}>
      <div className="ml-empty-illustration-ring" />
      <div className="ml-empty-illustration-icon">
        <Icon icon={icon} size={28} strokeWidth={1.5} />
      </div>
    </div>
  )
}

export const emptyIllustrations = {
  default: () => <EmptyIllustration icon={Inbox} />,
  pods: () => <EmptyIllustration icon={Box} accent="#38bdf8" />,
  logs: () => <EmptyIllustration icon={ScrollText} accent="#a78bfa" />,
  metrics: () => <EmptyIllustration icon={BarChart3} accent="#34d399" />,
  search: () => <EmptyIllustration icon={FileSearch} accent="#f59e0b" />
} as const
