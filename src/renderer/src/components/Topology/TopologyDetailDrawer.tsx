import { Alert, Drawer, Typography } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { TopologyNode, TopologyNodeKind } from '@shared/types/topology'
import { ResourceDetailDrawer } from '../ResourceTable/ResourceDetailDrawer'

function toResourceKind(kind: TopologyNodeKind): ResourceKind | null {
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

function toListItem(node: TopologyNode): ResourceListItem {
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

interface TopologyDetailDrawerProps {
  open: boolean
  clusterId: string
  node: TopologyNode | null
  onClose: () => void
}

export function TopologyDetailDrawer({
  open,
  clusterId,
  node,
  onClose
}: TopologyDetailDrawerProps): React.JSX.Element {
  const kind = node ? toResourceKind(node.kind) : null
  const item = node && kind ? toListItem(node) : null

  if (node?.kind === 'External') {
    return (
      <Drawer open={open} onClose={onClose} title={node.name} width={420} destroyOnHidden>
        <Alert
          type="info"
          showIcon
          message="External dependency"
          description={
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {node.protocol ? `Kind: ${node.protocol}` : null}
              {node.externalHost ? (
                <>
                  <br />
                  Host: {node.externalHost}
                </>
              ) : null}
              <br />
              Declared via magiclens.io/depends-on (or magiclens.io/external-db) annotations.
            </Typography.Paragraph>
          }
        />
      </Drawer>
    )
  }

  return (
    <ResourceDetailDrawer
      open={open && !!item && !!kind}
      clusterId={clusterId}
      kind={kind ?? 'Pods'}
      item={item}
      isActive={open}
      listQueryKey={['topology', clusterId]}
      onClose={onClose}
    />
  )
}
