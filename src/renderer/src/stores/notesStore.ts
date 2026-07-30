import { create } from 'zustand'
import type {
  CreateNoteRequest,
  ListNotesRequest,
  NoteEditorMode,
  NotePatch,
  NotesInboxItem,
  NotesReminderEvent,
  ResourceNote,
  VaultFolderNode,
  VaultStatus
} from '@shared/types/notes'
import type {
  SparksPaperExtend,
  SparksPaperStyle,
  SparksPaperWidth,
  SparksPaperZoom,
  SparksSplitFocus,
  SparksSplitMode,
  SparksSurfaceMode,
  SparksThemeId,
  SparksWorkspacePanel
} from '@shared/types/sparks'
import { normalizeSparksThemeId, DEFAULT_PLUGINS_ENABLED } from '../components/Notes/sparksCatalog'
import { folderPathExists, mergeFolderTree } from '../components/Notes/sparksFolderIcons'
import { useClusterStore } from './clusterStore'

const INBOX_LIMIT = 50

function persistTabs(openTabIds: string[], pinnedTabIds: string[]): void {
  try {
    localStorage.setItem('magiclens-sparks-tabs', JSON.stringify(openTabIds))
    localStorage.setItem('magiclens-sparks-pinned-tabs', JSON.stringify(pinnedTabIds))
  } catch {
    // ignore
  }
}

function loadPluginsEnabled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('magiclens-sparks-plugins')
    if (!raw) return { ...DEFAULT_PLUGINS_ENABLED }
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return { ...DEFAULT_PLUGINS_ENABLED, ...parsed }
  } catch {
    return { ...DEFAULT_PLUGINS_ENABLED }
  }
}

function persistPlugins(pluginsEnabled: Record<string, boolean>): void {
  try {
    localStorage.setItem('magiclens-sparks-plugins', JSON.stringify(pluginsEnabled))
  } catch {
    // ignore
  }
}

function sortTabsByPin(openTabIds: string[], pinnedTabIds: string[]): string[] {
  const pinned = openTabIds.filter((id) => pinnedTabIds.includes(id))
  const rest = openTabIds.filter((id) => !pinnedTabIds.includes(id))
  return [...pinned, ...rest]
}

function hasNotesApi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.api?.notes)
}

function eventToInboxItem(event: NotesReminderEvent): NotesInboxItem {
  const { note } = event
  return {
    id: event.eventId,
    noteId: note.id,
    title: note.title,
    body: note.body,
    firedAt: event.firedAt,
    read: false,
    clusterId: note.clusterId,
    resourceKind: note.resourceKind,
    resourceName: note.resourceName,
    namespace: note.namespace
  }
}

