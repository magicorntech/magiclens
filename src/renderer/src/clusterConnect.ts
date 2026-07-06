import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { useClusterStore } from './stores/clusterStore'

export async function connectCluster(clusterId: string, source: KubeconfigSource, contextName: string): Promise<void> {
  const { setClusterStatus, setClusterConnected } = useClusterStore.getState()
  setClusterStatus(clusterId, 'connecting')
  try {
    const result = await window.api.cluster.connect({ clusterId, source, contextName })
    if (result.ok) {
      const namespacesRes = await window.api.cluster.listNamespaces({ clusterId })
      setClusterConnected(clusterId, result.serverVersion, namespacesRes.namespaces, result.endpoint)
    } else {
      setClusterStatus(clusterId, 'error', result.error)
    }
  } catch (err) {
    setClusterStatus(clusterId, 'error', err instanceof Error ? err.message : String(err))
  }
}
