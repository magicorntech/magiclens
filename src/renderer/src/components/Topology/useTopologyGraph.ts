import { useCallback, useEffect, useRef, useState } from 'react'
import type { TopologyGraphResponse } from '@shared/types/topology'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'
import { useLiveRefreshStore } from '../../stores/liveRefreshStore'

const DEFAULT_POLL_MS = 5_000
const MIN_POLL_MS = 3_000

/**
 * Topology used to open 7 simultaneous Kubernetes informers (Pods, Deployments, …)
 * just to detect changes, then re-fetch the full graph. That duplicated large object
 * caches in the main process and ballooned RAM on Apple Silicon. A single polled
 * topology:getGraph call is enough for this view.
 */
export function useTopologyGraph(clusterId: string, namespace: string): {
  data: TopologyGraphResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  live: boolean
  watchStatus: ResourceWatchStatus
  refresh: () => Promise<void>
} {
  const enabled = Boolean(clusterId && namespace && namespace !== 'ALL')
  const [data, setData] = useState<TopologyGraphResponse | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const hasDataRef = useRef(false)
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled) {
        setData(null)
        setLoading(false)
        setRefreshing(false)
        setError(null)
        hasDataRef.current = false
        return
      }
      const silent = opts?.silent === true && hasDataRef.current
      const my = ++seq.current
      if (silent) setRefreshing(true)
      else {
        setLoading(true)
        setError(null)
      }
      try {
        const res = await window.api.topology.getGraph({ clusterId, namespace })
        if (my !== seq.current) return
        if ('error' in res) {
          setError(res.error)
          if (!silent) setData(null)
          hasDataRef.current = false
        } else {
          setData(res)
          setError(null)
          hasDataRef.current = true
        }
      } catch (err) {
        if (my !== seq.current) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (my === seq.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [clusterId, namespace, enabled]
  )

  useEffect(() => {
    void refresh({ silent: false })
  }, [refresh])

  useEffect(() => {
    if (!enabled || paused || interval === 'manual') return
    const ms = Math.max(MIN_POLL_MS, typeof interval === 'number' ? interval : DEFAULT_POLL_MS)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void refresh({ silent: true })
    }, ms)
    return () => window.clearInterval(id)
  }, [enabled, paused, interval, refresh])

  const watchStatus: ResourceWatchStatus = !enabled
    ? 'disconnected'
    : error
      ? 'error'
      : loading && !hasDataRef.current
        ? 'connecting'
        : paused || interval === 'manual'
          ? 'fallback-polling'
          : 'live'

  return {
    data,
    loading,
    refreshing,
    error,
    live: watchStatus === 'live',
    watchStatus,
    refresh: () => refresh({ silent: false })
  }
}
