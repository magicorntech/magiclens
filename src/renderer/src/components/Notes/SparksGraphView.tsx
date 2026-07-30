import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import { normalizeWikiTarget } from '@shared/types/sparks'
import { Icon } from '../ui/Icon'
import { buildNoteGraph } from './wikiLinks'

function GraphNoteNode({ data }: NodeProps): React.JSX.Element {
  const d = data as {
    title: string
    pinned?: boolean
    active?: boolean
    unresolved?: boolean
  }
  return (
    <div
      className={`ml-sparks-graph-node${d.active ? ' is-active' : ''}${d.pinned ? ' is-pinned' : ''}${d.unresolved ? ' is-missing' : ''}`}
      title={d.title}
    >
      <Handle type="target" position={Position.Left} className="ml-sparks-rf-handle" />
      <span className="ml-sparks-graph-node__title">{d.title}</span>
      <Handle type="source" position={Position.Right} className="ml-sparks-rf-handle" />
    </div>
  )
}

const nodeTypes = { sparkNote: GraphNoteNode }

interface SparksGraphViewProps {
  notes: ResourceNote[]
  selectedId: string | null
  onSelectNote: (id: string) => void
}

function layoutPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.max(3, Math.ceil(Math.sqrt(Math.max(total, 1))))
  return { x: (index % cols) * 200, y: Math.floor(index / cols) * 110 }
}

function buildGraphElements(notes: ResourceNote[]): { nodes: Node[]; edges: Edge[] } {
  const graph = buildNoteGraph(notes)
  const missing = new Map<string, string>()

  for (const edge of graph.edges) {
    if (edge.toId) continue
    const key = normalizeWikiTarget(edge.toTitle) || edge.toTitle
    const id = `missing:${key}`
    if (!missing.has(id)) missing.set(id, edge.toTitle)
  }

  const realNodes: Node[] = graph.nodes.map((n, i) => ({
    id: n.id,
    type: 'sparkNote',
    position: layoutPosition(i, graph.nodes.length + missing.size),
    data: {
      title: n.title,
      pinned: n.pinned,
      active: false,
      unresolved: false
    }
  }))

  const ghostNodes: Node[] = [...missing.entries()].map(([id, title], i) => ({
    id,
    type: 'sparkNote',
    position: layoutPosition(graph.nodes.length + i, graph.nodes.length + missing.size),
    data: {
      title,
      pinned: false,
      active: false,
      unresolved: true
    }
  }))

  const edges: Edge[] = graph.edges.map((e, i) => {
    const target =
      e.toId ??
      `missing:${normalizeWikiTarget(e.toTitle) || e.toTitle}`
    return {
      id: `e-${e.fromId}-${target}-${i}`,
      source: e.fromId,
      target,
      animated: false,
      className: e.unresolved ? 'ml-sparks-rf-edge is-missing' : 'ml-sparks-rf-edge'
    }
  })

  return { nodes: [...realNodes, ...ghostNodes], edges }
}

function SparksGraphInner({ notes, selectedId, onSelectNote }: SparksGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const structureKey = useMemo(() => {
    const graph = buildNoteGraph(notes)
    const unresolved = graph.edges
      .filter((e) => !e.toId)
      .map((e) => normalizeWikiTarget(e.toTitle) || e.toTitle)
      .sort()
      .join('|')
    return `${notes.map((n) => `${n.id}:${n.title}:${n.pinned ? 1 : 0}:${n.body.length}`).join(';')}#${unresolved}`
  }, [notes])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const positionsRef = useRef(new Map<string, { x: number; y: number }>())

  useEffect(() => {
    for (const n of nodes) {
      positionsRef.current.set(n.id, n.position)
    }
  }, [nodes])

  useEffect(() => {
    const next = buildGraphElements(notes)
    setNodes(
      next.nodes.map((n) => ({
        ...n,
        position: positionsRef.current.get(n.id) ?? n.position,
        data: {
          ...(n.data as Record<string, unknown>),
          active: n.id === selectedId
        }
      }))
    )
    setEdges(
      next.edges.map((e) => ({
        ...e,
        animated: e.source === selectedId || e.target === selectedId
      }))
    )
  }, [structureKey, selectedId, notes, setNodes, setEdges])

  if (notes.length === 0) {
    return (
      <div className="ml-sparks-graph ml-sparks-panel">
        <header className="ml-sparks-panel__toolbar">
          <div className="ml-sparks-panel__meta">
            <span className="ml-sparks-panel__title">{t('notes.panels.graph')}</span>
            <span className="ml-sparks-panel__hint">{t('notes.panels.graphHint')}</span>
          </div>
        </header>
        <div className="ml-sparks-panel__empty">
          <Icon icon={Network} size={22} />
          <p>{t('notes.graph.empty')}</p>
          <span>{t('notes.graph.emptyHint')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ml-sparks-graph ml-sparks-panel">
      <header className="ml-sparks-panel__toolbar">
        <div className="ml-sparks-panel__meta">
          <span className="ml-sparks-panel__title">{t('notes.panels.graph')}</span>
          <span className="ml-sparks-panel__hint">{t('notes.graph.count', { count: notes.length })}</span>
        </div>
      </header>
      <div className="ml-sparks-panel__stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          onNodeClick={(_, node) => {
            if (String(node.id).startsWith('missing:')) return
            onSelectNote(node.id)
          }}
          proOptions={{ hideAttribution: true }}
          className="ml-sparks-rf"
        >
          <Background gap={20} size={1} color="var(--spark-border)" />
          <MiniMap pannable zoomable className="ml-sparks-rf-minimap" />
          <Controls showInteractive={false} className="ml-sparks-rf-controls" />
        </ReactFlow>
      </div>
    </div>
  )
}

export function SparksGraphView(props: SparksGraphViewProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <SparksGraphInner {...props} />
    </ReactFlowProvider>
  )
}
