import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { queryClient } from './queries/queryClient'
import { cancelClusterQueries } from './queries/cancelClusterQueries'
import { useClusterStore } from './stores/clusterStore'
import { usePodMetricsHistoryStore } from './stores/podMetricsHistoryStore'
import { useNodeMetricsHistoryStore } from './stores/nodeMetricsHistoryStore'

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

function clearClusterMetricsHistory(clusterId: string): void {
  const podStore = usePodMetricsHistoryStore.getState()
  const nodeStore = useNodeMetricsHistoryStore.getState()
  const nextPods = new Map(podStore.historyByPod)
  const nextPodOrder = podStore.accessOrder.filter((key) => {
    if (!key.startsWith(`${clusterId}:`)) return true
    nextPods.delete(key)
    return false
  })
  usePodMetricsHistoryStore.setState({ historyByPod: nextPods, accessOrder: nextPodOrder })

  const nextNodes = new Map(nodeStore.historyByNode)
  const nextNodeOrder = nodeStore.accessOrder.filter((key) => {
    if (!key.startsWith(`${clusterId}:`)) return true
    nextNodes.delete(key)
    return false
  })
  useNodeMetricsHistoryStore.setState({ historyByNode: nextNodes, accessOrder: nextNodeOrder })
}

export async function disconnectCluster(clusterId: string): Promise<void> {
  cancelClusterQueries(queryClient, clusterId)
  clearClusterMetricsHistory(clusterId)
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
