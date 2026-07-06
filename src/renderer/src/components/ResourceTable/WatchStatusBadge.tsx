import { Badge } from 'antd'
import { useLiveRefreshStore } from '../../stores/liveRefreshStore'

interface WatchStatusBadgeProps {
  isError: boolean
}

export function WatchStatusBadge({ isError }: WatchStatusBadgeProps): React.JSX.Element {
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)

  if (isError) return <Badge status="error" text="Error" />
  if (paused) return <Badge status="default" text="Paused" />
  if (interval === 'manual') return <Badge status="default" text="Manual" />
  return <Badge status="processing" text={`Polling (${interval / 1000}s)`} />
}
