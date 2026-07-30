import { useEffect, useRef, useState } from 'react'
import { Popconfirm, Tooltip, message } from 'antd'
import {
  Bell,
  BookOpen,
  Brush,
  Columns2,
  Eye,
  Expand,
  Grid3x3,
  Maximize2,
  PenLine,
  Pin,
  Trash2,
  Type,
  Waypoints,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import type {
  SparksPaperExtend,
  SparksPaperStyle,
  SparksPaperWidth,
  SparksPaperZoom,
  SparksSurfaceMode
} from '@shared/types/sparks'
import type { NoteEditorMode } from '@shared/types/notes'
import { Icon } from '../ui/Icon'
import { MarkdownNoteEditor } from './MarkdownNoteEditor'
import { SparksLinksPanel } from './SparksLinksPanel'
import { SparksReminderModal } from './SparksReminderModal'
import { useNotesStore } from '../../stores/notesStore'

interface SparksSplitNotePaneProps {
  note: ResourceNote
  focused: boolean
  onFocus: () => void
  showLinks?: boolean
}

export function SparksSplitNotePane({
  note,
  focused,
  onFocus,
  showLinks = false
}: SparksSplitNotePaneProps): React.JSX.Element {
  const { t } = useTranslation()
  const notes = useNotesStore((s) => s.notes)
  const vault = useNotesStore((s) => s.vault)
  const themeId = useNotesStore((s) => s.themeId)
  const paperStyle = useNotesStore((s) => s.paperStyle)
  const paperWidth = useNotesStore((s) => s.paperWidth)
  const paperZoom = useNotesStore((s) => s.paperZoom)
  const paperExtend = useNotesStore((s) => s.paperExtend)
  const updateNote = useNotesStore((s) => s.updateNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const selectNote = useNotesStore((s) => s.selectNote)
  const createNote = useNotesStore((s) => s.createNote)
  const setPaperStyle = useNotesStore((s) => s.setPaperStyle)
  const setPaperWidth = useNotesStore((s) => s.setPaperWidth)
  const setPaperZoom = useNotesStore((s) => s.setPaperZoom)
  const setPaperExtend = useNotesStore((s) => s.setPaperExtend)

  const [draftTitle, setDraftTitle] = useState(note.title)
  const [draftBody, setDraftBody] = useState(note.body)
  const [editorMode, setEditorMode] = useState<NoteEditorMode>('edit')
  const [surfaceMode, setSurfaceMode] = useState<SparksSurfaceMode>('write')
  const [linksOpen, setLinksOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraftTitle(note.title)
    setDraftBody(note.body)
  }, [note.id, note.updatedAt])

  function scheduleSave(next: { title?: string; body?: string }): void {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void updateNote(note.id, next)
    }, 450)
  }

  async function handleCreateMissing(title: string): Promise<void> {
    const created = await createNote({
      title,
      body: `# ${title}\n\n`,
      folder: note.folder || 'Inbox',
      tags: []
    })
    selectNote(created.id)
    message.success(t('notes.links.createdFromLink', { title }))
  }

  return (
    <div
      className={`ml-vault__editor-wrap ml-vault__split-pane${focused ? ' is-focused' : ''}`}
      onMouseDown={onFocus}
    >
      <header className="ml-vault__toolbar">
        <div className="ml-vault__toolbar-meta">
          <span className="ml-vault__path">{note.path}</span>
        </div>
        <div className="ml-vault__toolbar-actions">
          <div className="ml-vault-modegroup" role="toolbar">
            {(
              [
                { id: 'edit' as const, icon: Type, tip: t('notes.mode.editHint'), mode: 'edit' as const },
                { id: 'live' as const, icon: Columns2, tip: t('notes.mode.liveHint'), mode: 'live' as const },
                { id: 'preview' as const, icon: Eye, tip: t('notes.mode.previewHint'), mode: 'preview' as const },
                { id: 'draw' as const, icon: Brush, tip: t('notes.surface.draw'), mode: null }
              ] as const
            ).map((item) => (
              <Tooltip key={item.id} title={item.tip}>
                <button
                  type="button"
                  className={`ml-vault-modegroup__btn${
                    item.id === 'draw'
                      ? surfaceMode === 'draw'
                        ? ' is-active'
                        : ''
                      : surfaceMode === 'write' && editorMode === item.mode
                        ? ' is-active'
                        : ''
                  }`}
                  aria-label={item.tip}
                  onClick={() => {
                    if (item.id === 'draw') setSurfaceMode('draw')
                    else {
                      setSurfaceMode('write')
                      setEditorMode(item.mode!)
                    }
                  }}
                >
                  <Icon icon={item.icon} variant="action" />
                </button>
              </Tooltip>
            ))}
          </div>
          <div className="ml-vault__chrome-group ml-vault__chrome-group--compact">
            <Dropdown
              menu={{
                items: (
                  [
                    { id: 'plain', icon: BookOpen },
                    { id: 'lined', icon: PenLine },
                    { id: 'grid', icon: Grid3x3 },
                    { id: 'book', icon: BookOpen }
                  ] as const
                ).map((item) => ({
                  key: item.id,
                  label: (
                    <span className="ml-vault-paper-item">
                      <Icon icon={item.icon} variant="micro" />
                      {t(`notes.paper.${item.id}`)}
                      {paperStyle === item.id ? ' ✓' : ''}
                    </span>
                  )
                })),
                onClick: ({ key }) => setPaperStyle(key as SparksPaperStyle)
              }}
            >
              <Tooltip title={t('notes.paper.label')}>
                <button type="button" className="ml-vault-chip ml-vault-chip--icon">
                  <Icon
                    icon={paperStyle === 'grid' ? Grid3x3 : paperStyle === 'lined' ? PenLine : BookOpen}
                    variant="action"
                  />
                </button>
              </Tooltip>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { type: 'group' as const, label: t('notes.paper.width') },
                  ...(['sm', 'md', 'lg', 'xl'] as SparksPaperWidth[]).map((id) => ({
                    key: `w-${id}`,
                    label: `${t(`notes.paper.width_${id}`)}${paperWidth === id ? ' ✓' : ''}`
                  })),
                  { type: 'group' as const, label: t('notes.paper.zoom') },
                  ...(['out', 'normal', 'in', 'max'] as SparksPaperZoom[]).map((id) => ({
                    key: `z-${id}`,
                    label: `${t(`notes.paper.zoom_${id}`)}${paperZoom === id ? ' ✓' : ''}`
                  })),
                  { type: 'group' as const, label: t('notes.paper.extend') },
                  ...(['normal', 'tall', 'long'] as SparksPaperExtend[]).map((id) => ({
                    key: `e-${id}`,
                    label: `${t(`notes.paper.extend_${id}`)}${paperExtend === id ? ' ✓' : ''}`
                  }))
                ],
                onClick: ({ key }) => {
                  const k = String(key)
                  if (k.startsWith('w-')) setPaperWidth(k.slice(2) as SparksPaperWidth)
                  else if (k.startsWith('z-')) setPaperZoom(k.slice(2) as SparksPaperZoom)
                  else if (k.startsWith('e-')) setPaperExtend(k.slice(2) as SparksPaperExtend)
                }
              }}
            >
              <Tooltip title={t('notes.paper.size')}>
                <button type="button" className="ml-vault-chip ml-vault-chip--icon">
                  <Icon icon={Maximize2} variant="action" />
                </button>
              </Tooltip>
            </Dropdown>
            <Tooltip title={t('notes.paper.zoom_out')}>
              <button
                type="button"
                className="ml-vault-chip ml-vault-chip--icon"
                onClick={() => {
                  const order: SparksPaperZoom[] = ['out', 'normal', 'in', 'max']
                  const i = order.indexOf(paperZoom)
                  setPaperZoom(order[Math.max(0, i - 1)]!)
                }}
              >
                <Icon icon={ZoomOut} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.paper.zoom_in')}>
              <button
                type="button"
                className="ml-vault-chip ml-vault-chip--icon"
                onClick={() => {
                  const order: SparksPaperZoom[] = ['out', 'normal', 'in', 'max']
                  const i = order.indexOf(paperZoom)
                  setPaperZoom(order[Math.min(order.length - 1, i + 1)]!)
                }}
              >
                <Icon icon={ZoomIn} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.paper.extend')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${paperExtend !== 'normal' ? ' is-active' : ''}`}
                onClick={() => {
                  const order: SparksPaperExtend[] = ['normal', 'tall', 'long']
                  const i = order.indexOf(paperExtend)
                  setPaperExtend(order[(i + 1) % order.length]!)
                }}
              >
                <Icon icon={Expand} variant="action" />
              </button>
            </Tooltip>
            {showLinks ? (
              <Tooltip title={t('notes.links.toggle')}>
                <button
                  type="button"
                  className={`ml-vault-chip ml-vault-chip--icon${linksOpen ? ' is-active' : ''}`}
                  onClick={() => setLinksOpen((v) => !v)}
                >
                  <Icon icon={Waypoints} variant="action" />
                </button>
              </Tooltip>
            ) : null}
            <Tooltip title={t('notes.reminder.title')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${note.remindAt ? ' is-active' : ''}`}
                onClick={() => setReminderOpen(true)}
              >
                <Icon icon={Bell} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.fields.pinned')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${note.pinned ? ' is-active' : ''}`}
                onClick={() => void updateNote(note.id, { pinned: !note.pinned })}
              >
                <Icon icon={Pin} variant="action" />
              </button>
            </Tooltip>
            <Popconfirm title={t('notes.deleteConfirm')} onConfirm={() => void removeNote(note.id)}>
              <button type="button" className="ml-vault-chip ml-vault-chip--icon ml-vault-chip--danger">
                <Icon icon={Trash2} variant="action" />
              </button>
            </Popconfirm>
          </div>
        </div>
      </header>
      <div className={`ml-vault__editor-body${showLinks && linksOpen ? '' : ' ml-vault__editor-body--solo'}`}>
        <MarkdownNoteEditor
          noteId={note.id}
          title={draftTitle}
          body={draftBody}
          mode={editorMode}
          notes={notes}
          themeId={themeId}
          paperStyle={paperStyle}
          paperWidth={paperWidth}
          paperZoom={paperZoom}
          paperExtend={paperExtend}
          surfaceMode={surfaceMode}
          vaultPath={vault?.vaultPath}
          onTitleChange={(title) => {
            setDraftTitle(title)
            scheduleSave({ title })
          }}
          onBodyChange={(body) => {
            setDraftBody(body)
            scheduleSave({ body })
          }}
          onOpenNote={(id) => selectNote(id)}
          onCreateMissing={(title) => void handleCreateMissing(title)}
        />
        {showLinks && linksOpen ? (
          <SparksLinksPanel
            note={note}
            notes={notes}
            onOpenNote={(id) => selectNote(id)}
            onCreateMissing={(title) => void handleCreateMissing(title)}
          />
        ) : null}
      </div>
      <SparksReminderModal
        note={note}
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        onSave={async (patch) => {
          await updateNote(note.id, patch)
        }}
      />
    </div>
  )
}
