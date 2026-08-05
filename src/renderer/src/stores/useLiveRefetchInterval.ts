import { useLiveRefreshStore } from './liveRefreshStore'
import { useIsWindowFocused } from './useIsWindowFocused'

export function useLiveRefetchInterval(isActiveTab: boolean): number | false {
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()

  return isActiveTab && windowFocused && !paused && interval !== 'manual' ? interval : false
}

/**
 * Poll interval for resource lists when the live watch is unavailable.
 * Caps at 1s (even in manual mode) so new/deleted resources still show up
 * quickly; respects pause and window focus.
 */
export function useWatchFallbackPollInterval(isActiveTab: boolean): number | false {
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()

  if (!isActiveTab || !windowFocused || paused) return false
  return interval === 'manual' ? 1000 : Math.min(interval, 1000)
}
