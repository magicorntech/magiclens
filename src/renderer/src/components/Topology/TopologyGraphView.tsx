import { Component, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react'
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import { Alert } from 'antd'
import type { TopologyEdge, TopologyGraphResponse, TopologyNode } from '@shared/types/topology'
import { useTranslation } from 'react-i18next'
import { TopologyNodeCard, type TopologyFlowNodeData } from './TopologyNodeCard'
import '@xyflow/react/dist/style.css'

const nodeTypes = { topology: TopologyNodeCard }

const NODE_W = 180
const NODE_H = 72

function structureKey(nodes: TopologyNode[], edges: TopologyEdge[]): string {
  return `${nodes
    .map((n) => n.id)
    .sort()
    .join('|')}::${edges
    .map((e) => `${e.source}->${e.target}:${e.relation}`)
    .sort()
    .join('|')}`
}

function layoutGraph(
  topologyNodes: TopologyNode[],
  topologyEdges: TopologyEdge[]
): { nodes: Node<TopologyFlowNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    nodesep: 72,
    ranksep: 120,
    edgesep: 40,
    marginx: 40,
    marginy: 40
  })

  for (const n of topologyNodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H })
  }
  for (const e of topologyEdges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target)
    }
  }
  dagre.layout(g)

  const nodes: Node<TopologyFlowNodeData>[] = topologyNodes.map((n) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: 'topology',
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: { topology: n }
    }
  })

  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges: Edge[] = topologyEdges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => {
      const labelParts: string[] = [e.relation]
      if (e.protocol) labelParts.push(e.protocol)
      if (e.ports?.length) labelParts.push(e.ports.slice(0, 2).join(','))
      if (e.rateRps !== undefined) labelParts.push(`${e.rateRps}/s`)
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: labelParts.join(' · '),
        animated: e.relation === 'selects' || e.relation === 'routes',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: 'var(--ml-text-secondary)' },
        data: { ...e } as Record<string, unknown>
      }
    })

  return { nodes, edges }
}

function FitOnLoad({ structure }: { structure: string }): null {
  const { fitView } = useReactFlow()
  const last = useRef('')
  useEffect(() => {
    if (!structure || structure === last.current) return
    last.current = structure
    const id = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 180 })
    })
    return () => window.cancelAnimationFrame(id)
  }, [fitView, structure])
  return null
}

class TopologyGraphErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[topology] graph render failed', error, info)
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

interface TopologyGraphViewProps {
  graph: TopologyGraphResponse
  onSelectNode: (node: TopologyNode | null) => void
  focusNodeIds?: string[]
  popout?: boolean
}

function TopologyGraphCanvas({
  graph,
  onSelectNode,
  focusNodeIds,
  popout = false
}: TopologyGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const key = useMemo(() => structureKey(graph.nodes, graph.edges), [graph.nodes, graph.edges])
  const laid = useMemo(() => layoutGraph(graph.nodes, graph.edges), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState(laid.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(laid.edges)
  const lastStructure = useRef(key)

  // Structure changed → full layout (preserve dragged positions when possible).
  useEffect(() => {
    if (lastStructure.current !== key) {
      lastStructure.current = key
      setNodes((prev) => {
        const prevById = new Map(prev.map((n) => [n.id, n]))
        return laid.nodes.map((n) => {
          const existing = prevById.get(n.id)
          if (!existing) return n
          return {
            ...n,
            position: existing.position,
            selected: existing.selected,
            style: existing.style
          }
        })
      })
      setEdges(laid.edges)
      return
    }
  }, [key, laid, setNodes, setEdges])

  // Live health / replica updates without re-layout.
  useEffect(() => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    setNodes((prev) =>
      prev.map((n) => {
        const next = byId.get(n.id)
        if (!next) return n
        const prevTopo = (n.data as TopologyFlowNodeData | undefined)?.topology
        if (prevTopo === next) return n
        if (
          prevTopo &&
          prevTopo.status === next.status &&
          prevTopo.healthDetail === next.healthDetail &&
          prevTopo.replicasReady === next.replicasReady &&
          prevTopo.replicasDesired === next.replicasDesired &&
          prevTopo.name === next.name
        ) {
          return n
        }
        return { ...n, data: { topology: next } }
      })
    )
  }, [graph.nodes, setNodes])

  useEffect(() => {
    if (!focusNodeIds?.length) return
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: focusNodeIds.includes(n.id),
        style: focusNodeIds.includes(n.id)
          ? { ...n.style, outline: '2px solid var(--ml-primary)' }
          : { ...n.style, outline: undefined }
      }))
    )
  }, [focusNodeIds, setNodes])

  return (
    <div className={`ml-topo-canvas${popout ? ' ml-topo-canvas--popout' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, node) => {
          const topo = (node.data as TopologyFlowNodeData | undefined)?.topology
          if (topo) onSelectNode(topo)
        }}
        onPaneClick={() => onSelectNode(null)}
      >
        <Background gap={18} size={1} color="var(--ml-border-secondary)" />
        <FitOnLoad structure={key} />
        <MiniMap
          pannable
          zoomable
          className="nopan nodrag nowheel ml-topo-minimap"
          bgColor="transparent"
          maskColor="rgba(0, 0, 0, 0.18)"
          nodeColor={(n) => {
            const s = (n.data as TopologyFlowNodeData | undefined)?.topology?.status
            if (s === 'healthy') return 'var(--ml-status-success-fg, #3f9c6c)'
            if (s === 'error') return 'var(--ml-status-error-fg, #d94c4c)'
            if (s === 'degraded') return 'var(--ml-status-warning-fg, #d4a017)'
            return 'var(--ml-text-secondary)'
          }}
        />
      </ReactFlow>
      {graph.nodes.length === 0 && (
        <div className="ml-topo-empty-overlay">{t('topology.empty')}</div>
      )}
    </div>
  )
}

export function TopologyGraphView(props: TopologyGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <TopologyGraphErrorBoundary
      fallback={
        <Alert
          type="error"
          showIcon
          message={t('topology.error')}
          description={t('topology.graphCrash')}
        />
      }
    >
      <ReactFlowProvider>
        <TopologyGraphCanvas {...props} />
      </ReactFlowProvider>
    </TopologyGraphErrorBoundary>
  )
}
