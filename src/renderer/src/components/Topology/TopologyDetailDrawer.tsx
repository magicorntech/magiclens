import { Alert, Drawer, Typography } from 'antd'
import type { TopologyNode } from '@shared/types/topology'
import { ResourceDetailDrawer } from '../ResourceTable/ResourceDetailDrawer'
import { topologyToListItem, topologyToResourceKind } from './topologyResource'

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
  const kind = node ? topologyToResourceKind(node.kind) : null
  const item = node && kind ? topologyToListItem(node) : null

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
