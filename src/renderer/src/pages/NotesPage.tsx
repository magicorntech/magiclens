import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Switch,
  Tooltip,
  message
} from 'antd'
import {
  Columns2,
  ChevronDown,
  ChevronRight,
  Eye,
  FilePlus,
  FileText,
  FolderOpen,
  FolderPlus,
  Bell,
  BookOpen,
  Brush,
  Expand,
  Grid3x3,
  LayoutTemplate,
  Maximize2,
  MoreHorizontal,
  Network,
  Pencil,
  PenLine,
  Pin,
  Plus,
  Puzzle,
  Search,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
  Type,
  Waypoints,
  Wrench,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNote, VaultFolderNode } from '@shared/types/notes'
import type {
  SparksPaperExtend,
  SparksPaperStyle,
  SparksPaperWidth,
  SparksPaperZoom,
  SparksSplitMode,
  SparksSurfaceMode,
  SparksWorkspacePanel
} from '@shared/types/sparks'
import { Icon } from '../components/ui/Icon'
import { HubPageHero } from '../components/Layout/HubPageHero'
import { LogoCropModal } from '../components/ClusterTabs/LogoCropModal'
import { MarkdownNoteEditor } from '../components/Notes/MarkdownNoteEditor'
import { SparksAlarmsSection } from '../components/Notes/SparksAlarmsSection'
import { SparksCanvasView } from '../components/Notes/SparksCanvasView'
import { SparksGraphView } from '../components/Notes/SparksGraphView'
import { SparksLinksPanel } from '../components/Notes/SparksLinksPanel'
import { SparksReminderModal } from '../components/Notes/SparksReminderModal'
import { SparksSplitNotePane } from '../components/Notes/SparksSplitNotePane'
import {
  applyTemplatePlaceholders,
  BUILTIN_PLUGINS,
  SPARKS_TEMPLATES,
  sparksThemeTone
} from '../components/Notes/sparksCatalog'
import {
  flattenFolderPaths,
  folderIconComponent,
  mergeFolderTree,
  sparksFolderImageSrc
} from '../components/Notes/sparksFolderIcons'
import { useNotesStore } from '../stores/notesStore'

const SIDEBAR_WIDTH_KEY = 'magilens.sparks.sidebarWidth'
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 272
const FOLDER_PHOTO_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function readSidebarWidth(): number {
  try {
    const raw = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(raw) && raw >= SIDEBAR_MIN && raw <= SIDEBAR_MAX) return raw
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT
}

function FolderAvatar({
  name,
  image,
  icon
}: {
  name: string
  image?: string
  icon?: string
}): React.JSX.Element {
  if (image) {
    return <img className="ml-vault-folder-avatar" src={sparksFolderImageSrc(image)} alt="" draggable={false} />
  }
  return <Icon icon={folderIconComponent(name, icon)} variant="micro" />
}

