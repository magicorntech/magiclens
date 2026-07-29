import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type {
  CreateNoteRequest,
  ListNotesRequest,
  NotePatch,
  ResourceNote
} from '@shared/types/notes'
import { getSessionScope } from './sessionScope'

interface StoreSchema {
  scopes?: Record<string, ResourceNote[]>
}

const store = new Store<StoreSchema>({
  name: 'resource-notes',
  defaults: { scopes: {} }
})

function scopeNotes(): ResourceNote[] {
  const scopes = store.get('scopes') ?? {}
  return scopes[getSessionScope()] ?? []
}

function writeScopeNotes(notes: ResourceNote[]): void {
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = notes
  store.set('scopes', scopes)
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeNote(raw: ResourceNote): ResourceNote {
  const title = (raw.title ?? '').trim() || 'Untitled'
  const body = raw.body ?? ''
  const scope = raw.scope ?? 'global'
  return {
    id: raw.id,
    title,
    body,
    scope,
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || nowIso(),
    ...(raw.clusterId ? { clusterId: raw.clusterId } : {}),
    ...(raw.workspaceId ? { workspaceId: raw.workspaceId } : {}),
    ...(raw.resourceKind ? { resourceKind: raw.resourceKind } : {}),
    ...(raw.namespace ? { namespace: raw.namespace } : {}),
    ...(raw.resourceName ? { resourceName: raw.resourceName } : {}),
    remindAt: raw.remindAt ?? null,
    reminderFiredAt: raw.reminderFiredAt ?? null,
    pinned: Boolean(raw.pinned)
  }
}

function sortNotes(notes: ResourceNote[]): ResourceNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function matchesFilter(note: ResourceNote, filter?: ListNotesRequest): boolean {
  if (!filter) return true
  if (filter.forResource) {
    if (note.scope !== 'resource') return false
    if (filter.clusterId && note.clusterId !== filter.clusterId) return false
    if (filter.resourceKind && note.resourceKind !== filter.resourceKind) return false
    if ((filter.namespace ?? '') !== (note.namespace ?? '')) return false
    if (filter.resourceName && note.resourceName !== filter.resourceName) return false
  } else {
    if (filter.clusterId && note.clusterId && note.clusterId !== filter.clusterId) {
      // Keep global/workspace notes when filtering by cluster in hub
      if (note.scope === 'cluster' || note.scope === 'resource') {
        if (note.clusterId !== filter.clusterId) return false
      }
    }
    if (filter.workspaceId && note.workspaceId !== filter.workspaceId) return false
    if (filter.resourceKind && note.resourceKind !== filter.resourceKind) return false
    if (filter.namespace !== undefined && filter.namespace !== '' && note.namespace !== filter.namespace) {
      return false
    }
    if (filter.resourceName && note.resourceName !== filter.resourceName) return false
  }

  const q = filter.q?.trim().toLowerCase()
  if (q) {
    const hay = `${note.title}\n${note.body}\n${note.resourceName ?? ''}\n${note.resourceKind ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export function listNotes(filter?: ListNotesRequest): ResourceNote[] {
  return sortNotes(scopeNotes().map(normalizeNote).filter((n) => matchesFilter(n, filter)))
}

export function getNote(id: string): ResourceNote | undefined {
  const found = scopeNotes().find((n) => n.id === id)
  return found ? normalizeNote(found) : undefined
}

export function createNote(req: CreateNoteRequest): ResourceNote {
  const stamp = nowIso()
  let scope = req.scope ?? 'global'
  if (req.resourceName && req.resourceKind) scope = 'resource'
  else if (req.clusterId && !req.workspaceId && scope === 'global') scope = 'cluster'
  else if (req.workspaceId && scope === 'global') scope = 'workspace'

  const note = normalizeNote({
    id: randomUUID(),
    title: req.title,
    body: req.body ?? '',
    scope,
    createdAt: stamp,
    updatedAt: stamp,
    clusterId: req.clusterId,
    workspaceId: req.workspaceId,
    resourceKind: req.resourceKind,
    namespace: req.namespace,
    resourceName: req.resourceName,
    remindAt: req.remindAt ?? null,
    reminderFiredAt: null,
    pinned: req.pinned
  })

  writeScopeNotes([...scopeNotes(), note])
  return note
}

export function updateNote(id: string, patch: NotePatch): ResourceNote | undefined {
  const notes = scopeNotes()
  const idx = notes.findIndex((n) => n.id === id)
  if (idx < 0) {
    // Reminder scheduler may fire notes from any session scope
    return updateNoteAnywhere(id, patch)
  }

  const prev = normalizeNote(notes[idx])
  const next = applyPatch(prev, patch)

  notes[idx] = next
  writeScopeNotes(notes)
  return next
}

function applyPatch(prev: ResourceNote, patch: NotePatch): ResourceNote {
  return normalizeNote({
    ...prev,
    ...patch,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: nowIso(),
    reminderFiredAt:
      patch.reminderFiredAt !== undefined
        ? patch.reminderFiredAt
        : patch.remindAt !== undefined && patch.remindAt !== prev.remindAt
          ? null
          : prev.reminderFiredAt
  })
}

/** Update a note in whichever session scope it lives in. */
export function updateNoteAnywhere(id: string, patch: NotePatch): ResourceNote | undefined {
  const scopes = { ...(store.get('scopes') ?? {}) }
  for (const [scopeKey, list] of Object.entries(scopes)) {
    const notes = list ?? []
    const idx = notes.findIndex((n) => n.id === id)
    if (idx < 0) continue
    const prev = normalizeNote(notes[idx])
    const next = applyPatch(prev, patch)
    const copy = [...notes]
    copy[idx] = next
    scopes[scopeKey] = copy
    store.set('scopes', scopes)
    return next
  }
  return undefined
}

export function removeNote(id: string): boolean {
  const notes = scopeNotes()
  const next = notes.filter((n) => n.id !== id)
  if (next.length === notes.length) return false
  writeScopeNotes(next)
  return true
}

/** Notes whose reminder is due and not yet fired (all session scopes). */
export function listDueReminders(now = Date.now()): ResourceNote[] {
  const scopes = store.get('scopes') ?? {}
  const due: ResourceNote[] = []
  for (const list of Object.values(scopes)) {
    for (const raw of list ?? []) {
      const n = normalizeNote(raw)
      if (!n.remindAt || n.reminderFiredAt) continue
      const t = Date.parse(n.remindAt)
      if (Number.isFinite(t) && t <= now) due.push(n)
    }
  }
  return due
}

/** Earliest future (unfired) remindAt timestamp, or null. */
export function nextUpcomingRemindAt(now = Date.now()): number | null {
  const scopes = store.get('scopes') ?? {}
  let soonest: number | null = null
  for (const list of Object.values(scopes)) {
    for (const raw of list ?? []) {
      const n = normalizeNote(raw)
      if (!n.remindAt || n.reminderFiredAt) continue
      const t = Date.parse(n.remindAt)
      if (!Number.isFinite(t) || t <= now) continue
      if (soonest === null || t < soonest) soonest = t
    }
  }
  return soonest
}
