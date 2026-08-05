import { randomUUID } from 'crypto'
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import { app } from 'electron'
import Store from 'electron-store'
import type {
  CreateNoteRequest,
  FolderIconImportResult,
  ListNotesRequest,
  NotePatch,
  NoteScope,
  ResourceNote,
  VaultFolderNode,
  VaultImportCandidate,
  VaultImportFileResult,
  VaultStatus
} from '@shared/types/notes'
import { isReminderDue, isReminderUpcoming, normalizeReminderSchedule } from '@shared/reminderSchedule'
import { isWelcomeSparkNote } from '@shared/notes/welcomeSpark'
import { parseNoteFile, serializeNoteFile, slugifyTitle } from './frontmatter'
import { sparksMediaUrl } from './mediaProtocol'

interface VaultMetaSchema {
  vaultPath: string | null
  migratedFromJson: boolean
  /** When true, default Inbox/Journal/… dirs were created once and must not be re-created after delete. */
  defaultsSeeded: boolean
}

interface LegacyStoreSchema {
  scopes?: Record<string, LegacyNote[]>
}

interface LegacyNote {
  id: string
  title: string
  body: string
  scope?: NoteScope
  createdAt?: string
  updatedAt?: string
  clusterId?: string
  workspaceId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  remindAt?: string | null
  reminderFiredAt?: string | null
  pinned?: boolean
}

const metaStore = new Store<VaultMetaSchema>({
  name: 'sparks-vault',
  defaults: { vaultPath: null, migratedFromJson: false, defaultsSeeded: false }
})

const legacyStore = new Store<LegacyStoreSchema>({
  name: 'resource-notes',
  defaults: { scopes: {} }
})

let cachedNotes: ResourceNote[] | null = null
let cachedVaultPath: string | null = null

function nowIso(): string {
  return new Date().toISOString()
}

export function defaultVaultPath(): string {
  return join(app.getPath('documents'), 'MagicLens', 'Sparks')
}

export function getVaultPath(): string {
  const custom = metaStore.get('vaultPath')
  if (custom && typeof custom === 'string' && custom.trim()) return custom.trim()
  return defaultVaultPath()
}

export function setVaultPath(next: string): string {
  const resolved = resolve(next)
  metaStore.set('vaultPath', resolved)
  invalidateCache()
  ensureVault()
  return resolved
}

export function ensureVault(): string {
  const root = getVaultPath()
  const hadRoot = existsSync(root)
  mkdirSync(root, { recursive: true })
  // Seed default folders only once so user deletes stay deleted.
  if (!metaStore.get('defaultsSeeded') || !hadRoot) {
    mkdirSync(join(root, 'Inbox'), { recursive: true })
    mkdirSync(join(root, 'Journal'), { recursive: true })
    mkdirSync(join(root, 'Clusters'), { recursive: true })
    mkdirSync(join(root, 'Resources'), { recursive: true })
    metaStore.set('defaultsSeeded', true)
  }
  migrateLegacyIfNeeded()
  seedStarterNotes(root)
  return root
}

