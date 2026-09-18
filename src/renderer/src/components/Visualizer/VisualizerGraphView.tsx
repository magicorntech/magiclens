import { Component, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node
} from '@xyflow/react'
import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import type { VisualizerGraphResponse, VisualizerNode } from '@shared/types/visualizer'
import {
  VisualizerFrameNode,
  VisualizerServiceNode,
  VisualizerWorkloadNode,
  type VizFrameData,
  type VizServiceData,
  type VizWorkloadData
} from './VisualizerNodes'
import { layoutVisualizer } from './visualizerLayout'
import '@xyflow/react/dist/style.css'

type VizRFData = VizFrameData | VizServiceData | VizWorkloadData

const nodeTypes = {
  vizFrame: VisualizerFrameNode,
  vizService: VisualizerServiceNode,
  vizWorkload: VisualizerWorkloadNode
}

function structureKey(graph: VisualizerGraphResponse, query: string): string {
  return `${graph.nodes
    .map((n) => n.id)
    .sort()
    .join('|')}::${graph.edges
    .map((e) => `${e.source}->${e.target}`)
    .sort()
    .join('|')}::${query}`
}

function toFlow(
  graph: VisualizerGraphResponse,
  query: string
): { nodes: Node<VizRFData>[]; edges: Edge[] } {
  const q = query.trim().toLowerCase()
  const nodes = q
    ? graph.nodes.filter((n) => {
        const blob = `${n.name} ${n.namespace} ${n.instance} ${n.kind}`.toLowerCase()
        return blob.includes(q)
      })
    : graph.nodes
  const ids = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  const laid = layoutVisualizer(nodes, edges)
  return {
    nodes: laid.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      parentId: n.parentId,
      extent: n.parentId ? ('parent' as const) : undefined,
      width: n.width,
      height: n.height,
      style: { width: n.width, height: n.height },
      data: n.data as VizRFData,
      selectable: n.type !== 'vizFrame',
      connectable: false,
      draggable: true
    })),
    edges: laid.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: 'color-mix(in srgb, var(--ml-text) 28%, transparent)',
        strokeDasharray: '6 5',
        strokeWidth: 1.4
      }
    }))
  }
}

function FitOnLoad({ structure }: { structure: string }): null {
  const { fitView } = useReactFlow()
  const last = useRef('')
  useEffect(() => {
    if (!structure || structure === last.current) return
    last.current = structure
    const id = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.12, duration: 200 })
    })
    return () => window.cancelAnimationFrame(id)
  }, [fitView, structure])
  return null
}

class VisualizerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[visualizer] graph render failed', error, info)
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

interface VisualizerGraphViewProps {
  graph: VisualizerGraphResponse
  query: string
  onSelectNode: (node: VisualizerNode | null) => void
}

function VisualizerCanvas({ graph, query, onSelectNode }: VisualizerGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const key = useMemo(() => structureKey(graph, query), [graph, query])
  const laid = useMemo(() => toFlow(graph, query), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState(laid.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(laid.edges)
  const last = useRef(key)

  useEffect(() => {
    if (last.current === key) return
    last.current = key
    setNodes(laid.nodes)
    setEdges(laid.edges)
  }, [key, laid, setNodes, setEdges])

  useEffect(() => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type === 'vizFrame') return n
        const next = byId.get(n.id)
        if (!next) return n
        const prevNode = (n.data as VizServiceData | VizWorkloadData).node
        if (
          prevNode &&
          prevNode.status === next.status &&
          prevNode.replicasReady === next.replicasReady &&
          prevNode.replicasDesired === next.replicasDesired
        ) {
          return n
        }
        return { ...n, data: { ...n.data, node: next } }
      })
    )
  }, [graph.nodes, setNodes])

  return (
    <div className="ml-viz-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.08}
        maxZoom={2.4}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, node) => {
          if (node.type === 'vizFrame') {
            onSelectNode(null)
            return
          }
          const topo = (node.data as VizServiceData | VizWorkloadData).node
          if (topo) onSelectNode(topo)
        }}
        onPaneClick={() => onSelectNode(null)}
      >
        <Background
          id="viz-grid"
          variant={BackgroundVariant.Lines}
          gap={28}
          color="color-mix(in srgb, var(--ml-text) 7%, transparent)"
        />
        <FitOnLoad structure={key} />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="ml-viz-controls"
        />
        {graph.nodes.length > 0 && graph.nodes.length <= 160 ? (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="nopan nodrag nowheel ml-viz-minimap"
            bgColor="transparent"
            maskColor="rgba(0, 0, 0, 0.28)"
            nodeColor={(n) => {
              if (n.type === 'vizFrame') return 'color-mix(in srgb, var(--ml-text) 18%, transparent)'
              const status = (n.data as VizServiceData | VizWorkloadData).node?.status
              if (status === 'healthy') return '#6fbf4a'
              if (status === 'error') return '#d94c4c'
              if (status === 'degraded') return '#d4a017'
              return 'var(--ml-text-secondary)'
            }}
          />
        ) : null}
      </ReactFlow>
      {laid.nodes.length === 0 ? (
        <div className="ml-viz-empty">{t('visualizer.empty')}</div>
      ) : null}
    </div>
  )
}

export function VisualizerGraphView(props: VisualizerGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <VisualizerErrorBoundary
      fallback={
        <Alert type="error" showIcon message={t('visualizer.error')} description={t('visualizer.graphCrash')} />
      }
    >
      <ReactFlowProvider>
        <VisualizerCanvas {...props} />
      </ReactFlowProvider>
    </VisualizerErrorBoundary>
  )
}
