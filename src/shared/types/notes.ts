/** Where a note is attached. */
export type NoteScope = 'global' | 'workspace' | 'cluster' | 'resource'

export type NoteEditorMode = 'edit' | 'live' | 'preview'

export type {
  ReminderSchedule,
  ReminderWeekday
} from '../reminderSchedule'

import type { ReminderSchedule } from '../reminderSchedule'

export interface ResourceNote {
  id: string
  title: string
  body: string
  scope: NoteScope
  createdAt: string
  updatedAt: string
  /** Relative path inside the vault, e.g. Inbox/welcome.md */
  path: string
  /** Parent folder relative to vault root ('' for root). */
  folder: string
  tags: string[]
  /** Cluster this note is about (required for cluster/resource scope). */
  clusterId?: string
  /** Workspace (cluster group) id for workspace-scoped notes. */
  workspaceId?: string
  /** Resource kind label, e.g. Pods / Deployments. */
  resourceKind?: string
  namespace?: string
  resourceName?: string
  /** ISO datetime of the next reminder fire. */
  remindAt?: string | null
  /** Set when the OS notification was delivered for the current/previous slot. */
  reminderFiredAt?: string | null
  /** Recurrence rule; `remindAt` is always the next concrete fire. */
  reminderSchedule?: ReminderSchedule | null
  pinned?: boolean
}

export interface CreateNoteRequest {
  title: string
  body?: string
  scope?: NoteScope
  folder?: string
  tags?: string[]
  clusterId?: string
  workspaceId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  remindAt?: string | null
  reminderSchedule?: ReminderSchedule | null
  pinned?: boolean
}

export type NotePatch = Partial<
  Pick<
    ResourceNote,
    | 'title'
    | 'body'
    | 'scope'
    | 'folder'
    | 'tags'
    | 'clusterId'
    | 'workspaceId'
    | 'resourceKind'
    | 'namespace'
    | 'resourceName'
    | 'remindAt'
    | 'reminderFiredAt'
    | 'reminderSchedule'
    | 'pinned'
  >
>

export interface UpdateNoteRequest {
  id: string
  patch: NotePatch
}

export interface ListNotesRequest {
  clusterId?: string
  workspaceId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  folder?: string
  tag?: string
  /** When true, only notes attached to that exact resource. */
  forResource?: boolean
  q?: string
}

export interface NoteIdRequest {
  id: string
}

export interface NotesReminderEvent {
  note: ResourceNote
  firedAt: string
  eventId: string
}

export interface NotesTestNotificationResult extends NotesReminderEvent {
  os: { ok: boolean; error?: string }
}

export interface NotesInboxItem {
  id: string
  noteId: string
  title: string
  body: string
  firedAt: string
  read: boolean
  clusterId?: string
  resourceKind?: string
  resourceName?: string
  namespace?: string
}

export interface VaultFolderNode {
  name: string
  path: string
  children: VaultFolderNode[]
  noteCount: number
  /** Optional Lucide icon id (fallback when no photo). */
  icon?: string
  /** Vault-relative photo path, e.g. `.sparks/folder-icons/work.png`. */
  image?: string
}

export interface VaultStatus {
  vaultPath: string
  exists: boolean
  noteCount: number
  folderCount: number
  migratedFromJson: boolean
  privacy: {
    localOnly: true
    tracking: false
  }
}

export interface CreateFolderRequest {
  folder: string
  /** Lucide id (legacy) or ignored when `image` is set. */
  icon?: string
  /** Vault-relative folder photo path. */
  image?: string
}

export interface RenameFolderRequest {
  from: string
  to: string
}

export interface DeleteFolderRequest {
  folder: string
  /** When true, delete all notes in this folder and subfolders, then the folder. */
  withNotes?: boolean
}

export interface DeleteFolderResult {
  ok: boolean
  path?: string
  error?: 'invalid' | 'missing' | 'not_empty' | 'delete_failed'
  noteCount?: number
  deletedNotes?: number
}

export interface SetFolderIconRequest {
  folder: string
  /** Lucide id, or null to clear lucide icon. */
  icon?: string | null
  /** Vault-relative photo path, or null to clear photo. */
  image?: string | null
}

export interface FolderIconImportResult {
  ok: boolean
  path?: string
  src?: string
  canceled?: boolean
  error?: string
}

export interface ChooseVaultResult {
  ok: boolean
  vaultPath?: string
  canceled?: boolean
  error?: string
}
