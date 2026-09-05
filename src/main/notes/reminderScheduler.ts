import { BrowserWindow, Notification } from 'electron'
import { randomUUID } from 'crypto'
import { join } from 'node:path'
import { IPC } from '@shared/ipc-contract'
import type { NotesReminderEvent, ResourceNote } from '@shared/types/notes'
import { computeNextRemindAt, normalizeReminderSchedule } from '@shared/reminderSchedule'
import {
  listDueReminders,
  nextUpcomingRemindAt,
  updateNoteAnywhere
} from '../persistence/notesStore'

const POLL_MS = 5_000
/** Max setTimeout delay (ms) — keep wakes reasonably frequent while app is open. */
const WAKE_CAP_MS = 60_000
let pollTimer: ReturnType<typeof setInterval> | null = null
let wakeTimer: ReturnType<typeof setTimeout> | null = null
let started = false
let ticking = false

export interface OsNotificationResult {
  ok: boolean
  error?: string
}

function safeSend(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      if (win.isDestroyed()) continue
      const wc = win.webContents
      if (!wc || wc.isDestroyed()) continue
      wc.send(channel, payload)
    } catch {
      // Window may disappear mid-reload (HMR / dispose)
    }
  }
}

function broadcastReminder(event: NotesReminderEvent): void {
  safeSend(IPC.NOTES_REMINDER_FIRED, event)
}

function notificationIcon(): string | undefined {
  try {
    return join(__dirname, '../../resources/icon.png')
  } catch {
    return undefined
  }
}

/**
 * Show a native OS notification.
 * On modern Electron + macOS, Electron.app must be code-signed (ad-hoc is enough for local dev).
 * Failures are silent unless we listen for the `failed` event.
 */
export function showOsNotification(title: string, body: string): Promise<OsNotificationResult> {
  return new Promise((resolve) => {
    if (!Notification.isSupported()) {
      resolve({ ok: false, error: 'Notifications are not supported on this platform' })
      return
    }

    let settled = false
    const finish = (result: OsNotificationResult): void => {
      if (settled) return
      settled = true
      resolve(result)
    }

    try {
      const icon = notificationIcon()
      const notification = new Notification({
        title: title || 'MagicLens',
        body: body || 'Reminder',
        silent: false,
        ...(icon ? { icon } : {})
      })

      notification.on('show', () => finish({ ok: true }))
      notification.on('failed', (_event, error) => {
        const message = String(error || 'Notification failed')
        console.warn('[notes] OS notification failed:', message)
        finish({
          ok: false,
          error:
            process.platform === 'darwin'
              ? `${message}. On macOS, run: npm run sign:electron-dev  then restart the app.`
              : message
        })
      })

      notification.show()

      // If macOS refuses the notification it emits `failed` quickly.
      // No failure after a short wait → treat as delivered.
      setTimeout(() => finish({ ok: true }), 1200)
    } catch (err) {
      finish({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })
}

function notificationBodyForNote(note: ResourceNote): string {
  const parts: string[] = []
  if (note.resourceKind && note.resourceName) {
    parts.push(`${note.resourceKind}/${note.resourceName}`)
  } else if (note.clusterId) {
    parts.push('Cluster note')
  }
  const body = note.body.trim().slice(0, 160)
  if (body) parts.push(body)
  return parts.join('\n') || 'Reminder'
}

export async function deliverNoteReminder(
  note: ResourceNote,
  opts?: { markFired?: boolean }
): Promise<NotesReminderEvent> {
  const markFired = opts?.markFired !== false
  let delivered = note
  if (markFired) {
    const firedAt = new Date().toISOString()
    const schedule = normalizeReminderSchedule(note.reminderSchedule)
    const recurring = schedule && schedule.kind !== 'once'
    const nextRemindAt = recurring
      ? computeNextRemindAt(schedule, new Date(Date.parse(firedAt) + 1000))
      : note.remindAt ?? null

    delivered =
      updateNoteAnywhere(note.id, {
        reminderFiredAt: firedAt,
        // Advance recurring alarms; one-shot keeps remindAt and stays suppressed via firedAt >= remindAt
        ...(recurring ? { remindAt: nextRemindAt } : {})
      }) ?? note
  }

  const os = await showOsNotification(
    delivered.title || 'MagicLens reminder',
    notificationBodyForNote(delivered)
  )
  if (!os.ok) {
    console.warn('[notes] reminder OS notify failed for', delivered.id, os.error)
  } else {
    console.info('[notes] reminder delivered', delivered.id, delivered.title)
  }

  const event: NotesReminderEvent = {
    note: delivered,
    firedAt: new Date().toISOString(),
    eventId: randomUUID()
  }
  broadcastReminder(event)
  return event
}

function armNextWake(): void {
  if (wakeTimer) {
    clearTimeout(wakeTimer)
    wakeTimer = null
  }
  const nextAt = nextUpcomingRemindAt()
  if (nextAt == null) return
  const delay = Math.min(Math.max(nextAt - Date.now() + 50, 250), WAKE_CAP_MS)
  wakeTimer = setTimeout(() => {
    void tick().finally(() => armNextWake())
  }, delay)
}

async function tick(): Promise<void> {
  if (ticking) return
  ticking = true
  try {
    const due = listDueReminders()
    for (const note of due) {
      try {
        await deliverNoteReminder(note, { markFired: true })
      } catch (err) {
        console.warn('[notes] deliver failed', note.id, err)
      }
    }
  } finally {
    ticking = false
  }
}

export function startNotesReminderScheduler(): void {
  if (started) return
  started = true
  void tick().finally(() => armNextWake())
  pollTimer = setInterval(() => {
    void tick().finally(() => armNextWake())
  }, POLL_MS)
}

export function stopNotesReminderScheduler(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  if (wakeTimer) clearTimeout(wakeTimer)
  wakeTimer = null
  started = false
}

export function kickNotesReminderCheck(): void {
  void tick().finally(() => armNextWake())
}

export type TestNotificationResult = NotesReminderEvent & { os: OsNotificationResult }

/** Immediate OS + in-app test notification (does not require a saved note). */
export async function testNotesNotification(): Promise<TestNotificationResult> {
  const now = new Date().toISOString()
  const note: ResourceNote = {
    id: `test-${randomUUID()}`,
    title: 'MagicLens notification test',
    body: 'If you see this, OS and in-app notifications are working.',
    scope: 'global',
    path: 'Inbox/notification-test.md',
    folder: 'Inbox',
    tags: [],
    createdAt: now,
    updatedAt: now,
    remindAt: now,
    reminderFiredAt: now,
    pinned: false
  }
  const os = await showOsNotification(note.title, note.body)
  const event: NotesReminderEvent = { note, firedAt: now, eventId: randomUUID() }
  broadcastReminder(event)
  return { ...event, os }
}
