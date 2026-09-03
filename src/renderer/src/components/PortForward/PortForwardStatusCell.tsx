import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Tag } from 'antd'
import { useSharedClockTick } from '@renderer/hooks/useSharedClockTick'

dayjs.extend(relativeTime)

export function PortForwardStartedCell({ startedAt }: { startedAt: string }): React.JSX.Element {
  useSharedClockTick()
  return <span>{dayjs(startedAt).fromNow(true)}</span>
}

export function PortForwardStatusCell({ idleSince }: { idleSince: string | null }): React.JSX.Element {
  useSharedClockTick()
  if (!idleSince) return <Tag color="green">Active</Tag>
  return <Tag color="gold">Idle {dayjs(idleSince).fromNow(true)}</Tag>
}