function seedStarterNotes(root: string): void {
  const stamp = nowIso()
  const starters: Array<{
    rel: string
    title: string
    tags: string[]
    pinned?: boolean
    body: string
  }> = [
    {
      rel: 'Inbox/Welcome.md',
      title: 'Welcome to Sparks',
      tags: ['welcome'],
      pinned: true,
      body: [
        'Sparks is the **notes workspace** inside MagicLens — write Markdown, link ideas, draw on the page, and attach context from your clusters.',
        '',
        '## Start here',
        '',
        '1. Skim this page for the full feature map',
        '2. Open [[Getting Started]] for a short hands-on tour',
        '3. Keep [[Wiki Links]] handy for `[[link]]` syntax',
        '',
        '---',
        '',
        '## Write modes',
        '',
        'Toolbar icons (hover for names):',
        '',
        '| Mode | What it does |',
        '| --- | --- |',
        '| **Write** | Markdown editor only |',
        '| **Split** | Editor + live preview side by side |',
        '| **Read** | Preview only — click `[[links]]` to jump |',
        '| **Draw** | Draw / shape / media tools on the note page |',
        '',
        'Title and body **autosave** as you type.',
        '',
        '## Draw on the page',
        '',
        'Switch to **Draw** to open the tool strip:',
        '',
        '- **Pen / highlighter / eraser** — freehand on the sheet',
        '- **Shapes** — rectangle, ellipse, line, arrow',
        '- **Image / video / file** — attach into the note (saved under `Attachments/`)',
        '- Colors, stroke size, undo, clear',
        '',
        'Drawings stay with the note; media also lands in the Markdown body.',
        '',
        '## Notebook paper',
        '',
        '- **Page style** — plain, lined, grid, or notebook',
        '- **Size** — width (narrow → full), zoom, and page length (normal / tall / extra long)',
        '',
        '## Wiki links',
        '',
        '- Type `[[` for autocomplete of existing notes',
        '- `[[Note title]]` or `[[Note title|label]]`',
        '- **Links** panel — outgoing links + backlinks; create missing notes in one click',
        '',
        'See [[Wiki Links]] for the cheatsheet.',
        '',
        '## Graph & Canvas',
        '',
        '| View | Purpose |',
        '| --- | --- |',
        '| **Graph** | Map of who links to whom — click a node to open |',
        '| **Canvas** | Free board — place notes, stickies, connections |',
        '| **Split** | Note + Graph, Note + Canvas, or Graph + Canvas |',
        '',
        'Toggle Graph / Canvas modules under **Settings → Sparks** if you hide them.',
        '',
        '## Organize',
        '',
        '- **Folders** — tree in the sidebar; create folders anytime',
        '- **Tags** — `#tag` in the body or frontmatter; filter from the sidebar',
        '- **Search** — title, body, path, tags',
        '- **Tabs** — open several notes; pin, close, drag to reorder',
        '- **Pin** — keep important notes marked',
        '',
        '## Templates',
        '',
        'Use **Templates** for ready-made starters:',
        '',
        '- Daily journal',
        '- Incident note',
        '- Concept',
        '- Project',
        '',
        '## Reminders',
        '',
        '- Bell on the note — once, weekly, monthly, or custom dates',
        '- Fires as OS + in-app pings while MagicLens is open',
        '- **Sparks inbox** (bell) — unread pings, mark read, jump to the note',
        '',
        '## Themes',
        '',
        'Pick a vault look in **Settings → Sparks**: System, Paper, Parchment, Mono, Matcha, Ocean, Forest, Rose, Ink, Dusk, Nord, Solar, Ember.',
        '',
        '## Vault',
        '',
        '- Notes are plain `.md` files in a vault folder on disk',
        '- **Choose vault folder** — pick where Sparks stores files',
        '- **Open vault on disk** — reveal the folder in Finder / Explorer',
        '',
        '## Kubernetes → Sparks',
        '',
        '- From a pod / workload: **Add spark** creates a note with cluster & resource metadata in frontmatter',
        '- Resource detail views include a **Sparks** tab for notes scoped to that object',
        '- Scope can be global, workspace, cluster, or resource when creating from the K8s UI',
        '',
        '## Modules',
        '',
        'In **Settings → Sparks** (or the plugins menu) you can toggle:',
        '',
        '- Templates',
        '- Graph',
        '- Canvas',
        '- Wiki links',
        '',
        '---',
        '',
        'Next: [[Getting Started]] · [[Wiki Links]]'
      ].join('\n')
    },
    {
      rel: 'Inbox/Getting Started.md',
      title: 'Getting Started',
      tags: ['guide'],
      body: [
        'A short hands-on tour. Full feature map: [[Welcome to Sparks]].',
        '',
        '## Write',
        '',
        '- **Write** — Markdown editor',
        '- **Split** — editor + preview',
        '- **Read** — preview; click `[[links]]`',
        '- **Draw** — pen, shapes, image / video / file',
        '',
        'Autosave runs as you type.',
        '',
        '## Link',
        '',
        'Type `[[` to link another note. Example: [[Welcome to Sparks]].',
        '',
        'Missing links can be created from the **Links** panel.',
        '',
        '## Organize',
        '',
        '- Folders & tags in the sidebar',
        '- Search across title, body, path, tags',
        '- Tabs: open, pin, drag to reorder',
        '',
        '## Graph & Canvas',
        '',
        '- **Graph** — wiki-link map',
        '- **Canvas** — free spatial board',
        '- **Split** — combine note + graph/canvas',
        '',
        '## Reminders & K8s',
        '',
        '- Bell on a note for scheduled pings',
        '- From a workload: **Add spark** with cluster metadata',
        '',
        'More detail: [[Welcome to Sparks]] · [[Wiki Links]]'
      ].join('\n')
    },
    {
      rel: 'Inbox/Wiki Links.md',
      title: 'Wiki Links',
      tags: ['guide', 'wiki'],
      body: [
        'Cheatsheet for `[[wiki links]]`.',
        '',
        '| Syntax | Result |',
        '| --- | --- |',
        '| `[[Welcome to Sparks]]` | Link by title |',
        '| `[[Welcome to Sparks|Home]]` | Custom label |',
        '',
        'Backlinks appear automatically on the right when someone links here.',
        '',
        'See also: [[Getting Started]] · [[Welcome to Sparks]]'
      ].join('\n')
    }
  ]

  let wrote = false
  for (const starter of starters) {
    const abs = join(root, ...starter.rel.split('/'))
    if (existsSync(abs)) {
      if (starter.rel === 'Inbox/Welcome.md') {
        try {
          const raw = readFileSync(abs, 'utf8')
          const legacyStub = raw.includes('Link notes later with') && raw.length < 600
          const privacyCopy =
            raw.includes('offline, no sync, no tracking') ||
            raw.includes('## Privacy') ||
            raw.includes('Nothing is uploaded')
          const shortWelcome =
            starter.rel === 'Inbox/Welcome.md' &&
            !raw.includes('## Draw on the page') &&
            !raw.includes('## Feature map')
          if (!legacyStub && !privacyCopy && !shortWelcome) continue
          const existing = readNoteFromDisk(abs, root)
          if (!existing) continue
          const next = normalizeNote({
            ...existing,
            title: starter.title,
            body: starter.body,
            tags: starter.tags,
            pinned: Boolean(starter.pinned),
            updatedAt: stamp
          })
          writeFileSync(abs, serializeNoteFile(next), 'utf8')
          wrote = true
          continue
        } catch {
          continue
        }
      }
      continue
    }
    // Don't recreate parent folders the user deleted (e.g. Inbox).
    if (!existsSync(dirname(abs))) continue
    mkdirSync(dirname(abs), { recursive: true })
    const folder = dirname(starter.rel).replace(/\\/g, '/')
    const note = normalizeNote({
      id: randomUUID(),
      title: starter.title,
      body: starter.body,
      scope: 'global',
      path: starter.rel,
      folder: folder === '.' ? '' : folder,
      tags: starter.tags,
      createdAt: stamp,
      updatedAt: stamp,
      pinned: Boolean(starter.pinned)
    })
    writeFileSync(abs, serializeNoteFile(note), 'utf8')
    wrote = true
  }
  if (wrote) invalidateCache()
}

