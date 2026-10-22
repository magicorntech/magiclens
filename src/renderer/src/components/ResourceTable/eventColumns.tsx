import { Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useTranslation } from 'react-i18next'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import { useSharedClockTick } from '@renderer/hooks/useSharedClockTick'
import { compareAgeTimestamps, compareNumericStrings, compareText } from '../../utils/tableSort'

dayjs.extend(relativeTime)

function clock(value: string | null): string {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD.MM.YYYY HH:mm:ss') : '—'
}

function ago(value: string | null): string {
  if (!value) return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.fromNow() : ''
}

function EventWhen({ event }: { event: ResourceEventItem }): React.JSX.Element {
  useSharedClockTick()
  const stamp = event.firstTimestamp ?? event.lastTimestamp
  return (
    <span className="ml-event-when" title={clock(stamp)}>
      <span className="ml-event-when__clock">{clock(stamp)}</span>
      {ago(stamp) ? <span className="ml-event-when__ago">{ago(stamp)}</span> : null}
    </span>
  )
}

function EventObject({ event }: { event: ResourceEventItem }): React.JSX.Element {
  const kind = event.involvedKind || '—'
  const name = event.involvedName || '—'
  return (
    <span className="ml-event-object" title={`${kind} ${name}`}>
      <span className="ml-event-object__name">{name}</span>
      <span className="ml-event-object__meta">
        {kind}
        {event.involvedNamespace ? ` · ${event.involvedNamespace}` : ''}
      </span>
    </span>
  )
}

function EventTip({ event }: { event: ResourceEventItem }): React.JSX.Element {
  const { t } = useTranslation()
  const rows = [
    [t('eventsTable.created'), clock(event.firstTimestamp)],
    [t('eventsTable.lastSeen'), clock(event.lastTimestamp)],
    [t('eventsTable.count'), String(event.count)],
    [t('eventsTable.source'), event.source || '—'],
    [t('eventsTable.namespace'), event.involvedNamespace || '—']
  ]
  return (
    <div className="ml-event-tip">
      <div className="ml-event-tip__title">
        {event.type} · {event.reason}
      </div>
      <div className="ml-event-tip__object">
        {event.involvedKind ? `${event.involvedKind} / ` : ''}
        {event.involvedName || '—'}
      </div>
      <p className="ml-event-tip__msg">{event.message}</p>
      <dl className="ml-event-tip__meta">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function useEventColumns(): ColumnsType<ResourceEventItem> {
  const { t } = useTranslation()
  return [
    {
      title: t('eventsTable.when'),
      dataIndex: 'firstTimestamp',
      key: 'when',
      width: 168,
      sorter: (a, b) => compareAgeTimestamps(a.firstTimestamp ?? a.lastTimestamp, b.firstTimestamp ?? b.lastTimestamp),
      render: (_value, event) => (
        <Tooltip title={<EventTip event={event} />} placement="topLeft" mouseEnterDelay={0.25}>
          <EventWhen event={event} />
        </Tooltip>
      )
    },
    {
      title: t('eventsTable.object'),
      key: 'object',
      width: 220,
      ellipsis: true,
      sorter: (a, b) => compareText(a.involvedName, b.involvedName),
      render: (_value, event) => (
        <Tooltip title={<EventTip event={event} />} placement="topLeft" mouseEnterDelay={0.25}>
          <EventObject event={event} />
        </Tooltip>
      )
    },
    {
      title: t('eventsTable.reason'),
      dataIndex: 'reason',
      key: 'reason',
      width: 130,
      ellipsis: true,
      sorter: (a, b) => compareText(a.reason, b.reason)
    },
    {
      title: t('eventsTable.message'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      sorter: (a, b) => compareText(a.message, b.message),
      render: (message: string, event) => (
        <Tooltip title={<EventTip event={event} />} placement="topLeft" mouseEnterDelay={0.2}>
          <span className="ml-event-message">{message}</span>
        </Tooltip>
      )
    },
    {
      title: t('eventsTable.type'),
      dataIndex: 'type',
      key: 'type',
      width: 96,
      sorter: (a, b) => compareText(a.type, b.type),
      render: (value: string) => <Tag color={value === 'Warning' ? 'gold' : 'blue'}>{value}</Tag>
    },
    {
      title: t('eventsTable.count'),
      dataIndex: 'count',
      key: 'count',
      width: 72,
      sorter: (a, b) => compareNumericStrings(String(a.count), String(b.count))
    }
  ]
}
