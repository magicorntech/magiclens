import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { ClusterEventsPanel } from '../ResourceTable/ClusterEventsPanel'

interface NodesEventsStripProps {
  clusterId: string
  isActive: boolean
}

export function NodesEventsStrip({ clusterId, isActive }: NodesEventsStripProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className={`ml-nodes-events-strip${expanded ? ' ml-nodes-events-strip--expanded' : ''}`}>
      <button type="button" className="ml-nodes-events-strip-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>Events</span>
        <Icon icon={expanded ? ChevronDown : ChevronUp} variant="detail" />
      </button>
      {expanded && (
        <div className="ml-nodes-events-strip-body">
          <ClusterEventsPanel clusterId={clusterId} isActive={isActive} compact embedded />
        </div>
      )}
    </div>
  )
}
