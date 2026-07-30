import type { ResourceNote } from '@shared/types/notes'
import {
  extractWikiLinks,
  normalizeWikiTarget,
  type NoteGraphPayload,
  type NoteLinkEdge
} from '@shared/types/sparks'

export function resolveWikiTarget(
  target: string,
  notes: ResourceNote[]
): ResourceNote | undefined {
  const key = normalizeWikiTarget(target)
  if (!key) return undefined

  const byTitle = notes.find((n) => n.title.trim().toLowerCase() === key)
  if (byTitle) return byTitle

  const byPath = notes.find((n) => {
    const pathKey = normalizeWikiTarget(n.path)
    const base = pathKey.includes('/') ? pathKey.slice(pathKey.lastIndexOf('/') + 1) : pathKey
    return pathKey === key || base === key
  })
  return byPath
}

export function buildNoteGraph(notes: ResourceNote[]): NoteGraphPayload {
  const edges: NoteLinkEdge[] = []
  const linkCount = new Map<string, number>()

  for (const note of notes) {
    const links = extractWikiLinks(note.body)
    for (const link of links) {
      const resolved = resolveWikiTarget(link.target, notes)
      edges.push({
        fromId: note.id,
        toId: resolved?.id ?? null,
        toTitle: resolved?.title ?? link.target,
        unresolved: !resolved
      })
      linkCount.set(note.id, (linkCount.get(note.id) ?? 0) + 1)
      if (resolved) {
        linkCount.set(resolved.id, (linkCount.get(resolved.id) ?? 0) + 1)
      }
    }
  }

  return {
    nodes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      path: n.path,
      folder: n.folder,
      tags: n.tags,
      pinned: Boolean(n.pinned),
      linkCount: linkCount.get(n.id) ?? 0
    })),
    edges
  }
}

export function getBacklinks(note: ResourceNote, notes: ResourceNote[]): ResourceNote[] {
  const key = normalizeWikiTarget(note.title)
  const pathBase = normalizeWikiTarget(note.path).split('/').pop() ?? ''
  return notes.filter((n) => {
    if (n.id === note.id) return false
    return extractWikiLinks(n.body).some((link) => {
      const t = normalizeWikiTarget(link.target)
      return t === key || t === pathBase || t === normalizeWikiTarget(note.path)
    })
  })
}

export function getOutboundLinks(
  note: ResourceNote,
  notes: ResourceNote[]
): Array<{ target: string; note: ResourceNote | null; alias?: string }> {
  return extractWikiLinks(note.body).map((link) => ({
    target: link.target,
    alias: link.alias,
    note: resolveWikiTarget(link.target, notes) ?? null
  }))
}

/** Turn [[Wiki]] into clickable HTML anchors for preview. */
export function renderWikiLinksHtml(
  html: string,
  notes: ResourceNote[]
): string {
  // marked already escaped; we rewrite remaining [[...]] text nodes roughly via regex on html
  return html.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_raw, target, _heading, alias) => {
    const resolved = resolveWikiTarget(String(target), notes)
    const label = alias || target
    if (resolved) {
      return `<a class="ml-wikilink" data-note-id="${resolved.id}" href="#note/${resolved.id}">${escapeHtml(String(label))}</a>`
    }
    return `<a class="ml-wikilink ml-wikilink--missing" data-wiki-target="${escapeAttr(String(target))}" href="#create/${encodeURIComponent(String(target))}">${escapeHtml(String(label))}</a>`
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;')
}
