import { useEffect, useState } from 'react'
import { Button, Segmented, Typography } from 'antd'
import { ChevronDown } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'

type EventsView = 'cluster' | 'node'

interface NodesEventsFooterProps {
  clusterId: string
  isActive: boolean
  selectedNodeName?: string
  onCollapse?: () => void
}

export function NodesEventsFooter({
  clusterId,
  isActive,
  selectedNodeName,
  onCollapse
}: NodesEventsFooterProps): React.JSX.Element {
  const [view, setView] = useState<EventsView>('cluster')

  useEffect(() => {
    if (!selectedNodeName && view === 'node') setView('cluster')
  }, [selectedNodeName, view])

  return (
    <div className="nodes-events-footer">
      <div className="nodes-events-footer-header">
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Events
        </Typography.Text>
        {onCollapse ? (
          <Button type="text" size="small" icon={<Icon icon={ChevronDown} variant="detail" />} onClick={onCollapse} style={{ fontSize: 12 }}>
            Collapse
          </Button>
        ) : null}
      </div>

      {selectedNodeName ? (
        <Segmented
          size="small"
          style={{ marginBottom: 8, flexShrink: 0 }}
          value={view}
          onChange={(value) => setView(value as EventsView)}
          options={[
            { label: 'Cluster', value: 'cluster' },
            { label: selectedNodeName, value: 'node' }
          ]}
        />
      ) : null}

      <div className="nodes-events-body">
        {view === 'cluster' || !selectedNodeName ? (
          <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact embedded />
        ) : (
          <ResourceEventsPanel
            clusterId={clusterId}
            namespace=""
            name={selectedNodeName}
            target={{ type: 'builtin', kind: 'Nodes' }}
            isActive={isActive}
            embedded
          />
        )}
      </div>
    </div>
  )
}
