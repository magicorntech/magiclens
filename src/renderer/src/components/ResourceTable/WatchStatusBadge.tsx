import { Badge, Tooltip } from 'antd'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'
import { useLiveRefreshStore } from '../../stores/liveRefreshStore'

interface WatchStatusBadgeProps {
  isError: boolean
  watchStatus: ResourceWatchStatus
}

export function WatchStatusBadge({ isError, watchStatus }: WatchStatusBadgeProps): React.JSX.Element {
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)

  if (isError) return <Badge status="error" text="Error" />

  switch (watchStatus) {
    case 'live':
      return (
        <Tooltip title="Streaming live updates via the Kubernetes Watch API">
          <Badge status="success" text="Live" />
        </Tooltip>
      )
    case 'connecting':
      return <Badge status="processing" text="Connecting..." />
    case 'reconnecting':
      return (
        <Tooltip title="Watch connection dropped, reconnecting automatically">
          <Badge status="warning" text="Reconnecting..." />
        </Tooltip>
      )
    case 'error':
      return <Badge status="error" text="Watch error" />
    case 'fallback-polling':
    case 'disconnected':
    default: {
      if (paused) return <Badge status="default" text="Paused" />
      if (interval === 'manual') return <Badge status="default" text="Manual" />
      return (
        <Tooltip title="Live watch unavailable — falling back to polling">
          <Badge status="processing" text={`Polling (${interval / 1000}s)`} />
        </Tooltip>
      )
    }
  }
}
