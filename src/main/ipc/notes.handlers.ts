import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  ChooseVaultResult,
  CreateFolderRequest,
  CreateNoteRequest,
  DeleteFolderRequest,
  DeleteFolderResult,
  FolderIconImportResult,
  ListNotesRequest,
  NoteIdRequest,
  NotesReminderEvent,
  NotesTestNotificationResult,
  RenameFolderRequest,
  ResourceNote,
  SetFolderIconRequest,
  UpdateNoteRequest,
  VaultFolderNode,
  VaultStatus
} from '@shared/types/notes'
import type { SparksCanvasDoc, SparksMediaImportResult, SparksSketchDoc } from '@shared/types/sparks'
import {
  deliverNoteReminder,
  kickNotesReminderCheck,
  testNotesNotification
} from '../notes/reminderScheduler'
import {
  buildFolderTree,
  createFolder,
  createNote,
  deleteFolder,
  getNote,
  getVaultPath,
  getVaultStatus,
  importFolderIcon,
  listNotes,
  listTags,
  moveVaultRoot,
  removeNote,
  renameFolder,
  saveFolderIconDataUrl,
  setFolderIcon,
  updateNote,
  vaultPathWritable
} from '../notes/vaultStore'
import { loadCanvas, saveCanvas } from '../notes/canvasStore'
import { importNoteMedia, loadSketch, saveSketch } from '../notes/sketchStore'

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

  ipcMain.handle(IPC.NOTES_VAULT_STATUS, async (): Promise<VaultStatus> => getVaultStatus())

  ipcMain.handle(IPC.NOTES_FOLDER_TREE, async (): Promise<VaultFolderNode[]> => buildFolderTree())

  ipcMain.handle(IPC.NOTES_TAGS, async (): Promise<{ tag: string; count: number }[]> => listTags())

  ipcMain.handle(
    IPC.NOTES_CREATE_FOLDER,
    async (_e, req: CreateFolderRequest): Promise<{ ok: boolean; path: string }> =>
      createFolder(req.folder, { icon: req.icon, image: req.image })
  )

  ipcMain.handle(
    IPC.NOTES_RENAME_FOLDER,
    async (
      _e,
      req: RenameFolderRequest
    ): Promise<{ ok: boolean; path: string; error?: string }> => renameFolder(req.from, req.to)
  )

  ipcMain.handle(
    IPC.NOTES_DELETE_FOLDER,
    async (_e, req: DeleteFolderRequest): Promise<DeleteFolderResult> =>
      deleteFolder(req.folder, { withNotes: req.withNotes })
  )

  ipcMain.handle(
    IPC.NOTES_SET_FOLDER_ICON,
    async (_e, req: SetFolderIconRequest): Promise<{ ok: boolean; path: string }> =>
      setFolderIcon(req.folder, { icon: req.icon, image: req.image })
  )

  ipcMain.handle(
    IPC.NOTES_FOLDER_ICON_IMPORT,
    async (e): Promise<FolderIconImportResult> => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const opts = {
        title: 'Choose folder photo',
        properties: ['openFile'] as Array<'openFile'>,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }]
      }
      const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
      if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true }
      return importFolderIcon(result.filePaths[0])
    }
  )

  ipcMain.handle(
    IPC.NOTES_FOLDER_ICON_FROM_DATA_URL,
    async (_e, req: { dataUrl: string }): Promise<FolderIconImportResult> =>
      saveFolderIconDataUrl(req.dataUrl)
  )

  ipcMain.handle(IPC.NOTES_VAULT_REVEAL, async (): Promise<{ ok: boolean }> => {
    const path = getVaultPath()
    const err = await shell.openPath(path)
    return { ok: !err }
  })

  ipcMain.handle(IPC.NOTES_VAULT_CHOOSE, async (e): Promise<ChooseVaultResult> => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: 'Choose Sparks vault folder',
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>,
      defaultPath: getVaultPath()
    }
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts)
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, canceled: true }
    }
    const next = result.filePaths[0]
    if (!vaultPathWritable(next)) {
      return { ok: false, error: 'Selected folder is not writable' }
    }
    moveVaultRoot(next)
    return { ok: true, vaultPath: getVaultPath() }
  })

  ipcMain.handle(IPC.NOTES_CANVAS_GET, async (): Promise<SparksCanvasDoc> => loadCanvas())

  ipcMain.handle(IPC.NOTES_CANVAS_SAVE, async (_e, doc: SparksCanvasDoc): Promise<SparksCanvasDoc> =>
    saveCanvas(doc)
  )

  ipcMain.handle(IPC.NOTES_SKETCH_GET, async (_e, req: { noteId: string }): Promise<SparksSketchDoc> =>
    loadSketch(req.noteId)
  )

  ipcMain.handle(IPC.NOTES_SKETCH_SAVE, async (_e, doc: SparksSketchDoc): Promise<SparksSketchDoc> =>
    saveSketch(doc)
  )

  ipcMain.handle(
    IPC.NOTES_MEDIA_IMPORT,
    async (
      e,
      req: { noteId: string; kind?: 'image' | 'video' | 'file' | 'any' }
    ): Promise<SparksMediaImportResult> => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const kind = req.kind ?? 'any'
      const filters =
        kind === 'image'
          ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }]
          : kind === 'video'
            ? [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'm4v', 'ogg'] }]
            : [
                { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'zip'] },
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
                { name: 'Videos', extensions: ['mp4', 'webm', 'mov'] }
              ]
      const opts = {
        title: 'Add to note',
        properties: ['openFile'] as Array<'openFile'>,
        filters
      }
      const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
      if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true }
      return importNoteMedia(req.noteId, result.filePaths[0])
    }
  )
}
