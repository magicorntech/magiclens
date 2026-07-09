import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { IngressHostsCell } from './IngressHostsCell'
import { PodContainersCell } from './PodContainersCell'
import { ReadyRatioCell } from './ReadyRatioCell'
import { ResourceTableLinkCell } from './ResourceTableLinkCell'

const READY_COLUMN_KINDS = new Set<ResourceKind>([
  'Deployments',
  'StatefulSets',
  'DaemonSets',
  'ReplicaSets',
  'ReplicationControllers',
  'Pods'
])

export interface ResourceColumnActions {
  onNamespaceFilter?: (namespace: string) => void
  onNavigateToNode?: (nodeName: string) => void
}

export function renderResourceColumnCell(
  kind: ResourceKind,
  columnKey: string,
  item: ResourceListItem,
  actions?: ResourceColumnActions
): React.ReactNode {
  const value = item.columns[columnKey]

  if (kind === 'Ingresses' && columnKey === 'hosts') {
    return <IngressHostsCell hosts={value} tlsHosts={item.columns.tlsHosts} />
  }

  if (kind === 'Pods' && columnKey === 'containers') {
    return <PodContainersCell data={value} />
  }

  if (kind === 'Pods' && columnKey === 'node' && actions?.onNavigateToNode && value && value !== '-') {
    return (
      <ResourceTableLinkCell
        label={value ?? '-'}
        title={`Open node ${value}`}
        onClick={() => actions.onNavigateToNode!(value!)}
      />
    )
  }

  if (READY_COLUMN_KINDS.has(kind) && columnKey === 'ready') {
    return <ReadyRatioCell value={value} />
  }

  if (columnKey === 'message' && value) {
    return <span className="ml-table-cell-text" title={value}>{value}</span>
  }

  if (value === undefined || value === '') return '-'
  return <span className="ml-table-cell-text" title={value}>{value}</span>
}

export function renderNamespaceCell(
  namespace: string,
  actions?: ResourceColumnActions
): React.ReactNode {
  if (!namespace) return '-'
  if (!actions?.onNamespaceFilter) {
    return <span className="ml-table-cell-text" title={namespace}>{namespace}</span>
  }
  return (
    <ResourceTableLinkCell
      label={namespace}
      title={`Filter to namespace ${namespace}`}
      onClick={() => actions.onNamespaceFilter!(namespace)}
    />
  )
}

export function columnUsesRichRender(kind: ResourceKind, columnKey: string): boolean {
  if (kind === 'Ingresses' && columnKey === 'hosts') return true
  if (kind === 'Pods' && columnKey === 'containers') return true
  if (kind === 'Pods' && columnKey === 'node') return true
  if (READY_COLUMN_KINDS.has(kind) && columnKey === 'ready') return true
  if (columnKey === 'message') return true
  return false
}
