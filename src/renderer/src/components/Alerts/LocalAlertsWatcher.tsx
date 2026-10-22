import { useEffect, useRef } from 'react'
import { evaluateLocalAlerts, type LocalAlert } from '@shared/localAlerts'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { TlsCertInfo } from '@shared/types/tlsCerts'
import { useClusterStore } from '../../stores/clusterStore'
import { useLocalAlertsStore } from '../../stores/localAlertsStore'

const POLL_MS = 30_000

async function listItems(clusterId: string, kind: ResourceKind): Promise<ResourceListItem[]> {
  const res = await window.api.resource.list({ clusterId, kind, namespace: 'ALL' })
  return 'items' in res ? res.items : []
}

async function listCerts(clusterId: string): Promise<TlsCertInfo[]> {
  const res = await window.api.certs.list({ clusterId })
  return 'items' in res ? res.items : []
}

export function LocalAlertsWatcher(): null {
  const enabled = useLocalAlertsStore((s) => s.enabled)
  const osNotify = useLocalAlertsStore((s) => s.osNotify)
  const ingest = useLocalAlertsStore((s) => s.ingest)
  const prefsKey = useLocalAlertsStore((s) => JSON.stringify(s.prefs))
  const clusterKey = useClusterStore((s) =>
    s.clusters
      .filter((c) => c.status === 'connected')
      .map((c) => c.id)
      .sort()
      .join(',')
  )
  const inFlight = useRef(false)

  useEffect(() => {
    if (!enabled) {
      ingest([], { osNotify: false, recordHistory: false })
      return
    }

    let cancelled = false

    async function poll(): Promise<void> {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const connected = useClusterStore.getState().clusters.filter((c) => c.status === 'connected')
        const batches = await Promise.all(
          connected.map(async (cluster) => {
            const [pods, nodes, jobs, deployments, certs] = await Promise.all([
              listItems(cluster.id, 'Pods'),
              listItems(cluster.id, 'Nodes'),
              listItems(cluster.id, 'Jobs'),
              listItems(cluster.id, 'Deployments'),
              listCerts(cluster.id)
            ])
            return evaluateLocalAlerts(
              {
                clusterId: cluster.id,
                clusterName: cluster.customName,
                pods,
                nodes,
                jobs,
                deployments,
                certs
              },
              useLocalAlertsStore.getState().prefs
            )
          })
        )
        if (cancelled) return
        const alerts: LocalAlert[] = batches.flat()
        ingest(alerts, { osNotify, recordHistory: true })
      } catch (err) {
        console.warn('[alerts] poll failed', err)
      } finally {
        inFlight.current = false
      }
    }

    void poll()
    const id = window.setInterval(() => void poll(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, osNotify, ingest, clusterKey, prefsKey])

  return null
}
