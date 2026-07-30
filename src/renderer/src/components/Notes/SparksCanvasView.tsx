import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Modal, message } from 'antd'
import { StickyNote, Trash2, Type, Waypoints } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import type { CanvasEdge, CanvasNode, SparksCanvasDoc } from '@shared/types/sparks'
import { Icon } from '../ui/Icon'

function previewBody(body: string | undefined | null): string | undefined {
  if (!body) return undefined
  return body.slice(0, 120)
}

function CanvasCard({ data, id }: NodeProps): React.JSX.Element {
  const d = data as {
    kind: 'note' | 'text'
    title: string
    body?: string
    onOpen?: () => void
    onChangeText?: (id: string, text: string) => void
  }

  if (d.kind === 'text') {
    return (
      <div className="ml-sparks-canvas-card ml-sparks-canvas-card--text">
        <Handle type="target" position={Position.Top} className="ml-sparks-rf-handle" />
        <textarea
          className="ml-sparks-canvas-card__sticky nodrag nopan"
          value={d.title}
          rows={4}
          spellCheck={false}
          placeholder="…"
          onChange={(e) => d.onChangeText?.(id, e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <Handle type="source" position={Position.Bottom} className="ml-sparks-rf-handle" />
      </div>
    )
  }

  return (
    <div className="ml-sparks-canvas-card ml-sparks-canvas-card--note">
      <Handle type="target" position={Position.Top} className="ml-sparks-rf-handle" />
      <button type="button" className="ml-sparks-canvas-card__body" onClick={() => d.onOpen?.()}>
        <strong>{d.title}</strong>
        {d.body ? <p>{d.body}</p> : null}
      </button>
      <Handle type="source" position={Position.Bottom} className="ml-sparks-rf-handle" />
    </div>
  )
}

const nodeTypes = { canvasCard: CanvasCard }

interface SparksCanvasViewProps {
  notes: ResourceNote[]
  onOpenNote: (id: string) => void
}

function toFlow(
  doc: SparksCanvasDoc,
  notes: ResourceNote[],
  onOpenNote: (id: string) => void,
  onChangeText: (id: string, text: string) => void,
  untitled: string
): { nodes: Node[]; edges: Edge[] } {
  const byId = new Map(notes.map((n) => [n.id, n]))
  const nodes: Node[] = (doc.nodes ?? []).map((n) => {
    const note = n.noteId ? byId.get(n.noteId) : undefined
    const kind = n.type === 'text' ? 'text' : 'note'
    return {
      id: n.id,
      type: 'canvasCard',
      position: { x: n.x ?? 0, y: n.y ?? 0 },
      style: { width: n.width || 220, height: n.height || 120 },
      data: {
        kind,
        noteId: n.noteId,
        title: kind === 'text' ? (n.text ?? untitled) : (note?.title ?? untitled),
        body: kind === 'note' ? previewBody(note?.body) : undefined,
        onOpen: note ? () => onOpenNote(note.id) : undefined,
        onChangeText: kind === 'text' ? onChangeText : undefined
      }
    }
  })
  const edges: Edge[] = (doc.edges ?? []).map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.label,
    className: 'ml-sparks-rf-edge'
  }))
  return { nodes, edges }
}

function fromFlow(nodes: Node[], edges: Edge[]): SparksCanvasDoc {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: nodes.map((n) => {
      const data = n.data as { kind?: string; title?: string; noteId?: string }
      return {
        id: n.id,
        type: data.kind === 'text' ? 'text' : 'note',
        noteId: data.kind === 'text' ? undefined : data.noteId,
        text: data.kind === 'text' ? String(data.title ?? '') : undefined,
        x: n.position.x,
        y: n.position.y,
        width: typeof n.style?.width === 'number' ? n.style.width : 220,
        height: typeof n.style?.height === 'number' ? n.style.height : 120
      } satisfies CanvasNode
    }),
    edges: edges.map(
      (e) =>
        ({
          id: e.id,
          from: e.source,
          to: e.target,
          label: typeof e.label === 'string' ? e.label : undefined
        }) satisfies CanvasEdge
    )
  }
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

