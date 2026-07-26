import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { TopologyNode, TopologyNodeKind } from '@shared/types/topology'

export function topologyToResourceKind(kind: TopologyNodeKind): ResourceKind | null {
  switch (kind) {
    case 'Pod':
      return 'Pods'
    case 'Deployment':
      return 'Deployments'
    case 'StatefulSet':
      return 'StatefulSets'
    case 'ReplicaSet':
      return 'ReplicaSets'
    case 'Service':
      return 'Services'
    case 'Ingress':
      return 'Ingresses'
    case 'ConfigMap':
      return 'ConfigMaps'
    default:
      return null
  }
}

export function topologyToListItem(node: TopologyNode): ResourceListItem {
  return {
    id: node.id,
    name: node.name,
    namespace: node.namespace,
    ageTimestamp: node.ageTimestamp ?? null,
    statusText: node.healthDetail || node.status,
    statusColor:
      node.status === 'healthy'
        ? 'green'
        : node.status === 'error'
          ? 'red'
          : node.status === 'degraded'
            ? 'gold'
            : 'default',
    columns: {}
  }
}