interface NotesStoreState {
  notes: ResourceNote[]
  folders: VaultFolderNode[]
  tags: { tag: string; count: number }[]
  vault: VaultStatus | null
  hydrated: boolean
  selectedId: string | null
  secondaryId: string | null
  splitFocus: SparksSplitFocus
  openTabIds: string[]
  pinnedTabIds: string[]
  selectedFolder: string | null
  selectedTag: string | null
  searchQuery: string
  editorMode: NoteEditorMode
  workspacePanel: SparksWorkspacePanel
  splitMode: SparksSplitMode
  themeId: SparksThemeId
  paperStyle: SparksPaperStyle
  paperWidth: SparksPaperWidth
  paperZoom: SparksPaperZoom
  paperExtend: SparksPaperExtend
  surfaceMode: SparksSurfaceMode
  sketchOpen: boolean
  pluginsEnabled: Record<string, boolean>
  editorOpen: boolean
  editingNote: ResourceNote | null
  draftDefaults: CreateNoteRequest | null
  lastReminder: ResourceNote | null
  inbox: NotesInboxItem[]
  inboxOpen: boolean
  hydrate: (filter?: ListNotesRequest) => Promise<void>
  refresh: (filter?: ListNotesRequest) => Promise<void>
  refreshVaultMeta: () => Promise<void>
  createNote: (req: CreateNoteRequest) => Promise<ResourceNote>
  updateNote: (id: string, patch: NotePatch) => Promise<ResourceNote | null>
  removeNote: (id: string) => Promise<boolean>
  createFolder: (folder: string, opts?: { icon?: string; image?: string }) => Promise<boolean>
  renameFolder: (from: string, to: string) => Promise<{ ok: boolean; error?: string }>
  deleteFolder: (
    folder: string,
    withNotes?: boolean
  ) => Promise<{ ok: boolean; error?: string; noteCount?: number; deletedNotes?: number }>
  setFolderIcon: (folder: string, patch: { icon?: string | null; image?: string | null }) => Promise<boolean>
  importFolderIcon: () => Promise<{ ok: boolean; path?: string; src?: string; canceled?: boolean }>
  saveFolderIconDataUrl: (
    dataUrl: string
  ) => Promise<{ ok: boolean; path?: string; src?: string; error?: string }>
  chooseVault: () => Promise<boolean>
  revealVault: () => Promise<void>
  selectNote: (id: string | null) => void
  openNoteTab: (id: string) => void
  closeNoteTab: (id: string) => void
  toggleTabPin: (id: string) => void
  reorderTabs: (fromId: string, toId: string) => void
  setSelectedFolder: (folder: string | null) => void
  setSelectedTag: (tag: string | null) => void
  setSearchQuery: (q: string) => void
  setEditorMode: (mode: NoteEditorMode) => void
  setWorkspacePanel: (panel: SparksWorkspacePanel) => void
  setSplitMode: (mode: SparksSplitMode) => void
  setSplitFocus: (focus: SparksSplitFocus) => void
  setSecondaryId: (id: string | null) => void
  splitNotes: (leftId: string, rightId: string) => void
  setThemeId: (theme: SparksThemeId) => void
  setPaperStyle: (style: SparksPaperStyle) => void
  setPaperWidth: (width: SparksPaperWidth) => void
  setPaperZoom: (zoom: SparksPaperZoom) => void
  setPaperExtend: (extend: SparksPaperExtend) => void
  setSurfaceMode: (mode: SparksSurfaceMode) => void
  setSketchOpen: (open: boolean) => void
  setPluginEnabled: (id: string, enabled: boolean) => void
  openCreate: (defaults?: CreateNoteRequest) => void
  openEdit: (note: ResourceNote) => void
  closeEditor: () => void
  clearLastReminder: () => void
  pushInbox: (event: NotesReminderEvent) => void
  markInboxRead: (id: string) => void
  markAllInboxRead: () => void
  clearInbox: () => void
  setInboxOpen: (open: boolean) => void
  testNotification: () => Promise<{ osOk: boolean; osError?: string }>
  fireReminder: (noteId: string) => Promise<void>
  subscribeReminders: () => () => void
  unreadCount: () => number
  selectedNote: () => ResourceNote | null
}