function listMarkdownQuick(root: string): number {
  const files: string[] = []
  try {
    walkMarkdownFiles(root, root, files)
  } catch {
    return 0
  }
  return files.length
}

function invalidateCache(): void {
  cachedNotes = null
  cachedVaultPath = null
}

function isInsideVault(absPath: string, root: string): boolean {
  const rel = relative(root, absPath)
  return Boolean(rel) && !rel.startsWith('..') && !rel.includes(`..${sep}`)
}

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function normalizeFolder(folder?: string | null): string {
  if (!folder) return ''
  return toPosix(folder)
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.\./g, '')
}

function folderForScope(req: CreateNoteRequest): string {
  if (req.folder) return normalizeFolder(req.folder)
  if (req.resourceName && req.resourceKind) return 'Resources'
  if (req.clusterId) return 'Clusters'
  return 'Inbox'
}

function normalizeNote(raw: Partial<ResourceNote> & { id: string; title: string; path: string }): ResourceNote {
  const folder = normalizeFolder(raw.folder ?? dirname(raw.path).replace(/^\.$/, ''))
  return {
    id: raw.id,
    title: (raw.title ?? '').trim() || 'Untitled',
    body: raw.body ?? '',
    scope: raw.scope ?? 'global',
    path: toPosix(raw.path),
    folder: folder === '.' ? '' : folder,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean) : [],
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || nowIso(),
    ...(raw.clusterId ? { clusterId: raw.clusterId } : {}),
    ...(raw.workspaceId ? { workspaceId: raw.workspaceId } : {}),
    ...(raw.resourceKind ? { resourceKind: raw.resourceKind } : {}),
    ...(raw.namespace ? { namespace: raw.namespace } : {}),
    ...(raw.resourceName ? { resourceName: raw.resourceName } : {}),
    remindAt: raw.remindAt ?? null,
    reminderFiredAt: raw.reminderFiredAt ?? null,
    reminderSchedule: normalizeReminderSchedule(raw.reminderSchedule),
    pinned: Boolean(raw.pinned)
  }
}

function walkMarkdownFiles(dir: string, root: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkMarkdownFiles(abs, root, out)
      continue
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      out.push(abs)
    }
  }
}

function readNoteFromDisk(absPath: string, root: string): ResourceNote | null {
  try {
    const raw = readFileSync(absPath, 'utf8')
    const { meta, body } = parseNoteFile(raw)
    const rel = toPosix(relative(root, absPath))
    const folder = normalizeFolder(dirname(rel).replace(/^\.$/, ''))
    const titleFromFile = basename(absPath, '.md')
    return normalizeNote({
      id: typeof meta.id === 'string' && meta.id ? meta.id : rel,
      title: typeof meta.title === 'string' && meta.title ? meta.title : titleFromFile,
      body,
      scope: meta.scope ?? 'global',
      path: rel,
      folder,
      tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
      clusterId: meta.clusterId,
      workspaceId: meta.workspaceId,
      resourceKind: meta.resourceKind,
      namespace: meta.namespace,
      resourceName: meta.resourceName,
      remindAt: meta.remindAt ?? null,
      reminderFiredAt: meta.reminderFiredAt ?? null,
      reminderSchedule: normalizeReminderSchedule(meta.reminderSchedule),
      pinned: Boolean(meta.pinned),
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt || (() => {
        try {
          return statSync(absPath).mtime.toISOString()
        } catch {
          return nowIso()
        }
      })()
    })
  } catch {
    return null
  }
}

