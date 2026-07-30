import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, DatePicker, Modal, Segmented, Select, Space, TimePicker, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Bell, BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import type { ReminderSchedule, ReminderWeekday } from '@shared/reminderSchedule'
import {
  computeNextRemindAt,
  formatReminderTime,
  normalizeReminderSchedule,
  parseReminderTime
} from '@shared/reminderSchedule'
import { Icon } from '../ui/Icon'

type Kind = 'once' | 'weekly' | 'monthly' | 'dates'

interface SparksReminderModalProps {
  open: boolean
  note: ResourceNote | null
  onClose: () => void
  onSave: (patch: {
    remindAt: string | null
    reminderSchedule: ReminderSchedule | null
    reminderFiredAt: null
  }) => Promise<void>
}

const WEEKDAYS: ReminderWeekday[] = [1, 2, 3, 4, 5, 6, 0] // Mon→Sun display order

function defaultTime(): Dayjs {
  return dayjs().hour(9).minute(0).second(0)
}

export function SparksReminderModal({
  open,
  note,
  onClose,
  onSave
}: SparksReminderModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [kind, setKind] = useState<Kind>('once')
  const [onceAt, setOnceAt] = useState<Dayjs | null>(dayjs().add(1, 'hour'))
  const [time, setTime] = useState<Dayjs>(defaultTime())
  const [weekdays, setWeekdays] = useState<ReminderWeekday[]>([1, 2, 3, 4, 5])
  const [monthDays, setMonthDays] = useState<number[]>([1])
  const [dates, setDates] = useState<Dayjs[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !note) return
    const schedule = normalizeReminderSchedule(note.reminderSchedule)
    if (!schedule || schedule.kind === 'once') {
      setKind('once')
      setOnceAt(note.remindAt ? dayjs(note.remindAt) : dayjs().add(1, 'hour'))
      return
    }
    if (schedule.kind === 'weekly') {
      setKind('weekly')
      setWeekdays(schedule.weekdays)
      const parsed = parseReminderTime(schedule.time)
      setTime(parsed ? dayjs().hour(parsed.hours).minute(parsed.minutes) : defaultTime())
      return
    }
    if (schedule.kind === 'monthly') {
      setKind('monthly')
      setMonthDays(schedule.daysOfMonth)
      const parsed = parseReminderTime(schedule.time)
      setTime(parsed ? dayjs().hour(parsed.hours).minute(parsed.minutes) : defaultTime())
      return
    }
    setKind('dates')
    setDates(schedule.dates.map((d) => dayjs(d)))
    const parsed = parseReminderTime(schedule.time)
    setTime(parsed ? dayjs().hour(parsed.hours).minute(parsed.minutes) : defaultTime())
  }, [open, note])

  const previewSchedule = useMemo((): ReminderSchedule | null => {
    const hhmm = formatReminderTime(time.hour(), time.minute())
    if (kind === 'once') return { kind: 'once' }
    if (kind === 'weekly') {
      if (!weekdays.length) return null
      return { kind: 'weekly', weekdays: [...weekdays].sort((a, b) => a - b), time: hhmm }
    }
    if (kind === 'monthly') {
      if (!monthDays.length) return null
      return {
        kind: 'monthly',
        daysOfMonth: [...monthDays].sort((a, b) => a - b),
        time: hhmm
      }
    }
    if (!dates.length) return null
    return {
      kind: 'dates',
      dates: dates.map((d) => d.format('YYYY-MM-DD')).sort(),
      time: hhmm
    }
  }, [kind, time, weekdays, monthDays, dates])

  const nextAt = useMemo(() => {
    if (kind === 'once') {
      if (!onceAt?.isValid()) return null
      return computeNextRemindAt({ kind: 'once' }, new Date(), onceAt.toISOString())
    }
    return computeNextRemindAt(previewSchedule, new Date())
  }, [kind, onceAt, previewSchedule])

  async function handleSave(): Promise<void> {
    if (!note) return
    if (kind === 'once') {
      if (!onceAt?.isValid()) {
        message.error(t('notes.reminder.needOnce'))
        return
      }
      if (onceAt.valueOf() <= Date.now() + 15_000) {
        message.error(t('notes.fields.remindAtFuture'))
        return
      }
    } else if (!previewSchedule || !nextAt) {
      message.error(t('notes.reminder.needSchedule'))
      return
    }

    setSaving(true)
    try {
      await onSave({
        remindAt: kind === 'once' ? onceAt!.toISOString() : nextAt,
        reminderSchedule: kind === 'once' ? { kind: 'once' } : previewSchedule,
        reminderFiredAt: null
      })
      message.success(
        t('notes.reminder.saved', {
          time: dayjs(kind === 'once' ? onceAt!.toISOString() : nextAt).format('MMM D, HH:mm')
        })
      )
      onClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('notes.reminder.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleClear(): Promise<void> {
    if (!note) return
    setSaving(true)
    try {
      await onSave({ remindAt: null, reminderSchedule: null, reminderFiredAt: null })
      message.success(t('notes.reminder.cleared'))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const hasExisting = Boolean(note?.remindAt || note?.reminderSchedule)

  return (
    <Modal
      title={
        <span className="ml-sparks-reminder-title">
          <Icon icon={Bell} variant="action" />
          {t('notes.reminder.title')}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            danger
            disabled={!hasExisting}
            icon={<Icon icon={BellOff} variant="action" />}
            onClick={() => void handleClear()}
            loading={saving}
          >
            {t('notes.reminder.clear')}
          </Button>
          <Space>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="primary" loading={saving} onClick={() => void handleSave()}>
              {t('notes.reminder.save')}
            </Button>
          </Space>
        </Space>
      }
      destroyOnClose
      width={520}
    >
      <p className="ml-sparks-reminder-hint">{t('notes.reminder.hint')}</p>

      <Segmented
        block
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        options={[
          { value: 'once', label: t('notes.reminder.kinds.once') },
          { value: 'weekly', label: t('notes.reminder.kinds.weekly') },
          { value: 'monthly', label: t('notes.reminder.kinds.monthly') },
          { value: 'dates', label: t('notes.reminder.kinds.dates') }
        ]}
        style={{ marginBottom: 16 }}
      />

      {kind === 'once' ? (
        <DatePicker
          showTime
          style={{ width: '100%' }}
          value={onceAt}
          onChange={setOnceAt}
          disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
          placeholder={t('notes.fields.remindAtPlaceholder')}
        />
      ) : null}

      {kind === 'weekly' ? (
        <div className="ml-sparks-reminder-block">
          <div className="ml-sparks-reminder-label">{t('notes.reminder.weekdays')}</div>
          <Checkbox.Group
            value={weekdays}
            onChange={(vals) => setWeekdays(vals as ReminderWeekday[])}
            options={WEEKDAYS.map((d) => ({
              value: d,
              label: t(`notes.reminder.day.${d}`)
            }))}
          />
          <div className="ml-sparks-reminder-label" style={{ marginTop: 12 }}>
            {t('notes.reminder.time')}
          </div>
          <TimePicker
            format="HH:mm"
            value={time}
            onChange={(v) => setTime(v ?? defaultTime())}
            style={{ width: '100%' }}
          />
        </div>
      ) : null}

      {kind === 'monthly' ? (
        <div className="ml-sparks-reminder-block">
          <div className="ml-sparks-reminder-label">{t('notes.reminder.monthDays')}</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={monthDays}
            onChange={setMonthDays}
            options={Array.from({ length: 31 }, (_, i) => ({
              value: i + 1,
              label: String(i + 1)
            }))}
            placeholder={t('notes.reminder.monthDaysPlaceholder')}
          />
          <div className="ml-sparks-reminder-label" style={{ marginTop: 12 }}>
            {t('notes.reminder.time')}
          </div>
          <TimePicker
            format="HH:mm"
            value={time}
            onChange={(v) => setTime(v ?? defaultTime())}
            style={{ width: '100%' }}
          />
        </div>
      ) : null}

      {kind === 'dates' ? (
        <div className="ml-sparks-reminder-block">
          <div className="ml-sparks-reminder-label">{t('notes.reminder.customDates')}</div>
          <DatePicker
            style={{ width: '100%' }}
            onChange={(d) => {
              if (!d) return
              setDates((prev) => {
                if (prev.some((x) => x.isSame(d, 'day'))) return prev
                return [...prev, d].sort((a, b) => a.valueOf() - b.valueOf())
              })
            }}
            disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
            placeholder={t('notes.reminder.customDatesPlaceholder')}
          />
          {dates.length > 0 ? (
            <div className="ml-sparks-reminder-dates">
              {dates.map((d) => (
                <button
                  key={d.format('YYYY-MM-DD')}
                  type="button"
                  className="ml-sparks-reminder-date-chip"
                  onClick={() => setDates((prev) => prev.filter((x) => !x.isSame(d, 'day')))}
                >
                  {d.format('MMM D, YYYY')} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="ml-sparks-reminder-label" style={{ marginTop: 12 }}>
            {t('notes.reminder.time')}
          </div>
          <TimePicker
            format="HH:mm"
            value={time}
            onChange={(v) => setTime(v ?? defaultTime())}
            style={{ width: '100%' }}
          />
        </div>
      ) : null}

      {nextAt ? (
        <p className="ml-sparks-reminder-next">
          {t('notes.reminder.next', { time: dayjs(nextAt).format('ddd, MMM D · HH:mm') })}
        </p>
      ) : (
        <p className="ml-sparks-reminder-next is-muted">{t('notes.reminder.nextNone')}</p>
      )}
    </Modal>
  )
}