export const useNotesStore = create<NotesStoreState>()((set, get) => ({
  notes: [],
  folders: [],
  tags: [],
  vault: null,
  hydrated: false,
  selectedId: null,
  secondaryId: null,
  splitFocus: 'primary' as SparksSplitFocus,
  openTabIds: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-tabs')
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return [] as string[]
    }
  })(),
  pinnedTabIds: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-pinned-tabs')
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return [] as string[]
    }
  })(),
  selectedFolder: null,
  selectedTag: null,
  searchQuery: '',
  editorMode: 'edit',
  workspacePanel: 'editor',
  splitMode: 'single',
  themeId: (() => {
    try {
      return normalizeSparksThemeId(localStorage.getItem('magiclens-sparks-theme'))
    } catch {
      return 'default' as const
    }
  })(),
  paperStyle: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-paper')
      if (raw === 'lined' || raw === 'grid' || raw === 'book' || raw === 'plain') return raw
    } catch {
      // ignore
    }
    return 'lined' as const
  })(),
  paperWidth: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-paper-width')
      if (raw === 'sm' || raw === 'md' || raw === 'lg' || raw === 'xl') return raw
    } catch {
      // ignore
    }
    return 'md' as const
  })(),
  paperZoom: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-paper-zoom')
      if (raw === 'out' || raw === 'normal' || raw === 'in' || raw === 'max') return raw
    } catch {
      // ignore
    }
    return 'normal' as const
  })(),
  paperExtend: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-paper-extend')
      if (raw === 'normal' || raw === 'tall' || raw === 'long') return raw
    } catch {
      // ignore
    }
    return 'normal' as const
  })(),
  surfaceMode: (() => {
    try {
      const raw = localStorage.getItem('magiclens-sparks-surface')
      if (raw === 'draw') return 'draw' as const
    } catch {
      // ignore
    }
    return 'write' as const
  })(),
  sketchOpen: false,
  pluginsEnabled: loadPluginsEnabled(),
  editorOpen: false,
  editingNote: null,
  draftDefaults: null,
  lastReminder: null,
  inbox: [],
  inboxOpen: false,

  hydrate: async (filter) => {
    if (!hasNotesApi()) {
      set({ notes: [], hydrated: true })
      return
    }
    try {
      const [notes, folders, tags, vault] = await Promise.all([
        window.api.notes.list(filter),
        window.api.notes.folderTree(),
        window.api.notes.tags(),
        window.api.notes.vaultStatus()
      ])
      const selectedId = get().selectedId
      const stillExists = selectedId && notes.some((n) => n.id === selectedId)
      const nextSelected = stillExists ? selectedId : notes[0]?.id ?? null
      const openTabIds = sortTabsByPin(
        get()
          .openTabIds.filter((id) => notes.some((n) => n.id === id))
          .concat(
            nextSelected &&
              !get().openTabIds.includes(nextSelected) &&
              notes.some((n) => n.id === nextSelected)
              ? [nextSelected]
              : []
          )
          .filter((id, i, arr) => arr.indexOf(id) === i),
        get().pinnedTabIds
      )
      const pinnedTabIds = get().pinnedTabIds.filter((id) => openTabIds.includes(id))
      persistTabs(openTabIds, pinnedTabIds)
      set({
        notes,
        folders,
        tags,
        vault,
        hydrated: true,
        selectedId: nextSelected,
        openTabIds,
        pinnedTabIds
      })
    } catch (err) {
      console.error('[notes] hydrate failed', err)
      set({ notes: [], hydrated: true })
    }
  },

  refresh: async (filter) => {
    if (!hasNotesApi()) return
    try {
      const [notes, folders, tags, vault] = await Promise.all([
        window.api.notes.list(filter),
        window.api.notes.folderTree(),
        window.api.notes.tags(),
        window.api.notes.vaultStatus()
      ])
      set({ notes, folders, tags, vault })
    } catch (err) {
      console.error('[notes] refresh failed', err)
    }
  },

  refreshVaultMeta: async () => {
    if (!hasNotesApi()) return
    const [folders, tags, vault] = await Promise.all([
      window.api.notes.folderTree(),
      window.api.notes.tags(),
      window.api.notes.vaultStatus()
    ])
    set({ folders, tags, vault })
  },

  createNote: async (req) => {
    const note = await window.api.notes.create(req)
    await get().refresh()
    get().openNoteTab(note.id)
    return note
  },

  updateNote: async (id, patch) => {
    const note = await window.api.notes.update(id, patch)
    await get().refresh()
    return note
  },

  removeNote: async (id) => {
    const res = await window.api.notes.remove(id)
    if (res.ok) {
      get().closeNoteTab(id)
      await get().refresh()
    }
    return res.ok
  },

  createFolder: async (folder, opts) => {
    const res = await window.api.notes.createFolder(folder, opts)
    if (!res.ok) return false
    try {
      await get().refreshVaultMeta()
    } catch (err) {
      console.error('[notes] refresh after createFolder failed', err)
    }
    // Ensure the new folder appears even if main process tree is stale.
    if (!folderPathExists(get().folders, res.path)) {
      set({
        folders: mergeFolderTree(get().folders, get().notes, [
          { path: res.path, image: opts?.image, icon: opts?.icon }
        ])
      })
    }
    return true
  },

  renameFolder: async (from, to) => {
    const res = await window.api.notes.renameFolder(from, to)
    if (!res.ok) return { ok: false, error: res.error }
    const state = get()
    let selectedFolder = state.selectedFolder
    if (selectedFolder === from) selectedFolder = res.path
    else if (selectedFolder?.startsWith(`${from}/`)) {
      selectedFolder = `${res.path}${selectedFolder.slice(from.length)}`
    }
    set({ selectedFolder })
    await get().refresh()
    return { ok: true }
  },

  deleteFolder: async (folder, withNotes) => {
    try {
      const res = await window.api.notes.deleteFolder(folder, withNotes)
      if (!res.ok) {
        return { ok: false, error: res.error, noteCount: res.noteCount }
      }
      const state = get()
      let selectedFolder = state.selectedFolder
      if (
        selectedFolder === folder ||
        (selectedFolder && selectedFolder.startsWith(`${folder}/`))
      ) {
        selectedFolder = null
      }
      // Optimistically drop the folder from the tree before refresh.
      const prune = (nodes: VaultFolderNode[]): VaultFolderNode[] =>
        nodes
          .filter((n) => n.path !== folder && !n.path.startsWith(`${folder}/`))
          .map((n) => ({ ...n, children: prune(n.children) }))
      set({ selectedFolder, folders: prune(state.folders) })
      await get().refresh()
      return { ok: true, deletedNotes: res.deletedNotes }
    } catch (err) {
      console.error('[notes] deleteFolder failed', err)
      return { ok: false, error: 'delete_failed' }
    }
  },

  setFolderIcon: async (folder, patch) => {
    const res = await window.api.notes.setFolderIcon(folder, patch)
    if (res.ok) await get().refreshVaultMeta()
    return res.ok
  },

  importFolderIcon: async () => {
    if (!hasNotesApi()) return { ok: false as const }
    return window.api.notes.importFolderIcon()
  },

  saveFolderIconDataUrl: async (dataUrl) => {
    if (!hasNotesApi()) return { ok: false as const, error: 'Notes API unavailable' }
    return window.api.notes.saveFolderIconDataUrl(dataUrl)
  },

  chooseVault: async () => {
    const res = await window.api.notes.chooseVault()
    if (res.ok) await get().hydrate()
    return Boolean(res.ok)
  },

  revealVault: async () => {
    await window.api.notes.revealVault()
  },

  selectNote: (id) => {
    if (!id) {
      set({ selectedId: null })
      return
    }
    const state = get()
    if (state.splitMode === 'notes' && state.splitFocus === 'secondary') {
      get().setSecondaryId(id)
      return
    }
    get().openNoteTab(id)
  },

  openNoteTab: (id) => {
    set((state) => {
      const openTabIds = sortTabsByPin(
        state.openTabIds.includes(id) ? state.openTabIds : [...state.openTabIds, id],
        state.pinnedTabIds
      )
      persistTabs(openTabIds, state.pinnedTabIds)
      if (state.splitMode === 'notes' && state.splitFocus === 'secondary') {
        return { secondaryId: id, openTabIds, workspacePanel: 'editor' as const }
      }
      return { selectedId: id, openTabIds, workspacePanel: 'editor' as const }
    })
  },

  closeNoteTab: (id) => {
    set((state) => {
      const openTabIds = state.openTabIds.filter((x) => x !== id)
      const pinnedTabIds = state.pinnedTabIds.filter((x) => x !== id)
      let selectedId = state.selectedId
      let secondaryId = state.secondaryId
      if (selectedId === id) {
        const idx = state.openTabIds.indexOf(id)
        selectedId =
          openTabIds.filter((x) => x !== secondaryId)[Math.max(0, idx - 1)] ??
          openTabIds.find((x) => x !== secondaryId) ??
          openTabIds[0] ??
          null
      }
      if (secondaryId === id) {
        secondaryId = openTabIds.find((x) => x !== selectedId) ?? null
      }
      persistTabs(openTabIds, pinnedTabIds)
      return { openTabIds, pinnedTabIds, selectedId, secondaryId }
    })
  },

  toggleTabPin: (id) => {
    set((state) => {
      if (!state.openTabIds.includes(id)) return state
      const pinnedTabIds = state.pinnedTabIds.includes(id)
        ? state.pinnedTabIds.filter((x) => x !== id)
        : [...state.pinnedTabIds, id]
      const openTabIds = sortTabsByPin(state.openTabIds, pinnedTabIds)
      persistTabs(openTabIds, pinnedTabIds)
      return { pinnedTabIds, openTabIds }
    })
  },

  reorderTabs: (fromId, toId) => {
    if (fromId === toId) return
    set((state) => {
      const from = state.openTabIds.indexOf(fromId)
      const to = state.openTabIds.indexOf(toId)
      if (from < 0 || to < 0) return state
      // Keep pinned and unpinned groups separate
      const fromPinned = state.pinnedTabIds.includes(fromId)
      const toPinned = state.pinnedTabIds.includes(toId)
      if (fromPinned !== toPinned) return state
      const next = [...state.openTabIds]
      next.splice(from, 1)
      next.splice(to, 0, fromId)
      const openTabIds = sortTabsByPin(next, state.pinnedTabIds)
      persistTabs(openTabIds, state.pinnedTabIds)
      return { openTabIds }
    })
  },

  setSelectedFolder: (folder) => set({ selectedFolder: folder, selectedTag: null }),

  setSelectedTag: (tag) => set({ selectedTag: tag, selectedFolder: null }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setEditorMode: (mode) => set({ editorMode: mode }),

  setWorkspacePanel: (panel) => set({ workspacePanel: panel }),

  setSplitMode: (mode) => {
    if (mode === 'notes') {
      const { selectedId, openTabIds, secondaryId } = get()
      const nextSecondary =
        secondaryId && secondaryId !== selectedId && openTabIds.includes(secondaryId)
          ? secondaryId
          : (openTabIds.find((id) => id !== selectedId) ?? selectedId)
      set({
        splitMode: mode,
        workspacePanel: 'editor',
        secondaryId: nextSecondary,
        splitFocus: 'primary'
      })
      return
    }
    set({ splitMode: mode, secondaryId: null, splitFocus: 'primary' })
  },

  setSplitFocus: (splitFocus) => set({ splitFocus }),

  setSecondaryId: (id) => {
    if (!id) {
      set({ secondaryId: null })
      return
    }
    set((state) => {
      const openTabIds = sortTabsByPin(
        state.openTabIds.includes(id) ? state.openTabIds : [...state.openTabIds, id],
        state.pinnedTabIds
      )
      persistTabs(openTabIds, state.pinnedTabIds)
      return { secondaryId: id, openTabIds, workspacePanel: 'editor' as const }
    })
  },

  splitNotes: (leftId, rightId) => {
    set((state) => {
      const ids = [leftId, rightId].filter(Boolean)
      const openTabIds = sortTabsByPin(
        [...ids, ...state.openTabIds.filter((id) => !ids.includes(id))],
        state.pinnedTabIds
      )
      persistTabs(openTabIds, state.pinnedTabIds)
      return {
        splitMode: 'notes' as const,
        workspacePanel: 'editor' as const,
        selectedId: leftId,
        secondaryId: rightId,
        splitFocus: 'primary' as const,
        openTabIds
      }
    })
  },

  setThemeId: (themeId) => {
    const next = normalizeSparksThemeId(themeId)
    try {
      localStorage.setItem('magiclens-sparks-theme', next)
    } catch {
      // ignore
    }
    set({ themeId: next })
  },

  setPaperStyle: (paperStyle) => {
    try {
      localStorage.setItem('magiclens-sparks-paper', paperStyle)
    } catch {
      // ignore
    }
    set({ paperStyle })
  },

  setPaperWidth: (paperWidth) => {
    try {
      localStorage.setItem('magiclens-sparks-paper-width', paperWidth)
    } catch {
      // ignore
    }
    set({ paperWidth })
  },

  setPaperZoom: (paperZoom) => {
    try {
      localStorage.setItem('magiclens-sparks-paper-zoom', paperZoom)
    } catch {
      // ignore
    }
    set({ paperZoom })
  },

  setPaperExtend: (paperExtend) => {
    try {
      localStorage.setItem('magiclens-sparks-paper-extend', paperExtend)
    } catch {
      // ignore
    }
    set({ paperExtend })
  },

  setSurfaceMode: (surfaceMode) => {
    const next = surfaceMode === 'draw' ? 'draw' : 'write'
    try {
      localStorage.setItem('magiclens-sparks-surface', next)
    } catch {
      // ignore
    }
    set({ surfaceMode: next, sketchOpen: next === 'draw' })
  },

  setSketchOpen: (sketchOpen) =>
    set({ sketchOpen, surfaceMode: sketchOpen ? 'draw' : 'write' }),

  setPluginEnabled: (id, enabled) =>
    set((state) => {
      const pluginsEnabled = { ...state.pluginsEnabled, [id]: enabled }
      persistPlugins(pluginsEnabled)
      return { pluginsEnabled }
    }),

  openCreate: (defaults) => {
    // Vault-first: create immediately and open Sparks workspace
    void (async () => {
      const title =
        defaults?.title?.trim() ||
        defaults?.resourceName ||
        `Untitled ${new Date().toLocaleString()}`
      const note = await get().createNote({
        title,
        body: defaults?.body ?? '',
        scope: defaults?.scope,
        folder: defaults?.folder,
        tags: defaults?.tags,
        clusterId: defaults?.clusterId,
        workspaceId: defaults?.workspaceId,
        resourceKind: defaults?.resourceKind,
        namespace: defaults?.namespace,
        resourceName: defaults?.resourceName,
        remindAt: defaults?.remindAt,
        pinned: defaults?.pinned
      })
      set({ selectedId: note.id, editorOpen: false, editingNote: null, draftDefaults: null })
      useClusterStore.getState().setActiveView('notes')
    })()
  },

  openEdit: (note) => {
    get().openNoteTab(note.id)
    useClusterStore.getState().setActiveView('notes')
  },

  closeEditor: () => {
    set({ editorOpen: false, editingNote: null, draftDefaults: null })
  },

  clearLastReminder: () => set({ lastReminder: null }),

  pushInbox: (event) => {
    const item = eventToInboxItem(event)
    set((state) => ({
      lastReminder: event.note,
      inbox: [item, ...state.inbox.filter((i) => i.id !== item.id)].slice(0, INBOX_LIMIT)
    }))
  },

  markInboxRead: (id) => {
    set((state) => ({
      inbox: state.inbox.map((i) => (i.id === id ? { ...i, read: true } : i))
    }))
  },

  markAllInboxRead: () => {
    set((state) => ({
      inbox: state.inbox.map((i) => ({ ...i, read: true }))
    }))
  },

  clearInbox: () => set({ inbox: [] }),

  setInboxOpen: (open) => set({ inboxOpen: open }),

  testNotification: async () => {
    if (!hasNotesApi()) return { osOk: false as const, osError: 'Notes API unavailable' }
    const event = await window.api.notes.testNotification()
    get().pushInbox(event)
    return { osOk: event.os.ok, osError: event.os.error }
  },

  fireReminder: async (noteId) => {
    if (!hasNotesApi()) return
    const event = await window.api.notes.fireReminder(noteId)
    if (event) {
      get().pushInbox(event)
      await get().refresh()
    }
  },

  subscribeReminders: () => {
    if (!hasNotesApi()) return () => undefined
    return window.api.notes.onReminderFired((event) => {
      get().pushInbox(event)
      void get().refresh()
    })
  },

  unreadCount: () => get().inbox.filter((i) => !i.read).length,

  selectedNote: () => {
    const id = get().selectedId
    if (!id) return null
    return get().notes.find((n) => n.id === id) ?? null
  }
}))
