import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VisualizerGraphResponse } from '@shared/types/visualizer'
import { ALL_NAMESPACES } from '@shared/namespaceSelection'
import { loadVisualizerGraph } from './loadVisualizerGraph'

const DEFAULT_POLL_MS = 20_000
const MIN_POLL_MS = 12_000

export function useVisualizerGraph(clusterId: string, namespace: string = ALL_NAMESPACES): {
  data: VisualizerGraphResponse | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const enabled = Boolean(clusterId)
  const [data, setData] = useState<VisualizerGraphResponse | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const hasData = useRef(false)

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled) {
        setData(null)
        setLoading(false)
        setError(null)
        hasData.current = false
        return
      }
      const silent = opts?.silent === true && hasData.current
      const my = ++seq.current
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const res = await loadVisualizerGraph({
          clusterId,
          namespace: namespace || ALL_NAMESPACES
        })
        if (my !== seq.current) return
        if ('error' in res) {
          setError(res.error)
          if (!silent) setData(null)
          hasData.current = false
        } else {
          setData(res)
          setError(null)
          hasData.current = true
        }
      } catch (err) {
        if (my !== seq.current) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (my === seq.current) setLoading(false)
      }
    },
    [clusterId, namespace, enabled]
  )

  useEffect(() => {
    void refresh({ silent: false })
  }, [refresh])

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void refresh({ silent: true })
    }, Math.max(MIN_POLL_MS, DEFAULT_POLL_MS))
    return () => window.clearInterval(id)
  }, [enabled, refresh])

  return {
    data,
    loading,
    error,
    refresh: useMemo(() => () => refresh({ silent: false }), [refresh])
  }
}
