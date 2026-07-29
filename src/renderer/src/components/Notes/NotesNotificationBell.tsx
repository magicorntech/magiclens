import { Button, Empty, List, Popover, Typography } from 'antd'
import dayjs from 'dayjs'
import { Bell, BellRing } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { useNotesStore } from '../../stores/notesStore'
import { useClusterStore } from '../../stores/clusterStore'

interface NotesNotificationBellProps {
  className?: string
}

export function NotesNotificationBell({ className }: NotesNotificationBellProps): React.JSX.Element {
  const { t } = useTranslation()
  const inbox = useNotesStore((s) => s.inbox)
  const inboxOpen = useNotesStore((s) => s.inboxOpen)
  const setInboxOpen = useNotesStore((s) => s.setInboxOpen)
  const markInboxRead = useNotesStore((s) => s.markInboxRead)
  const markAllInboxRead = useNotesStore((s) => s.markAllInboxRead)
  const clearInbox = useNotesStore((s) => s.clearInbox)
  const openEdit = useNotesStore((s) => s.openEdit)
  const notes = useNotesStore((s) => s.notes)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const unread = inbox.filter((i) => !i.read).length

  const content = (
    <div className="ml-notes-inbox">
      <div className="ml-notes-inbox__header">
        <Typography.Text strong>{t('notes.inbox.title')}</Typography.Text>
        <div className="ml-notes-inbox__header-actions">
          <Button type="link" size="small" onClick={() => markAllInboxRead()} disabled={unread === 0}>
            {t('notes.inbox.markAllRead')}
          </Button>
          <Button type="link" size="small" onClick={() => clearInbox()} disabled={inbox.length === 0}>
            {t('notes.inbox.clear')}
          </Button>
        </div>
      </div>

      {inbox.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notes.inbox.empty')} />
      ) : (
        <List
          size="small"
          dataSource={inbox}
          style={{ maxHeight: 320, overflow: 'auto', width: 320 }}
          renderItem={(item) => (
            <List.Item
              className={`ml-notes-inbox__item${!item.read ? ' ml-notes-inbox__item--unread' : ''}`}
              onClick={() => {
                markInboxRead(item.id)
                const note = notes.find((n) => n.id === item.noteId)
                if (note && !note.id.startsWith('test-')) {
                  openEdit(note)
                } else {
                  setActiveView('notes')
                }
                setInboxOpen(false)
              }}
            >
              <List.Item.Meta
                avatar={<Icon icon={BellRing} variant="detail" />}
                title={item.title}
                description={
                  <div>
                    {item.body ? (
                      <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 2, fontSize: 12 }}>
                        {item.body}
                      </Typography.Paragraph>
                    ) : null}
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(item.firedAt).format('MMM D, HH:mm:ss')}
                    </Typography.Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      <div className="ml-notes-inbox__footer">
        <Button
          type="link"
          size="small"
          onClick={() => {
            setActiveView('notes')
            setInboxOpen(false)
          }}
        >
          {t('notes.inbox.openNotes')}
        </Button>
      </div>
    </div>
  )

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={inboxOpen}
      onOpenChange={(open) => {
        setInboxOpen(open)
        if (open) markAllInboxRead()
      }}
      content={content}
    >
      <button
        type="button"
        className={`ml-icon-btn ml-action-btn ml-notes-bell-btn${className ? ` ${className}` : ''}`}
        aria-label={t('notes.inbox.title')}
        title={t('notes.inbox.title')}
      >
        <Icon icon={Bell} variant="toolbar" />
        {unread > 0 ? (
          <span className="ml-notes-bell-badge" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </Popover>
  )
}
