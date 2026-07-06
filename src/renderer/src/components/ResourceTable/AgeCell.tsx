import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface AgeCellProps {
  timestamp: string | null
}

export function AgeCell({ timestamp }: AgeCellProps): React.JSX.Element {
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!timestamp) return <span>-</span>
  return <span>{dayjs(timestamp).fromNow(true)}</span>
}
