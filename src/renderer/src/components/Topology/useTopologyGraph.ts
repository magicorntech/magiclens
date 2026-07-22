import { useCallback, useEffect, useRef, useState } from 'react'
import type { TopologyGraphResponse } from '@shared/types/topology'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'
import { useResourceList } from '../../queries/useResourceList'

export function useTopologyGraph(clusterId: string, namespace: string): {
  data: TopologyGraphResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  live: boolean
  watchStatus: import('@shared/types/resourceWatch').ResourceWatchStatus
  refresh: () => Promise<void>
} {
  const enabled = Boolean(clusterId && namespace && namespace !== 'ALL')
  const [data, setData] = useState<TopologyGraphResponse | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const hasDataRef = useRef(false)

  const pods = useResourceList(enabled ? clusterId : null, namespace, 'Pods', enabled)
  const deps = useResourceList(enabled ? clusterId : null, namespace, 'Deployments', enabled)
  const sts = useResourceList(enabled ? clusterId : null, namespace, 'StatefulSets', enabled)
  const svcs = useResourceList(enabled ? clusterId : null, namespace, 'Services', enabled)
  const ings = useResourceList(enabled ? clusterId : null, namespace, 'Ingresses', enabled)
  const cms = useResourceList(enabled ? clusterId : null, namespace, 'ConfigMaps', enabled)
  const rss = useResourceList(enabled ? clusterId : null, namespace, 'ReplicaSets', enabled)

  const watchStatuses: ResourceWatchStatus[] = [
    pods.watchStatus,
    deps.watchStatus,
    sts.watchStatus,
    svcs.watchStatus,
    ings.watchStatus,
    cms.watchStatus,
    rss.watchStatus
  ]
  const watchStatus: ResourceWatchStatus = !enabled
    ? 'disconnected'
    : watchStatuses.some((s) => s === 'live')
      ? 'live'
      : watchStatuses.some((s) => s === 'reconnecting')
        ? 'reconnecting'
        : watchStatuses.some((s) => s === 'connecting')
          ? 'connecting'
          : watchStatuses.some((s) => s === 'fallback-polling')
            ? 'fallback-polling'
            : watchStatuses.some((s) => s === 'error')
              ? 'error'
              : 'disconnected'
  const live = watchStatus === 'live' || watchStatus === 'reconnecting'

  const dataUpdatedAt = [
    pods.dataUpdatedAt,
    deps.dataUpdatedAt,
    sts.dataUpdatedAt,
    svcs.dataUpdatedAt,
    ings.dataUpdatedAt,
    cms.dataUpdatedAt,
    rss.dataUpdatedAt
  ].join(':')

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
    if (!enabled) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void refresh({ silent: true })
    }, 150)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [dataUpdatedAt, refresh, enabled])

  return { data, loading, refreshing, error, live, watchStatus, refresh: () => refresh({ silent: false }) }
}
