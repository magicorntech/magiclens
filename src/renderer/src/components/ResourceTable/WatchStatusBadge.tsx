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

  if (isError) {
    return (
      <Tooltip title="Watch error">
        <span className="ml-live-badge ml-live-badge--dot">
          <Badge status="error" />
        </span>
      </Tooltip>
    )
  }

  switch (watchStatus) {
    case 'live':
      return (
        <Tooltip title="Streaming live updates via the Kubernetes Watch API">
          <span className="ml-live-badge ml-live-badge--dot">
            <Badge status="success" />
          </span>
        </Tooltip>
      )
    case 'connecting':
      return (
        <Tooltip title="Connecting…">
          <span className="ml-live-badge ml-live-badge--dot">
            <Badge status="processing" />
          </span>
        </Tooltip>
      )
    case 'reconnecting':
      return (
        <Tooltip title="Watch connection dropped, reconnecting automatically">
          <span className="ml-live-badge ml-live-badge--dot">
            <Badge status="warning" />
          </span>
        </Tooltip>
      )
    case 'error':
      return (
        <Tooltip title="Watch error">
          <span className="ml-live-badge ml-live-badge--dot">
            <Badge status="error" />
          </span>
        </Tooltip>
      )
    case 'fallback-polling':
    case 'disconnected':
    default: {
      if (paused) {
        return (
          <Tooltip title="Paused">
            <span className="ml-live-badge ml-live-badge--dot">
              <Badge status="default" />
            </span>
          </Tooltip>
        )
      }
      if (interval === 'manual') {
        return (
          <Tooltip title="Manual refresh">
            <span className="ml-live-badge ml-live-badge--dot">
              <Badge status="default" />
            </span>
          </Tooltip>
        )
      }
      return (
        <Tooltip title={`Live watch unavailable — polling every ${interval / 1000}s`}>
          <span className="ml-live-badge ml-live-badge--dot">
            <Badge status="processing" />
          </span>
        </Tooltip>
      )
    }
  }
}
