import { Button, Empty, Popconfirm, Tooltip, message } from 'antd'
import dayjs from 'dayjs'
import { Bell, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import { Icon } from '../ui/Icon'
import { useNotesStore } from '../../stores/notesStore'
import { useClusterStore } from '../../stores/clusterStore'

interface NotesPanelProps {
  notes: ResourceNote[]
  clusterId?: string
  resourceKind?: string
  namespace?: string
  resourceName?: string
  compact?: boolean
  emptyText?: string
}

function scopeLabel(note: ResourceNote, t: (k: string) => string): string {
  if (note.scope === 'resource') return t('notes.scope.resource')
  if (note.scope === 'cluster') return t('notes.scope.cluster')
  if (note.scope === 'workspace') return t('notes.scope.workspace')
  return t('notes.scope.global')
}

export function NotesPanel({
  notes,
  clusterId,
  resourceKind,
  namespace,
  resourceName,
  compact,
  emptyText
}: NotesPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const openCreate = useNotesStore((s) => s.openCreate)
  const openEdit = useNotesStore((s) => s.openEdit)
  const removeNote = useNotesStore((s) => s.removeNote)
  const fireReminder = useNotesStore((s) => s.fireReminder)
  const clusters = useClusterStore((s) => s.clusters)

  function clusterLabel(id?: string): string | undefined {
    if (!id) return undefined
    const c = clusters.find((x) => x.id === id)
    return c?.customName || c?.contextName || id.slice(0, 8)
  }

  function handleCreate(): void {
    openCreate({
      title: '',
      body: '',
      scope: resourceName ? 'resource' : clusterId ? 'cluster' : 'global',
      clusterId,
      resourceKind,
      namespace,
      resourceName
    })
  }

  async function handleDelete(id: string): Promise<void> {
    const ok = await removeNote(id)
    if (ok) message.success(t('notes.deleted'))
  }

  async function handleNotify(id: string): Promise<void> {
    try {
      await fireReminder(id)
      message.success(t('notes.testSent'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  if (notes.length === 0) {
    return (
      <div className={`ml-sparks-empty${compact ? ' ml-sparks-empty--compact' : ''}`}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyText ?? t('notes.empty')}
        >
          <Button type="primary" icon={<Icon icon={Plus} variant="action" />} onClick={handleCreate}>
            {t('notes.add')}
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className={compact ? 'ml-sparks-board ml-sparks-board--compact' : 'ml-sparks-board'}>
      {!compact ? (
        <div className="ml-sparks-board__toolbar">
          <span className="ml-sparks-board__count">{t('notes.count', { count: notes.length })}</span>
          <Button size="small" type="primary" icon={<Icon icon={Plus} variant="action" />} onClick={handleCreate}>
            {t('notes.add')}
          </Button>
        </div>
      ) : (
        <div className="ml-sparks-board__toolbar">
          <span className="ml-sparks-board__count">{t('notes.count', { count: notes.length })}</span>
          <Button size="small" type="primary" icon={<Icon icon={Plus} variant="action" />} onClick={handleCreate}>
            {t('notes.add')}
          </Button>
        </div>
      )}

      <div className="ml-sparks-grid">
        {notes.map((note) => {
          const meta = [
            clusterLabel(note.clusterId),
            note.resourceKind && note.resourceName
              ? `${note.resourceKind}${note.namespace ? `/${note.namespace}` : ''}/${note.resourceName}`
              : null,
            dayjs(note.updatedAt).format('MMM D, HH:mm')
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <article
              key={note.id}
              className={`ml-sparks-card${note.pinned ? ' ml-sparks-card--pinned' : ''}`}
              onClick={() => openEdit(note)}
            >
              <div className="ml-sparks-card__top">
                <span className={`ml-sparks-chip ml-sparks-chip--${note.scope}`}>{scopeLabel(note, t)}</span>
                <div className="ml-sparks-card__actions" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title={t('notes.notifyNow')}>
                    <button type="button" className="ml-sparks-icon-btn" onClick={() => void handleNotify(note.id)}>
                      <Icon icon={Bell} variant="detail" />
                    </button>
                  </Tooltip>
                  <Tooltip title={t('notes.editTitle')}>
                    <button type="button" className="ml-sparks-icon-btn" onClick={() => openEdit(note)}>
                      <Icon icon={Pencil} variant="detail" />
                    </button>
                  </Tooltip>
                  <Popconfirm
                    title={t('notes.deleteConfirm')}
                    onConfirm={() => void handleDelete(note.id)}
                    okText={t('notes.delete')}
                    cancelText={t('common.cancel')}
                  >
                    <button type="button" className="ml-sparks-icon-btn ml-sparks-icon-btn--danger">
                      <Icon icon={Trash2} variant="detail" />
                    </button>
                  </Popconfirm>
                </div>
              </div>

              <h3 className="ml-sparks-card__title">
                {note.pinned ? <Icon icon={Pin} variant="micro" /> : null}
                {note.title}
              </h3>

              {note.body ? <p className="ml-sparks-card__body">{note.body}</p> : null}

              <div className="ml-sparks-card__footer">
                <span className="ml-sparks-card__meta">{meta}</span>
                {note.remindAt && !note.reminderFiredAt ? (
                  <span className="ml-sparks-card__remind">
                    <Icon icon={Bell} variant="micro" />
                    {dayjs(note.remindAt).format('MMM D, HH:mm')}
                  </span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
