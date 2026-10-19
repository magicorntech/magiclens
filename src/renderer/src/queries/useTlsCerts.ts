import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tlsCertKey, type TlsCertInfo } from '@shared/types/tlsCerts'
import { useLiveRefreshStore } from '../stores/liveRefreshStore'
import { useIsWindowFocused } from '../stores/useIsWindowFocused'
import { useClusterConnected } from './useClusterConnected'

export function useTlsCerts(
  clusterId: string | null,
  isActive: boolean
): { items: TlsCertInfo[]; byKey: Map<string, TlsCertInfo>; error: string | null } {
  const isConnected = useClusterConnected(clusterId)
  const interval = useLiveRefreshStore((s) => s.interval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const windowFocused = useIsWindowFocused()
  const shouldPoll = isActive && isConnected && windowFocused && !paused
  const refetchInterval = shouldPoll ? (interval === 'manual' ? 60_000 : Math.max(interval, 30_000)) : false

  const query = useQuery({
    queryKey: ['tls-certs', clusterId],
    queryFn: async () => {
      const res = await window.api.certs.list({ clusterId: clusterId as string })
      if ('error' in res) return []
      return res.items
    },
    enabled: isConnected && !!clusterId && isActive,
    refetchInterval,
    placeholderData: keepPreviousData,
    retry: 1
  })

  return useMemo(() => {
    const items = query.data ?? []
    const byKey = new Map<string, TlsCertInfo>()
    for (const item of items) byKey.set(tlsCertKey(item.namespace, item.name), item)
    return {
      items,
      byKey,
      error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null
    }
  }, [query.data, query.error])
}
