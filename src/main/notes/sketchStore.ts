import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import type {
  SparksMediaImportResult,
  SparksSketchDoc,
  SparksSketchItem,
  SparksSketchMediaKind
} from '@shared/types/sparks'
import { ensureVault } from './vaultStore'
import { sparksMediaUrl } from './mediaProtocol'

function sketchesDir(): string {
  const root = ensureVault()
  const dir = join(root, '.sparks', 'sketches')
  mkdirSync(dir, { recursive: true })
  return dir
}

function sketchPath(noteId: string): string {
  const safe = noteId.replace(/[^a-zA-Z0-9._-]/g, '_')
  return join(sketchesDir(), `${safe}.json`)
}

function attachmentsDir(noteId: string): string {
  const root = ensureVault()
  const safe = noteId.replace(/[^a-zA-Z0-9._-]/g, '_')
  const dir = join(root, 'Attachments', safe)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function emptySketch(noteId: string): SparksSketchDoc {
  return {
    version: 2,
    noteId,
    updatedAt: new Date().toISOString(),
    items: []
  }
}

function migrateItems(raw: Partial<SparksSketchDoc>): SparksSketchItem[] {
  if (Array.isArray(raw.items) && raw.items.length) {
    return raw.items.filter(Boolean) as SparksSketchItem[]
  }
  if (Array.isArray(raw.strokes) && raw.strokes.length) {
    return raw.strokes.map((s) => ({
      id: s.id,
      kind: 'stroke' as const,
      color: s.color,
      width: s.width,
      tool: s.tool,
      points: s.points ?? []
    }))
  }
  return []
}

export function loadSketch(noteId: string): SparksSketchDoc {
  const file = sketchPath(noteId)
  if (!existsSync(file)) return emptySketch(noteId)
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<SparksSketchDoc>
    return {
      version: 2,
      noteId,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      items: migrateItems(raw)
    }
  } catch {
    return emptySketch(noteId)
  }
}

export function saveSketch(doc: SparksSketchDoc): SparksSketchDoc {
  const next: SparksSketchDoc = {
    version: 2,
    noteId: doc.noteId,
    updatedAt: new Date().toISOString(),
    items: Array.isArray(doc.items) ? doc.items : migrateItems(doc)
  }
  const file = sketchPath(doc.noteId)
  if (next.items.length === 0) {
    try {
      if (existsSync(file)) unlinkSync(file)
    } catch {
      // ignore
    }
    return next
  }
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
  return next
}

function detectMediaKind(filePath: string): SparksSketchMediaKind {
  const ext = extname(filePath).toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return 'image'
  if (['.mp4', '.webm', '.mov', '.m4v', '.ogg'].includes(ext)) return 'video'
  return 'file'
}

function uniqueName(dir: string, name: string): string {
  const base = basename(name)
  if (!existsSync(join(dir, base))) return base
  const ext = extname(base)
  const stem = basename(base, ext)
  let i = 2
  while (existsSync(join(dir, `${stem}-${i}${ext}`))) i += 1
  return `${stem}-${i}${ext}`
}

/** Copy a local file into the note's Attachments folder; returns vault-relative path + sparks-media URL. */
export function importNoteMedia(noteId: string, sourcePath: string): SparksMediaImportResult {
  try {
    if (!existsSync(sourcePath)) return { ok: false, error: 'File not found' }
    const dir = attachmentsDir(noteId)
    const name = uniqueName(dir, basename(sourcePath))
    const dest = join(dir, name)
    copyFileSync(sourcePath, dest)
    const safe = noteId.replace(/[^a-zA-Z0-9._-]/g, '_')
    const relative = `Attachments/${safe}/${name}`
    const media = detectMediaKind(sourcePath)
    return {
      ok: true,
      path: relative,
      src: sparksMediaUrl(relative),
      name,
      media
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
