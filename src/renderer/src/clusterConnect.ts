import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { queryClient } from './queries/queryClient'
import { cancelClusterQueries } from './queries/cancelClusterQueries'
import { useClusterStore } from './stores/clusterStore'

export async function connectCluster(clusterId: string, source: KubeconfigSource, contextName: string): Promise<void> {
  const { setClusterStatus, setClusterConnected } = useClusterStore.getState()
  setClusterStatus(clusterId, 'connecting')
  try {
    const result = await window.api.cluster.connect({ clusterId, source, contextName })
    if (result.ok) {
      const namespacesRes = await window.api.cluster.listNamespaces({ clusterId })
      setClusterConnected(clusterId, result.serverVersion, namespacesRes.namespaces, result.endpoint)
      const manualUrl = useClusterStore.getState().clusters.find((c) => c.id === clusterId)?.prometheusUrl
      void window.api.prometheus.discover({ clusterId, manualUrl })
    } else {
      setClusterStatus(clusterId, 'error', result.error)
    }
  } catch (err) {
    setClusterStatus(clusterId, 'error', err instanceof Error ? err.message : String(err))
  }
}

export async function disconnectCluster(clusterId: string): Promise<void> {
  cancelClusterQueries(queryClient, clusterId)
  await window.api.cluster.disconnect({ clusterId })
  useClusterStore.setState((state) => ({
    clusters: state.clusters.map((c) =>
      c.id === clusterId
        ? {
            ...c,
            status: 'disconnected',
            errorMessage: undefined,
            serverVersion: undefined,
            namespaces: undefined
          }
        : c
    )
  }))
}
