import { useMemo, useState } from 'react'
import { Input, Modal, message } from 'antd'
import dayjs from 'dayjs'
import { Bell, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RESOURCE_KINDS, type ResourceKind } from '@shared/resourceKinds'
import type { ResourceNote } from '@shared/types/notes'
import { Icon } from '../ui/Icon'
import { useClusterStore } from '../../stores/clusterStore'

const UPCOMING_LIMIT = 3
const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function noteHasResourceAlarm(note: ResourceNote): boolean {
  if (!note.clusterId || !note.resourceKind || !note.resourceName) return false
  return Boolean(note.remindAt || note.reminderSchedule)
}

function asResourceKind(kind: string): ResourceKind | null {
  return (RESOURCE_KINDS as readonly string[]).includes(kind) ? (kind as ResourceKind) : null
}

type AlarmRow = {
  note: ResourceNote
  clusterName: string
  at: number | null
}

function formatWhen(at: number | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (at == null || !Number.isFinite(at)) return t('notes.alarms.scheduled')
  const d = dayjs(at)
  const now = dayjs()
  if (d.isBefore(now)) return t('notes.alarms.overdue')
  if (d.diff(now, 'hour') < 24) return d.format('HH:mm')
  if (d.diff(now, 'day') < 7) return d.format('ddd · HH:mm')
  return d.format('MMM D · HH:mm')
}

interface SparksAlarmsSectionProps {
  notes: ResourceNote[]
}

export function SparksAlarmsSection({ notes }: SparksAlarmsSectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const [allOpen, setAllOpen] = useState(false)
  const [alarmSearch, setAlarmSearch] = useState('')

  const allAlarms = useMemo(() => {
    const list: AlarmRow[] = notes.filter(noteHasResourceAlarm).map((note) => {
      const cluster = clusters.find((c) => c.id === note.clusterId)
      const clusterName = cluster?.customName?.trim() || cluster?.contextName || note.clusterId || ''
      const at = note.remindAt ? Date.parse(note.remindAt) : null
      return {
        note,
        clusterName,
        at: at != null && Number.isFinite(at) ? at : null
      }
    })
    list.sort((a, b) => {
      const ta = a.at ?? Number.POSITIVE_INFINITY
      const tb = b.at ?? Number.POSITIVE_INFINITY
      if (ta !== tb) return ta - tb
      return (a.note.resourceName ?? '').localeCompare(b.note.resourceName ?? '')
    })
    return list
  }, [notes, clusters])

  const upcoming = useMemo(() => {
    const now = Date.now()
    const horizon = now + UPCOMING_WINDOW_MS
    return allAlarms
      .filter((row) => {
        if (row.at == null) return false
        // include slightly overdue + next 7 days
        return row.at <= horizon
      })
      .slice(0, UPCOMING_LIMIT)
  }, [allAlarms])

  const filteredAll = useMemo(() => {
    const q = alarmSearch.trim().toLowerCase()
    if (!q) return allAlarms
    return allAlarms.filter(({ note, clusterName }) => {
      const hay = [note.resourceName, note.resourceKind, note.namespace, note.title, clusterName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [allAlarms, alarmSearch])

  function openAlarmedResource(note: ResourceNote): void {
    const clusterId = note.clusterId
    const kind = note.resourceKind ? asResourceKind(note.resourceKind) : null
    const name = note.resourceName
    if (!clusterId || !kind || !name || !clusters.some((c) => c.id === clusterId)) {
      message.warning(t('notes.alarms.openFailed'))
      return
    }
    navigateToResource(clusterId, {
      kind,
      namespace: note.namespace ?? '',
      name
    })
    setAllOpen(false)
  }

  function renderRow(row: AlarmRow, compact: boolean): React.JSX.Element {
    const { note, clusterName, at } = row
    const ns = note.namespace?.trim()
    const meta = [note.resourceKind, ns || null, clusterName].filter(Boolean).join(' · ')
    const when = formatWhen(at, t)
    const overdue = at != null && at < Date.now()
    return (
      <button
        key={note.id}
        type="button"
        className={`ml-vault-alarm-row${overdue ? ' is-overdue' : ''}${compact ? ' is-compact' : ''}`}
        title={meta}
        onClick={() => openAlarmedResource(note)}
      >
        <Icon icon={Bell} variant="micro" className="ml-vault-alarm-row__bell" />
        <span className="ml-vault-alarm-row__text">
          <span className="ml-vault-alarm-row__name">{note.resourceName}</span>
          <span className="ml-vault-alarm-row__meta">{meta}</span>
        </span>
        <span className="ml-vault-alarm-row__when">{when}</span>
      </button>
    )
  }

  return (
    <>
      <div className="ml-vault__section ml-vault__section--alarms">
        <div className="ml-vault__section-head">
          <span>{t('notes.alarms.upcoming')}</span>
          {allAlarms.length > 0 ? (
            <button
              type="button"
              className="ml-vault-alarms__all-btn"
              onClick={() => setAllOpen(true)}
            >
              {t('notes.alarms.viewAll', { count: allAlarms.length })}
            </button>
          ) : null}
        </div>
        <div className="ml-vault-alarms ml-vault-alarms--upcoming">
          {upcoming.length === 0 ? (
            <p className="ml-vault-alarms__empty">
              {allAlarms.length > 0 ? t('notes.alarms.noUpcoming') : t('notes.alarms.empty')}
            </p>
          ) : (
            upcoming.map((row) => renderRow(row, true))
          )}
        </div>
      </div>

      <Modal
        title={t('notes.alarms.allTitle', { count: allAlarms.length })}
        open={allOpen}
        onCancel={() => {
          setAllOpen(false)
          setAlarmSearch('')
        }}
        footer={null}
        width={480}
        destroyOnHidden
        className="ml-vault-alarms-modal"
      >
        <Input
          allowClear
          className="ml-vault-alarms-modal__search"
          prefix={<Icon icon={Search} variant="micro" />}
          placeholder={t('notes.alarms.searchPlaceholder')}
          value={alarmSearch}
          onChange={(e) => setAlarmSearch(e.target.value)}
        />
        <div className="ml-vault-alarms-modal__list">
          {filteredAll.length === 0 ? (
            <p className="ml-vault-alarms__empty">
              {alarmSearch.trim() ? t('notes.alarms.emptyFiltered') : t('notes.alarms.empty')}
            </p>
          ) : (
            filteredAll.map((row) => renderRow(row, false))
          )}
        </div>
      </Modal>
    </>
  )
}