function loadAllNotes(): ResourceNote[] {
  const root = ensureVault()
  if (cachedNotes && cachedVaultPath === root) return cachedNotes
  const files: string[] = []
  walkMarkdownFiles(root, root, files)
  const notes: ResourceNote[] = []
  for (const abs of files) {
    const note = readNoteFromDisk(abs, root)
    if (note) notes.push(note)
  }
  cachedNotes = notes
  cachedVaultPath = root
  return notes
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
    if (filter.folder !== undefined) {
      const f = normalizeFolder(filter.folder)
      if (f === '') {
        if (note.folder !== '') return false
      } else if (note.folder !== f && !note.folder.startsWith(`${f}/`)) {
        return false
      }
    }
    if (filter.tag) {
      const tag = filter.tag.replace(/^#/, '').toLowerCase()
      if (!note.tags.some((t) => t.toLowerCase() === tag)) return false
    }
    if (filter.clusterId && note.clusterId && note.clusterId !== filter.clusterId) {
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
    const hay =
      `${note.title}\n${note.body}\n${note.tags.join(' ')}\n${note.path}\n${note.resourceName ?? ''}\n${note.resourceKind ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

function uniqueFilePath(root: string, folder: string, title: string, preferId?: string): string {
  const slug = slugifyTitle(title)
  const dir = folder ? join(root, ...folder.split('/')) : root
  mkdirSync(dir, { recursive: true })
  let candidate = join(dir, `${slug}.md`)
  let i = 2
  while (existsSync(candidate)) {
    if (preferId) {
      try {
        const existing = readNoteFromDisk(candidate, root)
        if (existing?.id === preferId) return candidate
      } catch {
        // continue
      }
    }
    candidate = join(dir, `${slug}-${i}.md`)
    i += 1
  }
  return candidate
}

function writeNoteFile(note: ResourceNote): void {
  const root = getVaultPath()
  mkdirSync(root, { recursive: true })
  const abs = join(root, ...note.path.split('/').filter(Boolean))
  const rel = relative(root, abs)
  if (!rel || rel.startsWith('..')) {
    throw new Error('Invalid note path')
  }
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, serializeNoteFile(note), 'utf8')
  invalidateCache()
}

function migrateLegacyIfNeeded(): void {
  if (metaStore.get('migratedFromJson')) return
  const scopes = legacyStore.get('scopes') ?? {}
  const all: LegacyNote[] = []
  for (const list of Object.values(scopes)) {
    for (const n of list ?? []) all.push(n)
  }
  if (all.length === 0) {
    metaStore.set('migratedFromJson', true)
    return
  }

  const root = getVaultPath()
  for (const raw of all) {
    const folder =
      raw.resourceName && raw.resourceKind
        ? 'Resources'
        : raw.clusterId
          ? 'Clusters'
          : raw.workspaceId
            ? 'Journal'
            : 'Inbox'
    const abs = uniqueFilePath(root, folder, raw.title || 'Untitled', raw.id)
    const rel = toPosix(relative(root, abs))
    const note = normalizeNote({
      id: raw.id || randomUUID(),
      title: raw.title || 'Untitled',
      body: raw.body || '',
      scope: raw.scope ?? 'global',
      path: rel,
      folder,
      tags: [],
      clusterId: raw.clusterId,
      workspaceId: raw.workspaceId,
      resourceKind: raw.resourceKind,
      namespace: raw.namespace,
      resourceName: raw.resourceName,
      remindAt: raw.remindAt ?? null,
      reminderFiredAt: raw.reminderFiredAt ?? null,
      reminderSchedule: normalizeReminderSchedule(
        (raw as { reminderSchedule?: unknown }).reminderSchedule
      ),
      pinned: Boolean(raw.pinned),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    })
    writeFileSync(abs, serializeNoteFile(note), 'utf8')
  }
  metaStore.set('migratedFromJson', true)
  invalidateCache()
}

export function listNotes(filter?: ListNotesRequest): ResourceNote[] {
  return sortNotes(loadAllNotes().filter((n) => matchesFilter(n, filter)))
}

export function getNote(id: string): ResourceNote | undefined {
  return loadAllNotes().find((n) => n.id === id || n.path === id)
}

export function createNote(req: CreateNoteRequest): ResourceNote {
  const stamp = nowIso()
  let scope: NoteScope = req.scope ?? 'global'
  if (req.resourceName && req.resourceKind) scope = 'resource'
  else if (req.clusterId && !req.workspaceId && scope === 'global') scope = 'cluster'
  else if (req.workspaceId && scope === 'global') scope = 'workspace'

  const folder = folderForScope(req)
  const root = ensureVault()
  const abs = uniqueFilePath(root, folder, req.title)
  const rel = toPosix(relative(root, abs))
  const note = normalizeNote({
    id: randomUUID(),
    title: req.title,
    body: req.body ?? '',
    scope,
    path: rel,
    folder,
    tags: req.tags ?? [],
    clusterId: req.clusterId,
    workspaceId: req.workspaceId,
    resourceKind: req.resourceKind,
    namespace: req.namespace,
    resourceName: req.resourceName,
    remindAt: req.remindAt ?? null,
    reminderFiredAt: null,
    reminderSchedule: normalizeReminderSchedule(req.reminderSchedule),
    pinned: req.pinned,
    createdAt: stamp,
    updatedAt: stamp
  })
  writeNoteFile(note)
  return note
}

function applyPatch(prev: ResourceNote, patch: NotePatch): ResourceNote {
  const scheduleChanged = patch.reminderSchedule !== undefined
  const remindChanged = patch.remindAt !== undefined && patch.remindAt !== prev.remindAt
  return normalizeNote({
    ...prev,
    ...patch,
    id: prev.id,
    path: prev.path,
    folder: patch.folder !== undefined ? normalizeFolder(patch.folder) : prev.folder,
    tags: patch.tags ?? prev.tags,
    createdAt: prev.createdAt,
    updatedAt: nowIso(),
    reminderSchedule:
      patch.reminderSchedule !== undefined
        ? normalizeReminderSchedule(patch.reminderSchedule)
        : prev.reminderSchedule ?? null,
    reminderFiredAt:
      patch.reminderFiredAt !== undefined
        ? patch.reminderFiredAt
        : remindChanged || scheduleChanged
          ? null
          : prev.reminderFiredAt
  })
}

export function updateNote(id: string, patch: NotePatch): ResourceNote | undefined {
  const prev = getNote(id)
  if (!prev) return undefined

  // Welcome spark is a seeded guide — only pin toggles are allowed.
  let effectivePatch = patch
  if (isWelcomeSparkNote(prev)) {
    if (patch.pinned === undefined) return prev
    effectivePatch = { pinned: patch.pinned }
  }

  const next = applyPatch(prev, effectivePatch)
  const root = ensureVault()
  const oldAbs = join(root, ...prev.path.split('/'))

  const folderChanged =
    normalizeFolder(effectivePatch.folder) !== prev.folder && effectivePatch.folder !== undefined
  const titleChanged =
    effectivePatch.title !== undefined && effectivePatch.title.trim() !== prev.title
  let nextPath = prev.path

  if (folderChanged || titleChanged) {
    const folder = folderChanged ? normalizeFolder(effectivePatch.folder) : prev.folder
    const abs = uniqueFilePath(root, folder, next.title, prev.id)
    nextPath = toPosix(relative(root, abs))
    next.path = nextPath
    next.folder = folder
    writeNoteFile(next)
    if (resolve(oldAbs) !== resolve(abs) && existsSync(oldAbs)) {
      rmSync(oldAbs)
    }
  } else {
    writeNoteFile(next)
  }

  invalidateCache()
  return getNote(next.id) ?? next
}

/** Alias kept for reminder scheduler. Vault has a single namespace. */
export function updateNoteAnywhere(id: string, patch: NotePatch): ResourceNote | undefined {
  return updateNote(id, patch)
}

export function removeNote(id: string): boolean {
  const note = getNote(id)
  if (!note) return false
  if (isWelcomeSparkNote(note)) return false
  const root = ensureVault()
  const abs = join(root, ...note.path.split('/'))
  if (!existsSync(abs)) {
    invalidateCache()
    return false
  }
  rmSync(abs)
  invalidateCache()
  return true
}

export function listDueReminders(now = Date.now()): ResourceNote[] {
  const due: ResourceNote[] = []
  for (const n of loadAllNotes()) {
    if (isReminderDue(n.remindAt, n.reminderFiredAt, now)) due.push(n)
  }
  return due
}

export function nextUpcomingRemindAt(now = Date.now()): number | null {
  let soonest: number | null = null
  for (const n of loadAllNotes()) {
    if (!isReminderUpcoming(n.remindAt, n.reminderFiredAt, now)) continue
    const t = Date.parse(n.remindAt!)
    if (soonest === null || t < soonest) soonest = t
  }
  return soonest
}

export function createFolder(
  folder: string,
  opts?: { icon?: string | null; image?: string | null }
): { ok: boolean; path: string } {
  const normalized = normalizeFolder(folder)
  if (!normalized) return { ok: false, path: '' }
  const root = ensureVault()
  const abs = join(root, ...normalized.split('/'))
  if (!isInsideVault(abs, root) && abs !== join(root, normalized)) {
    return { ok: false, path: '' }
  }
  mkdirSync(abs, { recursive: true })
  if (opts?.icon || opts?.image) {
    const meta = loadFolderMeta(root)
    meta.folders[normalized] = {
      ...(meta.folders[normalized] ?? {}),
      ...(opts.icon ? { icon: opts.icon } : {}),
      ...(opts.image ? { image: opts.image } : {})
    }
    saveFolderMeta(root, meta)
  }
  invalidateCache()
  return { ok: true, path: normalized }
}

export function setFolderIcon(
  folder: string,
  patch: { icon?: string | null; image?: string | null }
): { ok: boolean; path: string } {
  const normalized = normalizeFolder(folder)
  if (!normalized) return { ok: false, path: '' }
  const root = ensureVault()
  const abs = join(root, ...normalized.split('/'))
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    return { ok: false, path: '' }
  }
  const meta = loadFolderMeta(root)
  const prev = meta.folders[normalized] ?? {}
  const next: { icon?: string; image?: string } = { ...prev }
  if (patch.icon !== undefined) {
    if (patch.icon) next.icon = patch.icon
    else delete next.icon
  }
  if (patch.image !== undefined) {
    if (patch.image) next.image = patch.image
    else delete next.image
  }
  if (Object.keys(next).length === 0) delete meta.folders[normalized]
  else meta.folders[normalized] = next
  saveFolderMeta(root, meta)
  return { ok: true, path: normalized }
}

function uniqueFolderIconName(dir: string, name: string): string {
  const base = basename(name)
  if (!existsSync(join(dir, base))) return base
  const ext = extname(base)
  const stem = basename(base, ext)
  let i = 2
  while (existsSync(join(dir, `${stem}-${i}${ext}`))) i += 1
  return `${stem}-${i}${ext}`
}

/** Copy an image into `.sparks/folder-icons/` for use as a folder photo. */
export function importFolderIcon(sourcePath: string): FolderIconImportResult {
  try {
    if (!existsSync(sourcePath)) return { ok: false, error: 'File not found' }
    const root = ensureVault()
    const dir = join(root, '.sparks', 'folder-icons')
    mkdirSync(dir, { recursive: true })
    const name = uniqueFolderIconName(dir, basename(sourcePath))
    const dest = join(dir, name)
    copyFileSync(sourcePath, dest)
    const relative = `.sparks/folder-icons/${name}`
    return { ok: true, path: relative, src: sparksMediaUrl(relative) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Persist a cropped PNG/JPEG data URL into `.sparks/folder-icons/`. */
export function saveFolderIconDataUrl(dataUrl: string): FolderIconImportResult {
  try {
    const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl.trim())
    if (!match) return { ok: false, error: 'Invalid image data' }
    const mime = match[1].toLowerCase()
    const ext = mime.includes('jpeg') || mime.includes('jpg') ? '.jpg' : mime.includes('webp') ? '.webp' : '.png'
    const buffer = Buffer.from(match[2], 'base64')
    const root = ensureVault()
    const dir = join(root, '.sparks', 'folder-icons')
    mkdirSync(dir, { recursive: true })
    const name = uniqueFolderIconName(dir, `folder-icon${ext}`)
    const dest = join(dir, name)
    writeFileSync(dest, buffer)
    const relative = `.sparks/folder-icons/${name}`
    return { ok: true, path: relative, src: sparksMediaUrl(relative) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function renameFolder(
  from: string,
  to: string
): { ok: boolean; path: string; error?: string } {
  const fromN = normalizeFolder(from)
  const toN = normalizeFolder(to)
  if (!fromN || !toN) return { ok: false, path: '', error: 'invalid' }
  if (fromN === toN) return { ok: true, path: toN }
  if (toN === fromN || toN.startsWith(`${fromN}/`)) {
    return { ok: false, path: '', error: 'invalid' }
  }
  const root = ensureVault()
  const fromAbs = join(root, ...fromN.split('/'))
  const toAbs = join(root, ...toN.split('/'))
  if (!existsSync(fromAbs) || !statSync(fromAbs).isDirectory()) {
    return { ok: false, path: '', error: 'missing' }
  }
  if (existsSync(toAbs)) return { ok: false, path: '', error: 'exists' }
  if (!isInsideVault(toAbs, root) && toAbs !== join(root, toN)) {
    return { ok: false, path: '', error: 'invalid' }
  }
  mkdirSync(dirname(toAbs), { recursive: true })
  try {
    renameSync(fromAbs, toAbs)
  } catch {
    return { ok: false, path: '', error: 'rename_failed' }
  }

  const meta = loadFolderMeta(root)
  const nextFolders: Record<string, { icon?: string; image?: string }> = {}
  for (const [key, value] of Object.entries(meta.folders)) {
    if (key === fromN) nextFolders[toN] = value
    else if (key.startsWith(`${fromN}/`)) nextFolders[`${toN}${key.slice(fromN.length)}`] = value
    else nextFolders[key] = value
  }
  meta.folders = nextFolders
  saveFolderMeta(root, meta)
  invalidateCache()
  return { ok: true, path: toN }
}

export function deleteFolder(
  folder: string,
  opts?: { withNotes?: boolean }
): {
  ok: boolean
  path?: string
  error?: 'invalid' | 'missing' | 'not_empty' | 'delete_failed'
  noteCount?: number
  deletedNotes?: number
} {
  const normalized = normalizeFolder(folder)
  if (!normalized) return { ok: false, error: 'invalid' }
  const root = ensureVault()
  const abs = join(root, ...normalized.split('/'))
  if (existsSync(abs) && !isInsideVault(abs, root)) {
    return { ok: false, error: 'invalid' }
  }

  const notes = loadAllNotes().filter(
    (n) => n.folder === normalized || n.folder.startsWith(`${normalized}/`)
  )
  if (notes.length > 0 && !opts?.withNotes) {
    return { ok: false, error: 'not_empty', noteCount: notes.length, path: normalized }
  }

  let deletedNotes = 0
  if (opts?.withNotes && notes.length > 0) {
    for (const note of notes) {
      if (removeNote(note.id)) deletedNotes += 1
    }
  }

  // Directory may already be gone — still clean meta so the UI can drop it.
  if (existsSync(abs)) {
    if (!statSync(abs).isDirectory()) {
      return { ok: false, error: 'missing', path: normalized, deletedNotes }
    }
    try {
      rmSync(abs, { recursive: true, force: true })
    } catch {
      return { ok: false, error: 'delete_failed', path: normalized, deletedNotes }
    }
  }

  const meta = loadFolderMeta(root)
  const nextFolders: Record<string, { icon?: string; image?: string }> = {}
  for (const [key, value] of Object.entries(meta.folders)) {
    if (key === normalized || key.startsWith(`${normalized}/`)) continue
    nextFolders[key] = value
  }
  meta.folders = nextFolders
  saveFolderMeta(root, meta)
  invalidateCache()
  return { ok: true, path: normalized, deletedNotes }
}

const FOLDER_META_FILE = '.sparks-folders.json'

interface FolderMetaFile {
  folders: Record<string, { icon?: string; image?: string }>
}

function loadFolderMeta(root: string): FolderMetaFile {
  const abs = join(root, FOLDER_META_FILE)
  if (!existsSync(abs)) return { folders: {} }
  try {
    const raw = JSON.parse(readFileSync(abs, 'utf8')) as FolderMetaFile
    if (!raw || typeof raw !== 'object' || !raw.folders || typeof raw.folders !== 'object') {
      return { folders: {} }
    }
    return { folders: raw.folders }
  } catch {
    return { folders: {} }
  }
}

function saveFolderMeta(root: string, meta: FolderMetaFile): void {
  writeFileSync(join(root, FOLDER_META_FILE), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
}

export function buildFolderTree(): VaultFolderNode[] {
  const rootPath = ensureVault()
  const notes = loadAllNotes()
  const meta = loadFolderMeta(rootPath)
  const root: VaultFolderNode = { name: '', path: '', children: [], noteCount: 0 }
  const map = new Map<string, VaultFolderNode>([['', root]])

  function ensureNode(folderPath: string): VaultFolderNode {
    const key = normalizeFolder(folderPath)
    const existing = map.get(key)
    if (existing) return existing
    const name = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
    const parentPath = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : ''
    const parent = ensureNode(parentPath)
    const metaEntry = meta.folders[key]
    const node: VaultFolderNode = {
      name,
      path: key,
      children: [],
      noteCount: 0,
      ...(metaEntry?.icon ? { icon: metaEntry.icon } : {}),
      ...(metaEntry?.image ? { image: metaEntry.image } : {})
    }
    parent.children.push(node)
    map.set(key, node)
    return node
  }

  function walkDirs(abs: string, rel: string): void {
    let entries
    try {
      entries = readdirSync(abs, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      if (ent.name.startsWith('.')) continue
      const childRel = rel ? `${rel}/${ent.name}` : ent.name
      ensureNode(childRel)
      walkDirs(join(abs, ent.name), childRel)
    }
  }

  walkDirs(rootPath, '')

  // Also include folders that only exist in meta (edge case) or were just created.
  for (const key of Object.keys(meta.folders)) {
    if (key) ensureNode(key)
  }

  for (const note of notes) {
    const parts = note.folder ? note.folder.split('/') : []
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      ensureNode(acc)
    }
    let cursor = note.folder
    while (true) {
      const node = map.get(cursor ?? '')
      if (node) node.noteCount += 1
      if (!cursor) break
      cursor = cursor.includes('/') ? cursor.slice(0, cursor.lastIndexOf('/')) : ''
    }
  }

  function sortTree(nodes: VaultFolderNode[]): VaultFolderNode[] {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: sortTree(n.children) }))
  }

  return sortTree(root.children)
}

export function listTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const note of loadAllNotes()) {
    for (const tag of note.tags) {
      const key = tag.trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const match of note.body.matchAll(/(^|\s)#([a-zA-Z][\w-/]*)/g)) {
      const tag = match[2]
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getVaultStatus(): VaultStatus {
  const vaultPath = ensureVault()
  const notes = loadAllNotes()
  const folders = new Set(notes.map((n) => n.folder).filter(Boolean))
  return {
    vaultPath,
    exists: existsSync(vaultPath),
    noteCount: notes.length,
    folderCount: folders.size,
    migratedFromJson: Boolean(metaStore.get('migratedFromJson')),
    privacy: { localOnly: true, tracking: false }
  }
}

export function vaultPathWritable(pathToCheck: string): boolean {
  try {
    mkdirSync(pathToCheck, { recursive: true })
    accessSync(pathToCheck, constants.W_OK)
    return true
  } catch {
    return false
  }
}

export function moveVaultRoot(nextPath: string): void {
  const prev = getVaultPath()
  const next = resolve(nextPath)
  if (prev === next) {
    setVaultPath(next)
    return
  }
  mkdirSync(next, { recursive: true })
  if (existsSync(prev) && prev !== next) {
    // Best-effort copy of existing tree into new root if empty-ish
    const existing = readdirSync(next)
    if (existing.length === 0) {
      for (const entry of readdirSync(prev)) {
        renameSync(join(prev, entry), join(next, entry))
      }
    }
  }
  setVaultPath(next)
}

function isPathUnder(absPath: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(absPath))
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`))
}

