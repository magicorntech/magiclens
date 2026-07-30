/** Shared wiki-link / graph / canvas / plugin types for Sparks vault. */

export const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g

export interface WikiLinkRef {
  raw: string
  target: string
  heading?: string
  alias?: string
  index: number
}

export interface NoteLinkEdge {
  fromId: string
  toId: string | null
  toTitle: string
  unresolved: boolean
}

export interface NoteGraphPayload {
  nodes: Array<{
    id: string
    title: string
    path: string
    folder: string
    tags: string[]
    pinned: boolean
    linkCount: number
  }>
  edges: NoteLinkEdge[]
}

export interface CanvasNode {
  id: string
  type: 'note' | 'text' | 'group'
  noteId?: string
  text?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface CanvasEdge {
  id: string
  from: string
  to: string
  label?: string
}

export interface SparksCanvasDoc {
  version: 1
  updatedAt: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type SparksWorkspacePanel = 'editor' | 'graph' | 'canvas'
export type SparksSplitMode =
  | 'single'
  | 'notes'
  | 'editor-graph'
  | 'editor-canvas'
  | 'graph-canvas'
export type SparksSplitFocus = 'primary' | 'secondary'

/** Notebook page texture behind the Markdown sheet. */
export type SparksPaperStyle = 'plain' | 'lined' | 'grid' | 'book'

export interface SparksSketchPoint {
  /** Normalized 0–1 against the note sheet. */
  x: number
  y: number
}

export type SparksSketchDrawTool = 'pen' | 'highlighter' | 'eraser'
export type SparksSketchShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'
export type SparksSketchMediaKind = 'image' | 'video' | 'file'

export interface SparksSketchStroke {
  id: string
  kind: 'stroke'
  color: string
  width: number
  tool: SparksSketchDrawTool
  points: SparksSketchPoint[]
}

export interface SparksSketchShape {
  id: string
  kind: 'shape'
  shape: SparksSketchShapeKind
  color: string
  width: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SparksSketchMedia {
  id: string
  kind: 'media'
  media: SparksSketchMediaKind
  /** Vault-relative path, e.g. Attachments/noteId/photo.png */
  path: string
  name: string
  x: number
  y: number
  w: number
  h: number
}

export type SparksSketchItem = SparksSketchStroke | SparksSketchShape | SparksSketchMedia

export interface SparksSketchDoc {
  version: 1 | 2
  noteId: string
  updatedAt: string
  items: SparksSketchItem[]
  /** @deprecated v1 — migrated into items on load */
  strokes?: Array<{
    id: string
    color: string
    width: number
    tool: SparksSketchDrawTool
    points: SparksSketchPoint[]
  }>
}

export interface SparksMediaImportResult {
  ok: boolean
  path?: string
  /** Prefer this in Markdown / <img src> — works inside Electron. */
  src?: string
  name?: string
  media?: SparksSketchMediaKind
  error?: string
  canceled?: boolean
}

/** Write / Draw / Media surface for the note sheet. */
export type SparksSurfaceMode = 'write' | 'draw' | 'media'

export type SparksPaperWidth = 'sm' | 'md' | 'lg' | 'xl'
export type SparksPaperZoom = 'out' | 'normal' | 'in' | 'max'
export type SparksPaperExtend = 'normal' | 'tall' | 'long'

export const SPARKS_THEME_IDS = [
  'default',
  'paper',
  'ink',
  'parchment',
  'mono',
  'ocean',
  'forest',
  'matcha',
  'dusk',
  'nord',
  'solar',
  'ember',
  'rose'
] as const

export type SparksThemeId = (typeof SPARKS_THEME_IDS)[number]

export interface SparksTemplate {
  id: string
  name: string
  description: string
  folder: string
  title: string
  body: string
  tags: string[]
}

export interface SparksPluginManifest {
  id: string
  name: string
  description: string
  version: string
  enabled: boolean
}

export function extractWikiLinks(markdown: string): WikiLinkRef[] {
  const out: WikiLinkRef[] = []
  const re = new RegExp(WIKILINK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown)) !== null) {
    out.push({
      raw: match[0],
      target: match[1].trim(),
      heading: match[2]?.trim() || undefined,
      alias: match[3]?.trim() || undefined,
      index: match.index
    })
  }
  return out
}

export function normalizeWikiTarget(target: string): string {
  return target.trim().replace(/\.md$/i, '').toLowerCase()
}
