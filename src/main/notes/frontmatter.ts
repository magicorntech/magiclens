import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { NoteScope, ResourceNote } from '@shared/types/notes'
import type { ReminderSchedule } from '@shared/reminderSchedule'
import { normalizeReminderSchedule } from '@shared/reminderSchedule'

export interface NoteFrontmatter {
  id: string
  title: string
  tags?: string[]
  scope?: NoteScope
  pinned?: boolean
  clusterId?: string
  workspaceId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  remindAt?: string | null
  reminderFiredAt?: string | null
  reminderSchedule?: ReminderSchedule | null
  createdAt?: string
  updatedAt?: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseNoteFile(raw: string): { meta: Partial<NoteFrontmatter>; body: string } {
  const match = FRONTMATTER_RE.exec(raw)
  if (!match) return { meta: {}, body: raw }
  try {
    const parsed = parseYaml(match[1]) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const meta = parsed as Partial<NoteFrontmatter>
      return {
        meta: {
          ...meta,
          reminderSchedule: normalizeReminderSchedule(meta.reminderSchedule)
        },
        body: match[2] ?? ''
      }
    }
  } catch {
    // fall through
  }
  return { meta: {}, body: raw }
}

export function serializeNoteFile(note: ResourceNote): string {
  const schedule = normalizeReminderSchedule(note.reminderSchedule)
  const meta: NoteFrontmatter = {
    id: note.id,
    title: note.title,
    tags: note.tags.length ? note.tags : undefined,
    scope: note.scope,
    pinned: note.pinned || undefined,
    clusterId: note.clusterId,
    workspaceId: note.workspaceId,
    resourceKind: note.resourceKind,
    namespace: note.namespace,
    resourceName: note.resourceName,
    remindAt: note.remindAt ?? undefined,
    reminderFiredAt: note.reminderFiredAt ?? undefined,
    reminderSchedule: schedule ?? undefined,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  }

  const cleaned = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )

  const yaml = stringifyYaml(cleaned, { lineWidth: 0 }).trimEnd()
  const body = note.body.replace(/^\n+/, '')
  return `---\n${yaml}\n---\n\n${body}`
}

export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'untitled'
}
