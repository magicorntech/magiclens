import { create } from 'zustand'
import type {
  CreateNoteRequest,
  ListNotesRequest,
  NotePatch,
  NotesInboxItem,
  NotesReminderEvent,
  ResourceNote
} from '@shared/types/notes'

const INBOX_LIMIT = 50

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
  hydrated: boolean
  editorOpen: boolean
  editingNote: ResourceNote | null
  draftDefaults: CreateNoteRequest | null
  lastReminder: ResourceNote | null
  inbox: NotesInboxItem[]
  inboxOpen: boolean
  hydrate: (filter?: ListNotesRequest) => Promise<void>
  refresh: (filter?: ListNotesRequest) => Promise<void>
  createNote: (req: CreateNoteRequest) => Promise<ResourceNote>
  updateNote: (id: string, patch: NotePatch) => Promise<ResourceNote | null>
  removeNote: (id: string) => Promise<boolean>
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
}

export const useNotesStore = create<NotesStoreState>()((set, get) => ({
  notes: [],
  hydrated: false,
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
      const notes = await window.api.notes.list(filter)
      set({ notes, hydrated: true })
    } catch (err) {
      console.error('[notes] hydrate failed', err)
      set({ notes: [], hydrated: true })
    }
  },

  refresh: async (filter) => {
    if (!hasNotesApi()) return
    try {
      const notes = await window.api.notes.list(filter)
      set({ notes })
    } catch (err) {
      console.error('[notes] refresh failed', err)
    }
  },

  createNote: async (req) => {
    const note = await window.api.notes.create(req)
    set({ notes: await window.api.notes.list() })
    return note
  },

  updateNote: async (id, patch) => {
    const note = await window.api.notes.update(id, patch)
    set({ notes: await window.api.notes.list() })
    return note
  },

  removeNote: async (id) => {
    const res = await window.api.notes.remove(id)
    if (res.ok) set({ notes: await window.api.notes.list() })
    return res.ok
  },

  openCreate: (defaults) => {
    set({ editorOpen: true, editingNote: null, draftDefaults: defaults ?? null })
  },

  openEdit: (note) => {
    set({ editorOpen: true, editingNote: note, draftDefaults: null })
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

  unreadCount: () => get().inbox.filter((i) => !i.read).length
}))
