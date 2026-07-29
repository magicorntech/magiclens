import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  CreateNoteRequest,
  ListNotesRequest,
  NoteIdRequest,
  NotesReminderEvent,
  NotesTestNotificationResult,
  ResourceNote,
  UpdateNoteRequest
} from '@shared/types/notes'
import {
  createNote,
  getNote,
  listNotes,
  removeNote,
  updateNote
} from '../persistence/notesStore'
import {
  deliverNoteReminder,
  kickNotesReminderCheck,
  testNotesNotification
} from '../notes/reminderScheduler'

export function registerNotesHandlers(): void {
  ipcMain.handle(IPC.NOTES_LIST, async (_e, req?: ListNotesRequest): Promise<ResourceNote[]> =>
    listNotes(req)
  )

  ipcMain.handle(IPC.NOTES_GET, async (_e, req: NoteIdRequest): Promise<ResourceNote | null> =>
    getNote(req.id) ?? null
  )

  ipcMain.handle(IPC.NOTES_CREATE, async (_e, req: CreateNoteRequest): Promise<ResourceNote> => {
    const note = createNote(req)
    kickNotesReminderCheck()
    return note
  })

  ipcMain.handle(IPC.NOTES_UPDATE, async (_e, req: UpdateNoteRequest): Promise<ResourceNote | null> => {
    const note = updateNote(req.id, req.patch)
    kickNotesReminderCheck()
    return note ?? null
  })

  ipcMain.handle(IPC.NOTES_REMOVE, async (_e, req: NoteIdRequest): Promise<{ ok: boolean }> => ({
    ok: removeNote(req.id)
  }))

  ipcMain.handle(IPC.NOTES_TEST_NOTIFICATION, async (): Promise<NotesTestNotificationResult> =>
    testNotesNotification()
  )

  ipcMain.handle(IPC.NOTES_FIRE_REMINDER, async (_e, req: NoteIdRequest): Promise<NotesReminderEvent | null> => {
    const note = getNote(req.id)
    if (!note) return null
    return deliverNoteReminder(note, { markFired: true })
  })
}
