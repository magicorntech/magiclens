/** Where a note is attached. */
export type NoteScope = 'global' | 'workspace' | 'cluster' | 'resource'

export interface ResourceNote {
  id: string
  title: string
  body: string
  scope: NoteScope
  createdAt: string
  updatedAt: string
  /** Cluster this note is about (required for cluster/resource scope). */
  clusterId?: string
  /** Workspace (cluster group) id for workspace-scoped notes. */
  workspaceId?: string
  /** Resource kind label, e.g. Pods / Deployments. */
  resourceKind?: string
  namespace?: string
  resourceName?: string
  /** ISO datetime when reminder should fire. */
  remindAt?: string | null
  /** Set once the OS notification was delivered. */
  reminderFiredAt?: string | null
  pinned?: boolean
}

export interface CreateNoteRequest {
  title: string
  body?: string
  scope?: NoteScope
  clusterId?: string
  workspaceId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  remindAt?: string | null
  pinned?: boolean
}

export type NotePatch = Partial<
  Pick<
    ResourceNote,
    | 'title'
    | 'body'
    | 'scope'
    | 'clusterId'
    | 'workspaceId'
    | 'resourceKind'
    | 'namespace'
    | 'resourceName'
    | 'remindAt'
    | 'reminderFiredAt'
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
