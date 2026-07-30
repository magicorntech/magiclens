/** Recurring / one-shot reminder schedule for Sparks notes. */

export type ReminderWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sunday = 0

export type ReminderSchedule =
  | { kind: 'once' }
  | { kind: 'weekly'; weekdays: ReminderWeekday[]; time: string }
  | { kind: 'monthly'; daysOfMonth: number[]; time: string }
  | { kind: 'dates'; dates: string[]; time: string }

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseReminderTime(time: string): { hours: number; minutes: number } | null {
  const m = TIME_RE.exec(time.trim())
  if (!m) return null
  return { hours: Number(m[1]), minutes: Number(m[2]) }
}

export function formatReminderTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function atLocal(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(Math.max(1, day), last)
}

/** Normalize unknown YAML / IPC payload into a ReminderSchedule or null. */
export function normalizeReminderSchedule(raw: unknown): ReminderSchedule | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const kind = obj.kind
  if (kind === 'once') return { kind: 'once' }

  if (kind === 'weekly') {
    const time = typeof obj.time === 'string' ? obj.time : ''
    if (!parseReminderTime(time)) return null
    const weekdays = (Array.isArray(obj.weekdays) ? obj.weekdays : [])
      .map((d) => Number(d))
      .filter((d): d is ReminderWeekday => Number.isInteger(d) && d >= 0 && d <= 6)
    const unique = [...new Set(weekdays)].sort((a, b) => a - b) as ReminderWeekday[]
    if (!unique.length) return null
    return { kind: 'weekly', weekdays: unique, time }
  }

  if (kind === 'monthly') {
    const time = typeof obj.time === 'string' ? obj.time : ''
    if (!parseReminderTime(time)) return null
    const daysOfMonth = (Array.isArray(obj.daysOfMonth) ? obj.daysOfMonth : [])
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
    const unique = [...new Set(daysOfMonth)].sort((a, b) => a - b)
    if (!unique.length) return null
    return { kind: 'monthly', daysOfMonth: unique, time }
  }

  if (kind === 'dates') {
    const time = typeof obj.time === 'string' && parseReminderTime(obj.time) ? obj.time : '09:00'
    const dates = (Array.isArray(obj.dates) ? obj.dates : [])
      .map(String)
      .filter((d) => DATE_RE.test(d))
      .sort()
    const unique = [...new Set(dates)]
    if (!unique.length) return null
    return { kind: 'dates', dates: unique, time }
  }

  return null
}

/**
 * Next fire time after `after` (exclusive). Returns ISO string or null if none.
 * Local timezone is used for weekly/monthly/dates times.
 */
export function computeNextRemindAt(
  schedule: ReminderSchedule | null | undefined,
  after: Date = new Date(),
  onceAt?: string | null
): string | null {
  if (!schedule || schedule.kind === 'once') {
    if (!onceAt) return null
    const t = Date.parse(onceAt)
    if (!Number.isFinite(t) || t <= after.getTime()) return null
    return new Date(t).toISOString()
  }

  if (schedule.kind === 'weekly') {
    const parsed = parseReminderTime(schedule.time)
    if (!parsed) return null
    const { hours, minutes } = parsed
    let best: Date | null = null
    for (let offset = 0; offset <= 14; offset++) {
      const candidate = new Date(after)
      candidate.setDate(after.getDate() + offset)
      candidate.setHours(hours, minutes, 0, 0)
      if (candidate.getTime() <= after.getTime()) continue
      if (!schedule.weekdays.includes(candidate.getDay() as ReminderWeekday)) continue
      if (!best || candidate < best) best = candidate
    }
    return best ? best.toISOString() : null
  }

  if (schedule.kind === 'monthly') {
    const parsed = parseReminderTime(schedule.time)
    if (!parsed) return null
    const { hours, minutes } = parsed
    let best: Date | null = null
    for (let monthOffset = 0; monthOffset <= 24; monthOffset++) {
      const base = new Date(after.getFullYear(), after.getMonth() + monthOffset, 1)
      for (const day of schedule.daysOfMonth) {
        const clamped = clampDayOfMonth(base.getFullYear(), base.getMonth(), day)
        const candidate = atLocal(
          new Date(base.getFullYear(), base.getMonth(), clamped),
          hours,
          minutes
        )
        if (candidate.getTime() <= after.getTime()) continue
        if (!best || candidate < best) best = candidate
      }
      if (best && monthOffset >= 1) break
    }
    return best ? best.toISOString() : null
  }

  if (schedule.kind === 'dates') {
    const parsed = parseReminderTime(schedule.time)
    if (!parsed) return null
    const { hours, minutes } = parsed
    for (const isoDate of schedule.dates) {
      const [y, m, d] = isoDate.split('-').map(Number)
      if (!y || !m || !d) continue
      const candidate = atLocal(new Date(y, m - 1, d), hours, minutes)
      if (candidate.getTime() > after.getTime()) return candidate.toISOString()
    }
    return null
  }

  return null
}

/** True when this remindAt slot has not been delivered yet. */
export function isReminderDue(
  remindAt: string | null | undefined,
  reminderFiredAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!remindAt) return false
  const t = Date.parse(remindAt)
  if (!Number.isFinite(t) || t > now) return false
  if (!reminderFiredAt) return true
  const fired = Date.parse(reminderFiredAt)
  if (!Number.isFinite(fired)) return true
  return fired < t
}

export function isReminderUpcoming(
  remindAt: string | null | undefined,
  reminderFiredAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!remindAt) return false
  const t = Date.parse(remindAt)
  if (!Number.isFinite(t) || t <= now) return false
  if (!reminderFiredAt) return true
  const fired = Date.parse(reminderFiredAt)
  if (!Number.isFinite(fired)) return true
  return fired < t
}
