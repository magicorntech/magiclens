import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const NODE_W = 168
const NODE_H = 40

/**
 * Radial layout: the most-linked note sits in the middle, the rest on concentric rings ordered by
 * how connected they are, so related notes end up close together instead of in arbitrary grid cells.
 */
function radialPositions(ids: string[], degree: Map<string, number>): Map<string, { x: number; y: number }> {
  const ordered = [...ids].sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0))
  const out = new Map<string, { x: number; y: number }>()
  const place = (id: string, x: number, y: number): void => {
    out.set(id, { x: x - NODE_W / 2, y: y - NODE_H / 2 })
  }
  const [hub, ...rest] = ordered
  if (!hub) return out
  place(hub, 0, 0)
  let index = 0
  let ring = 1
  while (index < rest.length) {
    const radius = 250 * ring
    // ~one node per 190px of circumference keeps labels from touching.
    const capacity = Math.max(6, Math.floor((2 * Math.PI * radius) / 190))
    const count = Math.min(capacity, rest.length - index)
    const offset = ring % 2 === 0 ? Math.PI / count : 0
    for (let i = 0; i < count; i++) {
      const angle = offset + (2 * Math.PI * i) / count - Math.PI / 2
      place(rest[index + i]!, Math.cos(angle) * radius * 1.35, Math.sin(angle) * radius)
    }
    index += count
    ring += 1
  }
  return out
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

  const degree = new Map<string, number>()
  for (const e of graph.edges) {
    const target = e.toId ?? `missing:${normalizeWikiTarget(e.toTitle) || e.toTitle}`
    degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1)
    degree.set(target, (degree.get(target) ?? 0) + 1)
  }
  const positions = radialPositions([...graph.nodes.map((n) => n.id), ...missing.keys()], degree)

  const realNodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: 'sparkNote',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      title: n.title,
      pinned: n.pinned,
      active: false,
      unresolved: false
    }
  }))

  const ghostNodes: Node[] = [...missing.entries()].map(([id, title]) => ({
    id,
    type: 'sparkNote',
    position: positions.get(id) ?? { x: 0, y: 0 },
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
      type: 'straight',
      className: e.unresolved ? 'ml-sparks-rf-edge is-missing' : 'ml-sparks-rf-edge'
    }
  })

  return { nodes: [...realNodes, ...ghostNodes], edges }
}

function noteStructureKey(notes: ResourceNote[]): string {
  const graph = buildNoteGraph(notes)
  const unresolved = graph.edges
    .filter((e) => !e.toId)
    .map((e) => normalizeWikiTarget(e.toTitle) || e.toTitle)
    .sort()
    .join('|')
  return `${notes.map((n) => `${n.id}:${n.title}:${n.pinned ? 1 : 0}:${n.body.length}`).join(';')}#${unresolved}`
}

/**
 * Scales the laid-out map so it fits the stage at zoom 1 and centres it. Done on the node positions rather
 * than through React Flow's viewport, whose programmatic fit/setViewport calls do not take effect here.
 */
function fitToStage(nodes: Node[], stage: { w: number; h: number }): Node[] {
  if (nodes.length === 0) return nodes
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x)
    maxY = Math.max(maxY, n.position.y)
  }
  const margin = 56
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min(1, (stage.w - NODE_W - margin * 2) / spanX, (stage.h - NODE_H - margin * 2) / spanY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return nodes.map((n) => ({
    ...n,
    position: {
      x: stage.w / 2 + (n.position.x - cx) * scale - NODE_W / 2,
      y: stage.h / 2 + (n.position.y - cy) * scale - NODE_H / 2
    }
  }))
}

function GraphCanvas({
  notes,
  stage,
  selectedId,
  onSelectNote
}: SparksGraphViewProps & { stage: { w: number; h: number } }): React.JSX.Element {
  const initial = useMemo(() => {
    const built = buildGraphElements(notes)
    return { nodes: fitToStage(built.nodes, stage), edges: built.edges }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    initial.nodes.map((n) => ({ ...n, data: { ...(n.data as Record<string, unknown>), active: n.id === selectedId } }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initial.edges.map((e) => ({ ...e, animated: e.source === selectedId || e.target === selectedId }))
  )

  // Selecting a note only highlights it; the layout stays where the user left it.
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...(n.data as Record<string, unknown>), active: n.id === selectedId } }))
    )
    setEdges((prev) => prev.map((e) => ({ ...e, animated: e.source === selectedId || e.target === selectedId })))
  }, [selectedId, setNodes, setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
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
  )
}

function SparksGraphInner(props: SparksGraphViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const { notes } = props
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = stageRef.current
    if (el && el.clientWidth > 0) setStage({ w: el.clientWidth, h: el.clientHeight })
  }, [notes.length])

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
      <div className="ml-sparks-panel__stage" ref={stageRef}>
        {stage ? <GraphCanvas {...props} stage={stage} /> : null}
      </div>
    </div>
  )
}

export function SparksGraphView(props: SparksGraphViewProps): React.JSX.Element {
  // A new link structure remounts the graph, which lays it out afresh and centred on the stage.
  return (
    <ReactFlowProvider key={noteStructureKey(props.notes)}>
      <SparksGraphInner {...props} />
    </ReactFlowProvider>
  )
}
