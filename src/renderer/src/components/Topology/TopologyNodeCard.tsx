import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { TopologyNode } from '@shared/types/topology'
import { topologyNodeAge } from './topologyInsights'

export type TopologyFlowNodeData = {
  topology: TopologyNode
  selected?: boolean
}

type TopologyFlowNode = Node<TopologyFlowNodeData, 'topology'>

function TopologyNodeCardInner({ data }: NodeProps<TopologyFlowNode>): React.JSX.Element {
  const node = data?.topology
  if (!node) {
    return <div className="ml-topo-node ml-topo-node--unknown">—</div>
  }
  const crash = /crashloop/i.test(node.healthDetail ?? '')
  return (
    <div
      className={`ml-topo-node ml-topo-node--${node.status}${crash ? ' ml-topo-node--crash' : ''}`}
      title={node.healthDetail}
    >
      <Handle type="target" position={Position.Left} className="ml-topo-handle" />
      <div className="ml-topo-node__kind">{node.kind}</div>
      <div className="ml-topo-node__name">{node.name}</div>
      <div className="ml-topo-node__meta">
        {node.replicasDesired !== undefined
          ? `${node.replicasReady ?? 0}/${node.replicasDesired}`
          : topologyNodeAge(node)}
        {node.ports?.[0] ? ` · ${node.ports[0]}` : ''}
      </div>
      {node.healthDetail && <div className="ml-topo-node__detail">{node.healthDetail}</div>}
      <Handle type="source" position={Position.Right} className="ml-topo-handle" />
    </div>
  )
}

export const TopologyNodeCard = memo(TopologyNodeCardInner)
