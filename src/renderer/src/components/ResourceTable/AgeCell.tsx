import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useSharedClockTick } from '@renderer/hooks/useSharedClockTick'

dayjs.extend(relativeTime)

interface AgeCellProps {
  timestamp: string | null
}

export function AgeCell({ timestamp }: AgeCellProps): React.JSX.Element {
  useSharedClockTick()

  if (!timestamp) return <span>-</span>
  return <span>{dayjs(timestamp).fromNow(true)}</span>
}
