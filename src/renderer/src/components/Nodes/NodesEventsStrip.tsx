import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'

interface NodesEventsStripProps {
  clusterId: string
  isActive: boolean
  selectedNodeName?: string
}

export function NodesEventsStrip({
  clusterId,
  isActive,
  selectedNodeName
}: NodesEventsStripProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`ml-nodes-events-strip${expanded ? ' ml-nodes-events-strip--expanded' : ''}`}>
      <button
        type="button"
        className="ml-nodes-events-strip-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Events{selectedNodeName ? ` · ${selectedNodeName}` : ''}</span>
        <Icon icon={expanded ? ChevronDown : ChevronUp} variant="detail" />
      </button>
      {expanded && (
        <div className="ml-nodes-events-strip-body">
          {selectedNodeName ? (
            <ResourceEventsPanel
              clusterId={clusterId}
              namespace=""
              name={selectedNodeName}
              target={{ type: 'builtin', kind: 'Nodes' }}
              isActive={isActive}
              embedded
            />
          ) : (
            <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact embedded />
          )}
        </div>
      )}
    </div>
  )
}
