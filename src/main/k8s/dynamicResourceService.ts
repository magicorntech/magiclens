import type { KubernetesObject } from '@kubernetes/client-node'
import type { DynamicResourceItem } from '@shared/types/discovery'
import type { ClusterClients } from './clusterManager'

function toItem(obj: KubernetesObject): DynamicResourceItem {
  const m = obj.metadata ?? {}
  return {
    id: m.uid ?? `${m.namespace ?? ''}/${m.name ?? ''}`,
    name: m.name ?? '',
    namespace: m.namespace ?? '',
    ageTimestamp: m.creationTimestamp ? new Date(m.creationTimestamp).toISOString() : null,
    labelKeys: Object.keys(m.labels ?? {})
  }
}

/** Lists any Kubernetes object type by GVK using the fully generic KubernetesObjectApi client —
 * no per-kind code required, so this works for built-ins, CRDs, and operator resources alike. */
export async function listDynamicResources(
  clients: ClusterClients,
  apiVersion: string,
  kind: string,
  namespaced: boolean,
  namespace: string | 'ALL'
): Promise<DynamicResourceItem[]> {
  const ns = namespaced && namespace !== 'ALL' ? namespace : undefined
  const res = await clients.objects.list(apiVersion, kind, ns)
  return (res.items ?? []).map(toItem)
}

export async function dynamicResourceHasInstances(
  clients: ClusterClients,
  apiVersion: string,
  kind: string
): Promise<boolean> {
  try {
    const res = await clients.objects.list(
      apiVersion,
      kind,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1
    )
    return (res.items?.length ?? 0) > 0
  } catch {
    return false
  }
}