function FolderPhotoPicker({
  image,
  previewSrc,
  onPick,
  onClear
}: {
  image: string | null
  previewSrc: string | null
  onPick: () => void
  onClear: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="ml-vault-photo-picker">
      <div className="ml-vault-photo-picker__preview">
        {previewSrc || image ? (
          <img src={previewSrc ?? (image ? sparksFolderImageSrc(image) : '')} alt="" />
        ) : (
          <Icon icon={FolderOpen} variant="action" />
        )}
      </div>
      <div className="ml-vault-photo-picker__actions">
        <Button size="small" onClick={onPick}>
          {t('notes.folderPhotoPick')}
        </Button>
        {image || previewSrc ? (
          <Button size="small" onClick={onClear}>
            {t('notes.folderPhotoClear')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function VaultBrowserTree({
  nodes,
  notesByFolder,
  selectedFolder,
  selectedNoteId,
  splitPickId,
  collapsed,
  onToggle,
  onSelectFolder,
  onOpenNote,
  onEditFolder,
  onNewChild,
  onDeleteFolder,
  noteMenuItems,
  depth = 0
}: {
  nodes: VaultFolderNode[]
  notesByFolder: Map<string, ResourceNote[]>
  selectedFolder: string | null
  selectedNoteId: string | null
  splitPickId: string | null
  collapsed: Set<string>
  onToggle: (path: string) => void
  onSelectFolder: (path: string | null) => void
  onOpenNote: (id: string) => void
  onEditFolder: (node: VaultFolderNode) => void
  onNewChild: (parentPath: string) => void
  onDeleteFolder: (node: VaultFolderNode) => void
  noteMenuItems: (noteId: string) => Array<
    | {
        key: string
        label: string
        danger?: boolean
        onClick?: () => void
        children?: Array<{ key: string; label: string; disabled?: boolean; onClick?: () => void }>
      }
    | { type: 'divider' }
  >
  depth?: number
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <ul className="ml-vault-tree" style={{ paddingInlineStart: depth ? 12 : 0 }}>
      {nodes.map((node) => {
        const expanded = !collapsed.has(node.path)
        const directNotes = notesByFolder.get(node.path) ?? []
        const hasChildren = node.children.length > 0 || directNotes.length > 0
        return (
          <li key={node.path}>
            <div className={`ml-vault-tree__row${selectedFolder === node.path ? ' is-active' : ''}`}>
              <button
                type="button"
                className="ml-vault-tree__twist"
                aria-label={expanded ? t('notes.collapseFolder') : t('notes.expandFolder')}
                disabled={!hasChildren}
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) onToggle(node.path)
                }}
              >
                {hasChildren ? (
                  <Icon icon={expanded ? ChevronDown : ChevronRight} variant="micro" />
                ) : (
                  <span className="ml-vault-tree__twist-spacer" />
                )}
              </button>
              <button
                type="button"
                className={`ml-vault-tree__item${selectedFolder === node.path ? ' is-active' : ''}`}
                onClick={() => onSelectFolder(node.path)}
                onDoubleClick={() => hasChildren && onToggle(node.path)}
              >
                <FolderAvatar name={node.name} image={node.image} icon={node.icon} />
                <span className="ml-vault-tree__name">{node.name}</span>
                <span className="ml-vault-tree__count">{node.noteCount}</span>
              </button>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'edit',
                      label: t('notes.editFolder'),
                      onClick: () => onEditFolder(node)
                    },
                    {
                      key: 'sub',
                      label: t('notes.newSubfolder'),
                      onClick: () => onNewChild(node.path)
                    },
                    { type: 'divider' },
                    {
                      key: 'delete',
                      label: t('notes.deleteFolder'),
                      danger: true,
                      onClick: () => onDeleteFolder(node)
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <button
                  type="button"
                  className="ml-vault-tree__more"
                  aria-label={t('notes.folderActions')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon icon={MoreHorizontal} variant="micro" />
                </button>
              </Dropdown>
            </div>
            {expanded ? (
              <>
                {directNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`ml-vault-tree-note${selectedNoteId === note.id ? ' is-active' : ''}${splitPickId === note.id ? ' is-split-pick' : ''}`}
                    style={{ marginInlineStart: 12 }}
                  >
                    <button
                      type="button"
                      className="ml-vault-tree-note__main"
                      onClick={() => onOpenNote(note.id)}
                    >
                      <Icon icon={FileText} variant="micro" />
                      <span className="ml-vault-tree-note__title">
                        {note.pinned ? <Icon icon={Pin} variant="micro" /> : null}
                        {note.title}
                      </span>
                      {note.remindAt ? (
                        <span className="ml-vault-note__remind" title={note.remindAt}>
                          <Icon icon={Bell} variant="micro" />
                        </span>
                      ) : null}
                    </button>
                    <Dropdown
                      trigger={['click']}
                      menu={{ items: noteMenuItems(note.id) }}
                      placement="bottomRight"
                    >
                      <button
                        type="button"
                        className="ml-vault-tree-note__more"
                        aria-label={t('notes.noteActions')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon icon={MoreHorizontal} variant="micro" />
                      </button>
                    </Dropdown>
                  </div>
                ))}
                {node.children.length > 0 ? (
                  <VaultBrowserTree
                    nodes={node.children}
                    notesByFolder={notesByFolder}
                    selectedFolder={selectedFolder}
                    selectedNoteId={selectedNoteId}
                    splitPickId={splitPickId}
                    collapsed={collapsed}
                    onToggle={onToggle}
                    onSelectFolder={onSelectFolder}
                    onOpenNote={onOpenNote}
                    onEditFolder={onEditFolder}
                    onNewChild={onNewChild}
                    onDeleteFolder={onDeleteFolder}
                    noteMenuItems={noteMenuItems}
                    depth={depth + 1}
                  />
                ) : null}
              </>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function NotesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const notes = useNotesStore((s) => s.notes)
  const folders = useNotesStore((s) => s.folders)
  const tags = useNotesStore((s) => s.tags)
  const vault = useNotesStore((s) => s.vault)
  const hydrate = useNotesStore((s) => s.hydrate)
  const selectedId = useNotesStore((s) => s.selectedId)
  const secondaryId = useNotesStore((s) => s.secondaryId)
  const splitFocus = useNotesStore((s) => s.splitFocus)
  const openTabIds = useNotesStore((s) => s.openTabIds)
  const pinnedTabIds = useNotesStore((s) => s.pinnedTabIds)
  const selectedFolder = useNotesStore((s) => s.selectedFolder)
  const selectedTag = useNotesStore((s) => s.selectedTag)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const editorMode = useNotesStore((s) => s.editorMode)
  const workspacePanel = useNotesStore((s) => s.workspacePanel)
  const splitMode = useNotesStore((s) => s.splitMode)
  const themeId = useNotesStore((s) => s.themeId)
  const paperStyle = useNotesStore((s) => s.paperStyle)
  const paperWidth = useNotesStore((s) => s.paperWidth)
  const paperZoom = useNotesStore((s) => s.paperZoom)
  const paperExtend = useNotesStore((s) => s.paperExtend)
  const surfaceMode = useNotesStore((s) => s.surfaceMode)
  const pluginsEnabled = useNotesStore((s) => s.pluginsEnabled)
  const selectNote = useNotesStore((s) => s.selectNote)
  const closeNoteTab = useNotesStore((s) => s.closeNoteTab)
  const toggleTabPin = useNotesStore((s) => s.toggleTabPin)
  const reorderTabs = useNotesStore((s) => s.reorderTabs)
  const setSelectedFolder = useNotesStore((s) => s.setSelectedFolder)
  const setSelectedTag = useNotesStore((s) => s.setSelectedTag)
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)
  const setEditorMode = useNotesStore((s) => s.setEditorMode)
  const setWorkspacePanel = useNotesStore((s) => s.setWorkspacePanel)
  const setSplitMode = useNotesStore((s) => s.setSplitMode)
  const setSplitFocus = useNotesStore((s) => s.setSplitFocus)
  const splitNotes = useNotesStore((s) => s.splitNotes)
  const setPaperStyle = useNotesStore((s) => s.setPaperStyle)
  const setPaperWidth = useNotesStore((s) => s.setPaperWidth)
  const setPaperZoom = useNotesStore((s) => s.setPaperZoom)
  const setPaperExtend = useNotesStore((s) => s.setPaperExtend)
  const setSurfaceMode = useNotesStore((s) => s.setSurfaceMode)
  const setPluginEnabled = useNotesStore((s) => s.setPluginEnabled)
  const createNote = useNotesStore((s) => s.createNote)
  const updateNote = useNotesStore((s) => s.updateNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const createFolder = useNotesStore((s) => s.createFolder)
  const renameFolder = useNotesStore((s) => s.renameFolder)
  const deleteFolder = useNotesStore((s) => s.deleteFolder)
  const setFolderIcon = useNotesStore((s) => s.setFolderIcon)
  const saveFolderIconDataUrl = useNotesStore((s) => s.saveFolderIconDataUrl)
  const chooseVault = useNotesStore((s) => s.chooseVault)
  const revealVault = useNotesStore((s) => s.revealVault)

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  )
  const secondary = useMemo(
    () => notes.find((n) => n.id === secondaryId) ?? null,
    [notes, secondaryId]
  )

  const openTabs = useMemo(
    () =>
      openTabIds
        .map((id) => notes.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n)),
    [openTabIds, notes]
  )

  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [pluginsOpen, setPluginsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(true)
  const [dragTabId, setDragTabId] = useState<string | null>(null)
  const [newFolder, setNewFolder] = useState('')
  const [newFolderImage, setNewFolderImage] = useState<string | null>(null)
  const [newFolderImageSrc, setNewFolderImageSrc] = useState<string | null>(null)
  const [folderEdit, setFolderEdit] = useState<{
    path: string
    name: string
    image: string | null
    imageSrc: string | null
  } | null>(null)
  const [folderCropSource, setFolderCropSource] = useState<string | null>(null)
  const [folderCropTarget, setFolderCropTarget] = useState<'new' | 'edit' | null>(null)
  const [folderDeletePrompt, setFolderDeletePrompt] = useState<{
    path: string
    name: string
    noteCount: number
    step: 'empty' | 'choose' | 'confirm1' | 'confirm2'
  } | null>(null)
  const folderPhotoInputRef = useRef<HTMLInputElement>(null)
  const [splitPickId, setSplitPickId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set())
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    function onMove(e: MouseEvent): void {
      const drag = sidebarResizeRef.current
      if (!drag) return
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, drag.startW + (e.clientX - drag.startX)))
      setSidebarWidth(next)
    }
    function onUp(): void {
      if (!sidebarResizeRef.current) return
      sidebarResizeRef.current = null
      document.body.classList.remove('ml-vault--resizing')
      setSidebarWidth((w) => {
        try {
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
        } catch {
          /* ignore */
        }
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const splitPickNote = useMemo(
    () => notes.find((n) => n.id === splitPickId) ?? null,
    [notes, splitPickId]
  )

  const folderOptions = useMemo(
    () => flattenFolderPaths(mergeFolderTree(folders, notes)),
    [folders, notes]
  )

  async function moveNoteToFolder(noteId: string, folder: string): Promise<void> {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    if ((note.folder || '') === (folder || '')) return
    await updateNote(noteId, { folder })
    message.success(t('notes.movedToFolder'))
  }

  function confirmDeleteNote(id: string): void {
    Modal.confirm({
      title: t('notes.delete'),
      content: t('notes.deleteConfirm'),
      okText: t('notes.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeNote(id)
        if (splitPickId === id) setSplitPickId(null)
        message.success(t('notes.deleted'))
      }
    })
  }

  function noteMenuItems(noteId: string) {
    const note = notes.find((n) => n.id === noteId)
    const currentFolder = note?.folder ?? ''
    const items: Array<
      | {
          key: string
          label: string
          danger?: boolean
          onClick?: () => void
          children?: Array<{ key: string; label: string; disabled?: boolean; onClick?: () => void }>
        }
      | { type: 'divider' }
    > = [
      {
        key: 'move',
        label: t('notes.moveToFolder'),
        children: [
          {
            key: 'move-root',
            label: t('notes.vaultRoot'),
            disabled: currentFolder === '',
            onClick: () => void moveNoteToFolder(noteId, '')
          },
          ...folderOptions.map((opt) => ({
            key: `move-${opt.path}`,
            label: opt.label,
            disabled: currentFolder === opt.path,
            onClick: () => void moveNoteToFolder(noteId, opt.path)
          }))
        ]
      },
      {
        key: 'select-split',
        label:
          splitPickId === noteId ? t('notes.split.clearPick') : t('notes.split.selectForSplit'),
        onClick: () => setSplitPickId(splitPickId === noteId ? null : noteId)
      }
    ]
    if (splitPickId && splitPickId !== noteId) {
      const leftTitle = splitPickNote?.title ?? t('notes.untitled')
      items.push({
        key: 'combine',
        label: t('notes.split.combineWith', { title: leftTitle }),
        onClick: () => {
          splitNotes(splitPickId, noteId)
          setSplitPickId(null)
          message.success(t('notes.split.combined'))
        }
      })
    }
    if (selectedId && selectedId !== noteId) {
      items.push({
        key: 'open-split',
        label: t('notes.split.openInSplit'),
        onClick: () => {
          splitNotes(selectedId, noteId)
          setSplitPickId(null)
        }
      })
    }
    items.push({ type: 'divider' })
    items.push({
      key: 'delete',
      label: t('notes.delete'),
      danger: true,
      onClick: () => confirmDeleteNote(noteId)
    })
    return items
  }

  useEffect(() => {
    if (!selected) {
      setDraftTitle('')
      setDraftBody('')
      return
    }
    setDraftTitle(selected.title)
    setDraftBody(selected.body)
  }, [selected?.id, selected?.updatedAt])

  function scheduleSave(next: { title?: string; body?: string }): void {
    if (!selected) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void updateNote(selected.id, next)
    }, 450)
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return notes.filter((n) => {
      if (selectedTag) {
        const tag = selectedTag.toLowerCase()
        const inMeta = n.tags.some((x) => x.toLowerCase() === tag)
        const inBody = new RegExp(`(^|\\s)#${tag}\\b`, 'i').test(n.body)
        if (!inMeta && !inBody) return false
      }
      if (!q) return true
      const hay = `${n.title}\n${n.body}\n${n.tags.join(' ')}\n${n.path}`.toLowerCase()
      return hay.includes(q)
    })
  }, [notes, searchQuery, selectedTag])

  const displayFolders = useMemo(() => mergeFolderTree(folders, notes), [folders, notes])

  const notesByFolder = useMemo(() => {
    const map = new Map<string, ResourceNote[]>()
    for (const note of filtered) {
      const key = note.folder || ''
      const list = map.get(key)
      if (list) list.push(note)
      else map.set(key, [note])
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return map
  }, [filtered])

  const rootNotes = notesByFolder.get('') ?? []

  function toggleFolderCollapsed(path: string): void {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function handleNewNote(): Promise<void> {
    const note = await createNote({
      title: t('notes.untitled'),
      body: '',
      folder: selectedFolder || 'Inbox',
      tags: selectedTag ? [selectedTag] : []
    })
    selectNote(note.id)
    setWorkspacePanel('editor')
  }

  async function handleCreateMissing(title: string): Promise<void> {
    const note = await createNote({
      title,
      body: `# ${title}\n\n`,
      folder: selectedFolder || 'Inbox',
      tags: []
    })
    selectNote(note.id)
    setWorkspacePanel('editor')
    message.success(t('notes.links.createdFromLink', { title }))
  }

  async function handleTemplate(templateId: string): Promise<void> {
    const tpl = SPARKS_TEMPLATES.find((x) => x.id === templateId)
    if (!tpl) return
    const note = await createNote({
      title: applyTemplatePlaceholders(tpl.title),
      body: applyTemplatePlaceholders(tpl.body),
      folder: tpl.folder,
      tags: tpl.tags
    })
    selectNote(note.id)
    setWorkspacePanel('editor')
  }

  async function handleCreateFolder(): Promise<void> {
    const path = newFolder.trim().replace(/^\/+|\/+$/g, '')
    if (!path) return
    const ok = await createFolder(path, {
      ...(newFolderImage ? { image: newFolderImage } : {})
    })
    if (ok) {
      message.success(t('notes.folderCreated'))
      setFolderModalOpen(false)
      setNewFolder('')
      setNewFolderImage(null)
      setNewFolderImageSrc(null)
      setSelectedFolder(path)
      setCollapsedFolders((prev) => {
        const next = new Set(prev)
        next.delete(path)
        // Expand parents
        let cursor = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
        while (cursor) {
          next.delete(cursor)
          cursor = cursor.includes('/') ? cursor.slice(0, cursor.lastIndexOf('/')) : ''
        }
        return next
      })
    } else message.error(t('notes.folderCreateFailed'))
  }

  async function handleSaveFolderEdit(): Promise<void> {
    if (!folderEdit) return
    const name = folderEdit.name.trim().replace(/^\/+|\/+$/g, '')
    if (!name || name.includes('/')) {
      message.error(t('notes.folderRenameInvalid'))
      return
    }
    const parent = folderEdit.path.includes('/')
      ? folderEdit.path.slice(0, folderEdit.path.lastIndexOf('/'))
      : ''
    const nextPath = parent ? `${parent}/${name}` : name
    if (nextPath !== folderEdit.path) {
      const res = await renameFolder(folderEdit.path, nextPath)
      if (!res.ok) {
        message.error(
          res.error === 'exists' ? t('notes.folderRenameExists') : t('notes.folderRenameFailed')
        )
        return
      }
    }
    const iconOk = await setFolderIcon(nextPath, { image: folderEdit.image })
    if (!iconOk && nextPath === folderEdit.path) {
      message.error(t('notes.folderRenameFailed'))
      return
    }
    message.success(t('notes.folderUpdated'))
    setFolderEdit(null)
    setSelectedFolder(nextPath)
  }

  function openNewFolderModal(parentPath?: string): void {
    const base = parentPath ?? selectedFolder ?? ''
    setNewFolder(base ? `${base}/` : '')
    setNewFolderImage(null)
    setNewFolderImageSrc(null)
    setFolderModalOpen(true)
  }

  function openEditFolder(node: VaultFolderNode): void {
    setFolderEdit({
      path: node.path,
      name: node.name,
      image: node.image ?? null,
      imageSrc: node.image ? sparksFolderImageSrc(node.image) : null
    })
  }

  function countNotesInFolder(path: string): number {
    return notes.filter((n) => n.folder === path || n.folder.startsWith(`${path}/`)).length
  }

  async function runDeleteFolder(path: string, withNotes: boolean): Promise<void> {
    const res = await deleteFolder(path, withNotes)
    if (!res.ok) {
      if (res.error === 'not_empty') {
        message.warning(t('notes.deleteFolderNotEmpty', { count: res.noteCount ?? 0 }))
      } else {
        message.error(t('notes.deleteFolderFailed'))
      }
      return
    }
    message.success(
      withNotes && (res.deletedNotes ?? 0) > 0
        ? t('notes.deleteFolderWithNotesDone', { count: res.deletedNotes })
        : t('notes.deleteFolderDone')
    )
  }

  function confirmDeleteFolder(node: VaultFolderNode): void {
    const noteCount = countNotesInFolder(node.path)
    setFolderDeletePrompt({
      path: node.path,
      name: node.name,
      noteCount,
      step: noteCount === 0 ? 'empty' : 'choose'
    })
  }

  async function advanceFolderDelete(): Promise<void> {
    if (!folderDeletePrompt) return
    const { path, noteCount, step } = folderDeletePrompt
    if (step === 'empty') {
      setFolderDeletePrompt(null)
      await runDeleteFolder(path, false)
      return
    }
    if (step === 'choose') {
      setFolderDeletePrompt({ ...folderDeletePrompt, step: 'confirm1' })
      return
    }
    if (step === 'confirm1') {
      setFolderDeletePrompt({ ...folderDeletePrompt, step: 'confirm2' })
      return
    }
    setFolderDeletePrompt(null)
    await runDeleteFolder(path, true)
  }

  async function pickNewFolderPhoto(): Promise<void> {
    setFolderCropTarget('new')
    folderPhotoInputRef.current?.click()
  }

  async function pickEditFolderPhoto(): Promise<void> {
    if (!folderEdit) return
    setFolderCropTarget('edit')
    folderPhotoInputRef.current?.click()
  }

  async function handleFolderPhotoSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      setFolderCropTarget(null)
      return
    }
    try {
      setFolderCropSource(await readFileAsDataUrl(file))
    } catch {
      setFolderCropTarget(null)
      message.error(t('notes.folderPhotoPickFailed'))
    }
  }

  async function handleFolderCropSave(dataUrl: string): Promise<void> {
    const target = folderCropTarget
    setFolderCropSource(null)
    setFolderCropTarget(null)
    const res = await saveFolderIconDataUrl(dataUrl)
    if (!res.ok || !res.path) {
      message.error(res.error ?? t('notes.folderPhotoPickFailed'))
      return
    }
    const src = res.src ?? sparksFolderImageSrc(res.path)
    if (target === 'edit' && folderEdit) {
      setFolderEdit({ ...folderEdit, image: res.path, imageSrc: src })
      return
    }
    setNewFolderImage(res.path)
    setNewFolderImageSrc(src)
  }

  const showEditor =
    splitMode === 'single'
      ? workspacePanel === 'editor'
      : splitMode === 'notes' || splitMode === 'editor-graph' || splitMode === 'editor-canvas'
  const showGraph =
    splitMode === 'single'
      ? workspacePanel === 'graph'
      : splitMode === 'editor-graph' || splitMode === 'graph-canvas'
  const showCanvas =
    splitMode === 'single'
      ? workspacePanel === 'canvas'
      : splitMode === 'editor-canvas' || splitMode === 'graph-canvas'
  const showNotesSplit = splitMode === 'notes' && Boolean(selected)

  const editorPane = selected ? (
    <div className="ml-vault__editor-wrap">
      <header className="ml-vault__toolbar">
        <div className="ml-vault__toolbar-meta">
          <span className="ml-vault__path">{selected.path}</span>
        </div>
        <div className="ml-vault__toolbar-actions">
          <div className="ml-vault-modegroup" role="toolbar" aria-label={t('notes.surface.write')}>
            {(
              [
                {
                  id: 'edit' as const,
                  icon: Type,
                  tip: t('notes.mode.editHint'),
                  active: surfaceMode === 'write' && editorMode === 'edit',
                  onClick: () => {
                    setSurfaceMode('write')
                    setEditorMode('edit')
                  }
                },
                {
                  id: 'live' as const,
                  icon: Columns2,
                  tip: t('notes.mode.liveHint'),
                  active: surfaceMode === 'write' && editorMode === 'live',
                  onClick: () => {
                    setSurfaceMode('write')
                    setEditorMode('live')
                  }
                },
                {
                  id: 'preview' as const,
                  icon: Eye,
                  tip: t('notes.mode.previewHint'),
                  active: surfaceMode === 'write' && editorMode === 'preview',
                  onClick: () => {
                    setSurfaceMode('write')
                    setEditorMode('preview')
                  }
                },
                {
                  id: 'draw' as const,
                  icon: Brush,
                  tip: t('notes.surface.draw'),
                  active: surfaceMode === 'draw',
                  onClick: () => setSurfaceMode('draw')
                }
              ] as const
            ).map((item) => (
              <Tooltip key={item.id} title={item.tip}>
                <button
                  type="button"
                  className={`ml-vault-modegroup__btn${item.active ? ' is-active' : ''}`}
                  aria-label={item.tip}
                  onClick={item.onClick}
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
                  <Icon icon={paperStyle === 'grid' ? Grid3x3 : paperStyle === 'lined' ? PenLine : BookOpen} variant="action" />
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
            {pluginsEnabled.wikilinks !== false ? (
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
                className={`ml-vault-chip ml-vault-chip--icon${selected.remindAt ? ' is-active' : ''}`}
                onClick={() => setReminderOpen(true)}
              >
                <Icon icon={Bell} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.fields.pinned')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${selected.pinned ? ' is-active' : ''}`}
                onClick={() => void updateNote(selected.id, { pinned: !selected.pinned })}
              >
                <Icon icon={Pin} variant="action" />
              </button>
            </Tooltip>
            <Popconfirm title={t('notes.deleteConfirm')} onConfirm={() => void removeNote(selected.id)}>
              <button type="button" className="ml-vault-chip ml-vault-chip--icon ml-vault-chip--danger">
                <Icon icon={Trash2} variant="action" />
              </button>
            </Popconfirm>
          </div>
        </div>
      </header>
      <div
        id="ml-sparks-tooltabs"
        className="ml-vault__tooltabs"
        hidden={surfaceMode !== 'draw'}
      >
        <div id="ml-sparks-tooltabs-extra" className="ml-sparks-tooltabs-extra" />
      </div>
      <div className={`ml-vault__editor-body${linksOpen ? '' : ' ml-vault__editor-body--solo'}`}>
        <MarkdownNoteEditor
          noteId={selected.id}
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
          onOpenNote={(id) => {
            selectNote(id)
            setWorkspacePanel('editor')
          }}
          onCreateMissing={(title) => void handleCreateMissing(title)}
        />
        {pluginsEnabled.wikilinks !== false && linksOpen ? (
          <SparksLinksPanel
            note={selected}
            notes={notes}
            onOpenNote={(id) => {
              selectNote(id)
              setWorkspacePanel('editor')
            }}
            onCreateMissing={(title) => void handleCreateMissing(title)}
          />
        ) : null}
      </div>
    </div>
  ) : (
    <div className="ml-vault__empty">
      <div className="ml-vault__empty-inner">
        <Icon icon={FilePlus} size={28} />
        <h2>{t('notes.empty')}</h2>
        <Button type="primary" icon={<Icon icon={Plus} variant="action" />} onClick={() => void handleNewNote()}>
          {t('notes.add')}
        </Button>
      </div>
    </div>
  )

  return (
    <div
      className={`ml-vault ml-vault--theme-${themeId}${sparksThemeTone(themeId) === 'dark' ? ' ml-vault--dark' : ''}`}
      style={{ ['--ml-vault-sidebar-w' as string]: `${sidebarWidth}px` }}
    >
      <div className="ml-hub-glow" aria-hidden />
      <aside className="ml-vault__sidebar">
        <HubPageHero
          className="ml-vault-hub-hero"
          icon={Sparkles}
          eyebrow={t('notes.brandEyebrow')}
          title={t('notes.hubTitle')}
          actions={
            <Tooltip title={t('notes.newNote')}>
              <Button
                type="primary"
                size="small"
                icon={<Icon icon={Plus} variant="action" />}
                onClick={() => void handleNewNote()}
              />
            </Tooltip>
          }
        />

        <Input
          allowClear
          className="ml-vault__search"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('notes.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="ml-vault__section ml-vault__section--notes">
          <div className="ml-vault__section-head">
            <span>{t('notes.folders')}</span>
            <div className="ml-vault__section-actions">
              <Tooltip title={t('notes.newFolder')}>
                <button type="button" className="ml-vault-icon-btn" onClick={() => openNewFolderModal()}>
                  <Icon icon={FolderPlus} variant="micro" />
                </button>
              </Tooltip>
              <Tooltip title={t('notes.chooseVault')}>
                <button type="button" className="ml-vault-icon-btn" onClick={() => void chooseVault()}>
                  <Icon icon={FolderOpen} variant="micro" />
                </button>
              </Tooltip>
            </div>
          </div>
          {splitPickNote ? (
            <div className="ml-vault-split-pick">
              <span>{t('notes.split.pickBanner', { title: splitPickNote.title })}</span>
              <button type="button" className="ml-vault-split-pick__clear" onClick={() => setSplitPickId(null)}>
                {t('notes.split.clearPick')}
              </button>
            </div>
          ) : null}
          <div className="ml-vault-browser">
            <button
              type="button"
              className={`ml-vault-tree__row ml-vault-tree__all${selectedFolder === null ? ' is-active' : ''}`}
              onClick={() => {
                setSelectedFolder(null)
                setSelectedTag(null)
              }}
            >
              <span className="ml-vault-tree__item is-active">
                <span className="ml-vault-tree__name">{t('notes.allNotes')}</span>
                <span className="ml-vault-tree__count">{notes.length}</span>
              </span>
            </button>

            {rootNotes.length > 0 ? (
              <div className="ml-vault-tree-root-notes">
                {rootNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`ml-vault-tree-note${selectedId === note.id ? ' is-active' : ''}${splitPickId === note.id ? ' is-split-pick' : ''}`}
                  >
                    <button
                      type="button"
                      className="ml-vault-tree-note__main"
                      onClick={() => {
                        selectNote(note.id)
                        if (splitMode === 'single') setWorkspacePanel('editor')
                      }}
                    >
                      <Icon icon={FileText} variant="micro" />
                      <span className="ml-vault-tree-note__title">
                        {note.pinned ? <Icon icon={Pin} variant="micro" /> : null}
                        {note.title}
                      </span>
                    </button>
                    <Dropdown
                      trigger={['click']}
                      menu={{ items: noteMenuItems(note.id) }}
                      placement="bottomRight"
                    >
                      <button
                        type="button"
                        className="ml-vault-tree-note__more"
                        aria-label={t('notes.noteActions')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon icon={MoreHorizontal} variant="micro" />
                      </button>
                    </Dropdown>
                  </div>
                ))}
              </div>
            ) : null}

            {displayFolders.length === 0 && filtered.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notes.emptyFiltered')} />
            ) : (
              <VaultBrowserTree
                nodes={displayFolders}
                notesByFolder={notesByFolder}
                selectedFolder={selectedFolder}
                selectedNoteId={selectedId}
                splitPickId={splitPickId}
                collapsed={collapsedFolders}
                onToggle={toggleFolderCollapsed}
                onSelectFolder={(path) => {
                  setSelectedFolder(path)
                  setSelectedTag(null)
                }}
                onOpenNote={(id) => {
                  selectNote(id)
                  if (splitMode === 'single') setWorkspacePanel('editor')
                }}
                onEditFolder={openEditFolder}
                onNewChild={(parent) => openNewFolderModal(parent)}
                onDeleteFolder={confirmDeleteFolder}
                noteMenuItems={noteMenuItems}
              />
            )}
          </div>
        </div>

        <SparksAlarmsSection notes={notes} />

        {tags.length > 0 ? (
          <div className="ml-vault__section">
            <div className="ml-vault__section-head">
              <span>{t('notes.tags')}</span>
            </div>
            <div className="ml-vault-tags">
              {tags.slice(0, 40).map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  className={`ml-vault-tag${selectedTag === item.tag ? ' is-active' : ''}`}
                  onClick={() => setSelectedTag(selectedTag === item.tag ? null : item.tag)}
                >
                  #{item.tag}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="ml-vault__footer">
          <button type="button" className="ml-vault-footer-btn" onClick={() => void revealVault()}>
            <Icon icon={FolderOpen} variant="micro" />
            {t('notes.openVaultFolder')}
          </button>
        </div>
        <div
          className="ml-vault__sidebar-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('notes.resizeSidebar')}
          onMouseDown={(e) => {
            e.preventDefault()
            sidebarResizeRef.current = { startX: e.clientX, startW: sidebarWidth }
            document.body.classList.add('ml-vault--resizing')
          }}
        />
      </aside>

      <div className="ml-vault__workspace">
        <div className="ml-vault__browserbar">
          <div className="ml-vault-tabs" role="tablist" aria-label={t('notes.tabs')}>
            {openTabs.length === 0 ? (
              <span className="ml-vault-tabs__empty">{t('notes.tabsEmpty')}</span>
            ) : (
              openTabs.map((note) => {
                const tabPinned = pinnedTabIds.includes(note.id)
                return (
                  <div
                    key={note.id}
                    className={`ml-vault-tab${selectedId === note.id ? ' is-active' : ''}${secondaryId === note.id ? ' is-secondary' : ''}${splitMode === 'notes' && ((splitFocus === 'primary' && selectedId === note.id) || (splitFocus === 'secondary' && secondaryId === note.id)) ? ' is-focused-pane' : ''}${tabPinned ? ' is-pinned' : ''}${dragTabId === note.id ? ' is-dragging' : ''}`}
                    role="tab"
                    aria-selected={selectedId === note.id || secondaryId === note.id}
                    draggable
                    onDragStart={() => setDragTabId(note.id)}
                    onDragEnd={() => setDragTabId(null)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragTabId && dragTabId !== note.id) e.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragTabId) reorderTabs(dragTabId, note.id)
                      setDragTabId(null)
                    }}
                  >
                    <button
                      type="button"
                      className="ml-vault-tab__label"
                      onClick={() => {
                        selectNote(note.id)
                        if (splitMode === 'single' || splitMode === 'notes') setWorkspacePanel('editor')
                      }}
                      title={`${note.path}\n${t('notes.tabDragHint')}${splitMode === 'notes' ? `\n${t('notes.split.tabHint')}` : ''}`}
                    >
                      {tabPinned ? <Icon icon={Pin} variant="micro" /> : null}
                      <span>{note.title}</span>
                    </button>
                    <Tooltip title={tabPinned ? t('notes.unpinTab') : t('notes.pinTab')}>
                      <button
                        type="button"
                        className={`ml-vault-tab__pin${tabPinned ? ' is-active' : ''}`}
                        aria-label={tabPinned ? t('notes.unpinTab') : t('notes.pinTab')}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTabPin(note.id)
                        }}
                      >
                        <Icon icon={Pin} variant="micro" />
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      className="ml-vault-tab__close"
                      aria-label={t('notes.closeTab')}
                      onClick={(e) => {
                        e.stopPropagation()
                        closeNoteTab(note.id)
                      }}
                    >
                      <Icon icon={X} variant="micro" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="ml-vault__browserbar-actions">
            <Tooltip title={t('notes.panels.graphHint')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${workspacePanel === 'graph' && splitMode === 'single' ? ' is-active' : ''}`}
                disabled={pluginsEnabled.graph === false}
                onClick={() => {
                  setSplitMode('single')
                  setWorkspacePanel('graph')
                }}
              >
                <Icon icon={Network} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.panels.canvasHint')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${workspacePanel === 'canvas' && splitMode === 'single' ? ' is-active' : ''}`}
                disabled={pluginsEnabled.canvas === false}
                onClick={() => {
                  setSplitMode('single')
                  setWorkspacePanel('canvas')
                }}
              >
                <Icon icon={Waypoints} variant="action" />
              </button>
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  { key: 'single', label: t('notes.split.single') },
                  { key: 'notes', label: t('notes.split.notes') },
                  { key: 'editor-graph', label: t('notes.split.editorGraph') },
                  { key: 'editor-canvas', label: t('notes.split.editorCanvas') },
                  { key: 'graph-canvas', label: t('notes.split.graphCanvas') }
                ],
                onClick: ({ key }) => setSplitMode(key as SparksSplitMode)
              }}
            >
              <Tooltip title={t('notes.split.label')}>
                <button
                  type="button"
                  className={`ml-vault-chip ml-vault-chip--icon${splitMode !== 'single' ? ' is-active' : ''}`}
                >
                  <Icon icon={SplitSquareHorizontal} variant="action" />
                </button>
              </Tooltip>
            </Dropdown>
            <Tooltip title={t('notes.newNote')}>
              <button
                type="button"
                className="ml-vault-chip ml-vault-chip--icon"
                onClick={() => void handleNewNote()}
              >
                <Icon icon={Plus} variant="action" />
              </button>
            </Tooltip>
            <Tooltip title={t('notes.toolbox')}>
              <button
                type="button"
                className={`ml-vault-chip ml-vault-chip--icon${toolsOpen ? ' is-active' : ''}`}
                aria-expanded={toolsOpen}
                aria-controls="ml-vault-toolbox"
                onClick={() => setToolsOpen((v) => !v)}
              >
                <Icon icon={Wrench} variant="action" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div
          id="ml-vault-toolbox"
          className={`ml-vault-toolbox${toolsOpen ? ' is-open' : ''}`}
          aria-hidden={!toolsOpen}
        >
          <div className="ml-vault-toolbox__inner">
            <div className="ml-vault-toolbox__group">
              <Tooltip title={t('notes.panels.editorHint')}>
                <button
                  type="button"
                  className={`ml-vault-toolbox__btn${workspacePanel === 'editor' && splitMode === 'single' ? ' is-active' : ''}`}
                  onClick={() => {
                    setSplitMode('single')
                    setWorkspacePanel('editor')
                  }}
                >
                  <Icon icon={Pencil} variant="action" />
                  <span>{t('notes.panels.editor')}</span>
                </button>
              </Tooltip>

              {pluginsEnabled.templates !== false ? (
                <Dropdown
                  menu={{
                    items: SPARKS_TEMPLATES.map((tpl) => ({
                      key: tpl.id,
                      label: tpl.name,
                      title: tpl.description
                    })),
                    onClick: ({ key }) => void handleTemplate(String(key))
                  }}
                >
                  <button type="button" className="ml-vault-toolbox__btn">
                    <Icon icon={LayoutTemplate} variant="action" />
                    <span>{t('notes.templates')}</span>
                  </button>
                </Dropdown>
              ) : null}

              <button
                type="button"
                className="ml-vault-toolbox__btn"
                onClick={() => setPluginsOpen(true)}
              >
                <Icon icon={Puzzle} variant="action" />
                <span>{t('notes.plugins')}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`ml-vault__panes ml-vault__panes--${splitMode === 'single' ? workspacePanel : splitMode}`}
        >
          {showNotesSplit && selected ? (
            <>
              <SparksSplitNotePane
                note={selected}
                focused={splitFocus === 'primary'}
                onFocus={() => setSplitFocus('primary')}
                showLinks={pluginsEnabled.wikilinks !== false}
              />
              {secondary ? (
                <SparksSplitNotePane
                  note={secondary}
                  focused={splitFocus === 'secondary'}
                  onFocus={() => setSplitFocus('secondary')}
                />
              ) : (
                <div className="ml-vault__split-empty">
                  <p>{t('notes.split.pickSecond')}</p>
                  <span>{t('notes.split.pickSecondHint')}</span>
                </div>
              )}
            </>
          ) : null}
          {showEditor && !showNotesSplit ? editorPane : null}
          {showGraph && pluginsEnabled.graph !== false ? (
            <SparksGraphView
              notes={notes}
              selectedId={selectedId}
              onSelectNote={(id) => {
                selectNote(id)
              }}
            />
          ) : null}
          {showCanvas && pluginsEnabled.canvas !== false ? (
            <SparksCanvasView
              notes={notes}
              onOpenNote={(id) => {
                selectNote(id)
                if (splitMode === 'graph-canvas') setSplitMode('editor-canvas')
              }}
            />
          ) : null}
          {showCanvas && pluginsEnabled.canvas === false ? (
            <div className="ml-sparks-canvas ml-sparks-panel ml-sparks-panel--error">
              <p>{t('notes.panels.canvas')}</p>
              <span>{t('settings.sparks.pluginsHint')}</span>
            </div>
          ) : null}
          {showGraph && pluginsEnabled.graph === false ? (
            <div className="ml-sparks-graph ml-sparks-panel ml-sparks-panel--error">
              <p>{t('notes.panels.graph')}</p>
              <span>{t('settings.sparks.pluginsHint')}</span>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        title={t('notes.newFolder')}
        open={folderModalOpen}
        onCancel={() => setFolderModalOpen(false)}
        onOk={() => void handleCreateFolder()}
        okText={t('notes.create')}
      >
        <div className="ml-vault-folder-form">
          <label className="ml-vault-folder-form__label">{t('notes.folderPath')}</label>
          <Input
            placeholder="Journal/2026"
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            onPressEnter={() => void handleCreateFolder()}
          />
          <label className="ml-vault-folder-form__label">{t('notes.folderPhoto')}</label>
          <FolderPhotoPicker
            image={newFolderImage}
            previewSrc={newFolderImageSrc}
            onPick={() => void pickNewFolderPhoto()}
            onClear={() => {
              setNewFolderImage(null)
              setNewFolderImageSrc(null)
            }}
          />
        </div>
      </Modal>

      <Modal
        title={t('notes.editFolder')}
        open={Boolean(folderEdit)}
        onCancel={() => setFolderEdit(null)}
        onOk={() => void handleSaveFolderEdit()}
        okText={t('notes.save')}
      >
        {folderEdit ? (
          <div className="ml-vault-folder-form">
            <label className="ml-vault-folder-form__label">{t('notes.folderName')}</label>
            <Input
              value={folderEdit.name}
              onChange={(e) => setFolderEdit({ ...folderEdit, name: e.target.value })}
              onPressEnter={() => void handleSaveFolderEdit()}
            />
            <label className="ml-vault-folder-form__label">{t('notes.folderPhoto')}</label>
            <FolderPhotoPicker
              image={folderEdit.image}
              previewSrc={folderEdit.imageSrc}
              onPick={() => void pickEditFolderPhoto()}
              onClear={() => setFolderEdit({ ...folderEdit, image: null, imageSrc: null })}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        title={t('notes.plugins')}
        open={pluginsOpen}
        onCancel={() => setPluginsOpen(false)}
        footer={null}
      >
        <p className="ml-vault-plugins-hint">{t('notes.pluginsHint')}</p>
        <div className="ml-vault-plugins">
          {BUILTIN_PLUGINS.map((plugin) => (
            <div key={plugin.id} className="ml-vault-plugin">
              <div>
                <strong>{plugin.name}</strong>
                <p>{plugin.description}</p>
              </div>
              <Switch
                checked={pluginsEnabled[plugin.id] !== false}
                onChange={(checked) => setPluginEnabled(plugin.id, checked)}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title={
          folderDeletePrompt?.step === 'confirm2'
            ? t('notes.deleteFolderWithNotesConfirm2Title')
            : folderDeletePrompt?.step === 'confirm1'
              ? t('notes.deleteFolderWithNotesConfirm1Title')
              : t('notes.deleteFolder')
        }
        open={Boolean(folderDeletePrompt)}
        onCancel={() => setFolderDeletePrompt(null)}
        onOk={() => void advanceFolderDelete()}
        okText={
          folderDeletePrompt?.step === 'empty'
            ? t('notes.delete')
            : folderDeletePrompt?.step === 'choose'
              ? t('notes.deleteFolderWithNotes')
              : folderDeletePrompt?.step === 'confirm1'
                ? t('notes.deleteFolderWithNotesConfirm1Ok')
                : t('notes.deleteFolderWithNotesConfirm2Ok')
        }
        okButtonProps={{ danger: true }}
        cancelText={t('common.cancel')}
      >
        {folderDeletePrompt?.step === 'empty' ? (
          <p>{t('notes.deleteFolderEmptyConfirm', { name: folderDeletePrompt.name })}</p>
        ) : null}
        {folderDeletePrompt?.step === 'choose' ? (
          <p>
            {t('notes.deleteFolderHasNotes', {
              name: folderDeletePrompt.name,
              count: folderDeletePrompt.noteCount
            })}
          </p>
        ) : null}
        {folderDeletePrompt?.step === 'confirm1' ? (
          <p>
            {t('notes.deleteFolderWithNotesConfirm1', {
              name: folderDeletePrompt.name,
              count: folderDeletePrompt.noteCount
            })}
          </p>
        ) : null}
        {folderDeletePrompt?.step === 'confirm2' ? (
          <p>
            {t('notes.deleteFolderWithNotesConfirm2', {
              name: folderDeletePrompt.name,
              count: folderDeletePrompt.noteCount
            })}
          </p>
        ) : null}
      </Modal>

      <input
        ref={folderPhotoInputRef}
        type="file"
        accept={FOLDER_PHOTO_ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => void handleFolderPhotoSelected(e)}
      />
      <LogoCropModal
        imageSrc={folderCropSource}
        title={t('notes.folderPhotoCrop')}
        okText={t('notes.folderPhotoCropSave')}
        onCancel={() => {
          setFolderCropSource(null)
          setFolderCropTarget(null)
        }}
        onSave={(dataUrl) => void handleFolderCropSave(dataUrl)}
      />

      <SparksReminderModal
        open={reminderOpen}
        note={selected}
        onClose={() => setReminderOpen(false)}
        onSave={async (patch) => {
          if (!selected) return
          await updateNote(selected.id, patch)
        }}
      />
    </div>
  )
}
