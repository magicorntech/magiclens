import { useLiveRefreshStore } from './liveRefreshStore'
import { useIsWindowFocused } from './useIsWindowFocused'

export function useLiveRefetchInterval(isActiveTab: boolean): number | false {
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()

  return isActiveTab && windowFocused && !paused && interval !== 'manual' ? interval : false
}
