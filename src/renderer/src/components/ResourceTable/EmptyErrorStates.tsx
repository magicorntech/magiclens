import { Button, Spin } from 'antd'
import { SearchX } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { MotionDiv, slideUp } from '../ui/Motion'
import { emptyIllustrations } from '../ui/EmptyIllustration'

function SkeletonRows(): React.JSX.Element {
  return (
    <div className="ml-skeleton-table" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="ml-skeleton-row" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

export function LoadingState({ variant = 'spin' }: { variant?: 'spin' | 'skeleton' }): React.JSX.Element {
  if (variant === 'skeleton') return <SkeletonRows />
  return (
    <div className="ml-loading-state">
      <Spin size="large" />
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <MotionDiv className="ml-empty-state ml-empty-state--error" {...slideUp}>
      <div className="ml-empty-state-icon ml-empty-state-icon--danger">
        <Icon icon={SearchX} size={28} strokeWidth={1.5} />
      </div>
      <h3 className="ml-empty-state-title">Failed to load resources</h3>
      <p className="ml-empty-state-desc">{message}</p>
      <Button type="primary" onClick={onRetry}>
        Retry
      </Button>
    </MotionDiv>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  variant?: keyof typeof emptyIllustrations
}

export function EmptyState({
  title = 'No resources found',
  description = 'Try changing the namespace filter or create a new resource.',
  variant = 'default'
}: EmptyStateProps): React.JSX.Element {
  const Illustration = emptyIllustrations[variant]
  return (
    <MotionDiv className="ml-empty-state" {...slideUp}>
      <Illustration />
      <h3 className="ml-empty-state-title">{title}</h3>
      <p className="ml-empty-state-desc">{description}</p>
    </MotionDiv>
  )
}

export function EmptyPodsState(): React.JSX.Element {
  return <EmptyState title="No pods yet" description="Deploy a workload or adjust your namespace filter." variant="pods" />
}