function SparksCanvasInner({ notes, onOpenNote }: SparksCanvasViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pickNoteId, setPickNoteId] = useState<string | undefined>()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesRef = useRef(notes)
  notesRef.current = notes
  const onOpenNoteRef = useRef(onOpenNote)
  onOpenNoteRef.current = onOpenNote
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const persist = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void window.api?.notes?.canvasSave?.(fromFlow(nextNodes, nextEdges))
    }, 400)
  }, [])

  const onChangeText = useCallback(
    (nodeId: string, text: string) => {
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...(n.data as Record<string, unknown>), title: text } }
            : n
        )
        persist(next, edgesRef.current)
        return next
      })
    },
    [persist, setNodes]
  )

  const onChangeTextRef = useRef(onChangeText)
  onChangeTextRef.current = onChangeText

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const api = window.api?.notes
        if (!api?.canvasGet) {
          throw new Error('Canvas API unavailable')
        }
        const doc = await api.canvasGet()
        if (cancelled) return
        const flow = toFlow(
          doc ?? { version: 1, updatedAt: new Date().toISOString(), nodes: [], edges: [] },
          notesRef.current,
          (id) => onOpenNoteRef.current(id),
          (id, text) => onChangeTextRef.current(id, text),
          t('notes.untitled')
        )
        setNodes(flow.nodes)
        setEdges(flow.edges)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : t('notes.canvas.loadError'))
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [setNodes, setEdges, t])

  useEffect(() => {
    if (!ready) return
    setNodes((prev) =>
      prev.map((n) => {
        const data = n.data as { kind?: string; title?: string; noteId?: string }
        if (data.kind === 'text') {
          return {
            ...n,
            data: {
              ...data,
              onChangeText: (id: string, text: string) => onChangeTextRef.current(id, text)
            }
          }
        }
        const note = data.noteId ? notes.find((x) => x.id === data.noteId) : undefined
        if (!note) return n
        return {
          ...n,
          data: {
            ...data,
            title: note.title,
            body: previewBody(note.body),
            onOpen: () => onOpenNote(note.id)
          }
        }
      })
    )
  }, [notes, ready, onOpenNote, setNodes])

  const schedulePersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      persist(nodesRef.current, edgesRef.current)
    }, 400)
  }, [persist])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          { ...connection, id: `ce-${Date.now()}`, className: 'ml-sparks-rf-edge' },
          eds
        )
        persist(nodesRef.current, next)
        return next
      })
    },
    [persist, setEdges]
  )

  function handleNodesChange(changes: Parameters<typeof onNodesChange>[0]): void {
    onNodesChange(changes)
    schedulePersist()
  }

  function handleEdgesChange(changes: Parameters<typeof onEdgesChange>[0]): void {
    onEdgesChange(changes)
    schedulePersist()
  }

  function addNoteCard(): void {
    const note = notes.find((n) => n.id === pickNoteId) ?? notes[0]
    if (!note) {
      message.info(t('notes.canvas.noNotes'))
      return
    }
    const id = `cn-${Date.now()}`
    const node: Node = {
      id,
      type: 'canvasCard',
      position: { x: 80 + Math.random() * 240, y: 80 + Math.random() * 160 },
      style: { width: 220, height: 120 },
      data: {
        kind: 'note',
        noteId: note.id,
        title: note.title,
        body: previewBody(note.body),
        onOpen: () => onOpenNote(note.id)
      }
    }
    setNodes((ns) => {
      const next = [...ns, node]
      persist(next, edges)
      return next
    })
  }

  function addTextCard(): void {
    const id = `ct-${Date.now()}`
    const node: Node = {
      id,
      type: 'canvasCard',
      position: { x: 120 + Math.random() * 200, y: 120 + Math.random() * 140 },
      style: { width: 200, height: 110 },
      data: {
        kind: 'text',
        title: t('notes.canvas.stickyDefault'),
        onChangeText: (nodeId: string, text: string) => onChangeTextRef.current(nodeId, text)
      }
    }
    setNodes((ns) => {
      const next = [...ns, node]
      persist(next, edges)
      return next
    })
  }

  function clearBoard(): void {
    Modal.confirm({
      title: t('notes.canvas.clearConfirmTitle'),
      content: t('notes.canvas.clearConfirmBody'),
      okText: t('notes.canvas.clear'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => {
        setNodes([])
        setEdges([])
        persist([], [])
      }
    })
  }

  const noteOptions = useMemo(() => notes.map((n) => ({ value: n.id, label: n.title })), [notes])

  if (loadError) {
    return (
      <div className="ml-sparks-canvas ml-sparks-panel ml-sparks-panel--error">
        <p>{t('notes.canvas.loadError')}</p>
        <span>{loadError}</span>
      </div>
    )
  }

  return (
    <div className="ml-sparks-canvas ml-sparks-panel">
      <header className="ml-sparks-panel__toolbar">
        <div className="ml-sparks-panel__meta">
          <span className="ml-sparks-panel__title">{t('notes.panels.canvas')}</span>
          <span className="ml-sparks-panel__hint">{t('notes.panels.canvasHint')}</span>
        </div>
        <div className="ml-sparks-panel__actions">
          <select
            className="ml-sparks-panel__select"
            value={pickNoteId ?? ''}
            onChange={(e) => setPickNoteId(e.target.value || undefined)}
            aria-label={t('notes.canvas.pickNote')}
          >
            <option value="">{t('notes.canvas.pickNote')}</option>
            {noteOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ml-vault-chip"
            onClick={addNoteCard}
            title={t('notes.canvas.addNote')}
          >
            <Icon icon={StickyNote} variant="action" />
            <span>{t('notes.canvas.addNote')}</span>
          </button>
          <button
            type="button"
            className="ml-vault-chip"
            onClick={addTextCard}
            title={t('notes.canvas.addText')}
          >
            <Icon icon={Type} variant="action" />
            <span>{t('notes.canvas.addText')}</span>
          </button>
          <button
            type="button"
            className="ml-vault-chip ml-vault-chip--danger"
            onClick={clearBoard}
            disabled={nodes.length === 0 && edges.length === 0}
            title={t('notes.canvas.clear')}
          >
            <Icon icon={Trash2} variant="action" />
          </button>
        </div>
      </header>

      <div className="ml-sparks-panel__stage">
        {!ready ? (
          <div className="ml-sparks-panel__empty">
            <p>{t('notes.canvas.loading')}</p>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.15}
              proOptions={{ hideAttribution: true }}
              className="ml-sparks-rf"
              style={{ width: '100%', height: '100%' }}
            >
              <Background gap={22} size={1} color="var(--spark-border)" />
              <MiniMap pannable zoomable className="ml-sparks-rf-minimap" />
              <Controls className="ml-sparks-rf-controls" />
            </ReactFlow>
            {nodes.length === 0 ? (
              <div className="ml-sparks-panel__empty ml-sparks-panel__empty--overlay">
                <Icon icon={Waypoints} size={22} />
                <p>{t('notes.canvas.empty')}</p>
                <span>{t('notes.canvas.emptyHint')}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function SparksCanvasView(props: SparksCanvasViewProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <CanvasErrorBoundary
      fallback={
        <div className="ml-sparks-canvas ml-sparks-panel ml-sparks-panel--error">
          <p>{t('notes.canvas.loadError')}</p>
        </div>
      }
    >
      <ReactFlowProvider>
        <SparksCanvasInner {...props} />
      </ReactFlowProvider>
    </CanvasErrorBoundary>
  )
}
