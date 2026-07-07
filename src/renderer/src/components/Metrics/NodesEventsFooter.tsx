import { Tabs, Typography } from 'antd'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'

interface NodesEventsFooterProps {
  clusterId: string
  isActive: boolean
  selectedNodeName?: string
}

export function NodesEventsFooter({
  clusterId,
  isActive,
  selectedNodeName
}: NodesEventsFooterProps): React.JSX.Element {
  const tabItems = [
    {
      key: 'cluster',
      label: 'Cluster',
      children: (
        <div style={{ height: 220, overflow: 'hidden' }}>
          <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact />
        </div>
      )
    },
    ...(selectedNodeName
      ? [
          {
            key: 'node',
            label: selectedNodeName,
            children: (
              <div style={{ height: 220, overflow: 'hidden' }}>
                <ResourceEventsPanel
                  clusterId={clusterId}
                  namespace=""
                  name={selectedNodeName}
                  target={{ type: 'builtin', kind: 'Nodes' }}
                  isActive={isActive}
                />
              </div>
            )
          }
        ]
      : [])
  ]

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--ml-border-secondary)',
        background: 'var(--ml-bg-container)',
        padding: '8px 12px 0'
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
        Events
      </Typography.Text>
      <Tabs size="small" items={tabItems} destroyOnHidden />
    </div>
  )
}