export function scanMarkdownForImport(sourceRoot: string): VaultImportCandidate[] {
  const root = resolve(sourceRoot)
  if (!existsSync(root) || !statSync(root).isDirectory()) return []
  const files: string[] = []
  walkMarkdownFiles(root, root, files)
  const out: VaultImportCandidate[] = []
  for (const abs of files) {
    const rel = toPosix(relative(root, abs))
    if (!rel || rel.startsWith('..')) continue
    let title = basename(abs, '.md')
    try {
      const raw = readFileSync(abs, 'utf8')
      const { meta } = parseNoteFile(raw)
      if (typeof meta.title === 'string' && meta.title.trim()) title = meta.title.trim()
    } catch {
      /* keep filename title */
    }
    out.push({
      relativePath: rel,
      title,
      folder: normalizeFolder(dirname(rel).replace(/^\.$/, ''))
    })
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export function importMarkdownIntoVault(
  sourceRoot: string,
  relativePath: string
): VaultImportFileResult {
  const vaultRoot = ensureVault()
  const sourceResolved = resolve(sourceRoot)
  const relPosix = toPosix(relativePath).replace(/^\/+/, '').replace(/\.\./g, '')
  if (!relPosix || !relPosix.toLowerCase().endsWith('.md')) {
    return { ok: false, relativePath, error: 'invalid_path' }
  }
  const sourceAbs = resolve(join(sourceResolved, ...relPosix.split('/')))
  if (!isPathUnder(sourceAbs, sourceResolved) || sourceAbs === sourceResolved) {
    return { ok: false, relativePath: relPosix, error: 'invalid_path' }
  }
  if (!existsSync(sourceAbs) || !statSync(sourceAbs).isFile()) {
    return { ok: false, relativePath: relPosix, error: 'missing' }
  }
  if (isPathUnder(sourceAbs, vaultRoot)) {
    return { ok: false, relativePath: relPosix, error: 'already_in_vault' }
  }

  try {
    const raw = readFileSync(sourceAbs, 'utf8')
    const { meta, body } = parseNoteFile(raw)
    const titleFromFile = basename(sourceAbs, '.md')
    const title =
      typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : titleFromFile
    const folder = normalizeFolder(dirname(relPosix).replace(/^\.$/, ''))
    const note = createNote({
      title,
      body,
      folder: folder || undefined,
      tags: Array.isArray(meta.tags) ? meta.tags.map(String).filter(Boolean) : [],
      scope: meta.scope ?? 'global',
      clusterId: typeof meta.clusterId === 'string' ? meta.clusterId : undefined,
      workspaceId: typeof meta.workspaceId === 'string' ? meta.workspaceId : undefined,
      resourceKind: typeof meta.resourceKind === 'string' ? meta.resourceKind : undefined,
      namespace: typeof meta.namespace === 'string' ? meta.namespace : undefined,
      resourceName: typeof meta.resourceName === 'string' ? meta.resourceName : undefined,
      pinned: Boolean(meta.pinned)
    })
    return { ok: true, relativePath: relPosix, note }
  } catch (err) {
    return {
      ok: false,
      relativePath: relPosix,
      error: err instanceof Error ? err.message : 'import_failed'
    }
  }
}
