import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
  type MenuProps
} from 'antd'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  bindingFromKeyboardEvent,
  formatShortcutBinding,
  shortcutParts,
  type ShortcutBinding
} from '@shared/types/keyboardShortcuts'
import { useClusterStore, type ClusterEntry } from '../../stores/clusterStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { sortClustersByConnection } from '../../clusterFilter'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { ClusterAvatar } from '../ClusterTabs/ClusterAvatar'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import {
  WORKSPACE_ACCENTS,
  WORKSPACE_ACCENT_IDS,
  workspaceAccentColor,
  type WorkspaceAccentId
} from '@shared/types/clusterGroup'
import { LogoCropModal } from '../ClusterTabs/LogoCropModal'
import { Icon } from '../ui/Icon'

interface SidebarWorkspacesProps {
  collapsed: boolean
  sectionExpanded: boolean
  onToggleSection: () => void
  onNavigate?: () => void
  onEditCluster?: (cluster: ClusterEntry) => void
}

const LOGO_ACCEPT = 'image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.ico'

/**
 * Cosine falloff like macOS Dock — smooth peak under the cursor. Kept deliberately
 * subtle (1.22x, not the Dock's ~1.6x) since this sits in a dense sidebar rail, not
 * a full-screen dock — a big scale jump there reads as jumpy rather than playful.
 */
function dockMagnifyScale(distancePx: number, influencePx = 56, maxScale = 1.22): number {
  if (distancePx >= influencePx) return 1
  const t = 1 - distancePx / influencePx
  return 1 + (maxScale - 1) * (0.5 - 0.5 * Math.cos(Math.PI * t))
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query)
}

export function SidebarWorkspaces({
  collapsed,
  sectionExpanded,
  onToggleSection,
  onNavigate,
  onEditCluster
}: SidebarWorkspacesProps): React.JSX.Element {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const workspaceDockMagnification = useDisplaySettingsStore((s) => s.workspaceDockMagnification)
  const groups = useClusterGroupsStore((s) => s.groups)
  const createGroup = useClusterGroupsStore((s) => s.createGroup)
  const renameGroup = useClusterGroupsStore((s) => s.renameGroup)
  const removeGroup = useClusterGroupsStore((s) => s.removeGroup)
  const setCollapsed = useClusterGroupsStore((s) => s.setCollapsed)
  const setGroupClusters = useClusterGroupsStore((s) => s.setGroupClusters)
  const setGroupShortcut = useClusterGroupsStore((s) => s.setGroupShortcut)
  const setGroupLogo = useClusterGroupsStore((s) => s.setGroupLogo)
  const setGroupAccent = useClusterGroupsStore((s) => s.setGroupAccent)

  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftClusterIds, setDraftClusterIds] = useState<string[]>([])
  const [draftShortcut, setDraftShortcut] = useState<ShortcutBinding | null>(null)
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | undefined>(undefined)
  const [draftAccent, setDraftAccent] = useState<WorkspaceAccentId | null>(null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [listeningShortcut, setListeningShortcut] = useState(false)
  const [shortcutError, setShortcutError] = useState<string | null>(null)
  const [dockScales, setDockScales] = useState<Record<string, number>>({})
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null)
  const dockRailRef = useRef<HTMLDivElement>(null)
  const dockRafRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMac = navigator.platform.includes('Mac')

  const dockVisual = collapsed && workspaceDockMagnification
  const dockEnabled = dockVisual && !openFlyoutId

  useEffect(() => {
    return () => {
      if (dockRafRef.current !== null) cancelAnimationFrame(dockRafRef.current)
    }
  }, [])

  function onDockPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!dockEnabled) return
    // Recompute at most once per animation frame — pointermove can fire far faster than
    // the screen refreshes, and a React state update on every one of those events was
    // the main source of the jank, no matter how the CSS transition itself was tuned.
    if (dockRafRef.current !== null) return
    const y = e.clientY
    dockRafRef.current = requestAnimationFrame(() => {
      dockRafRef.current = null
      const root = dockRailRef.current
      if (!root) return
      const next: Record<string, number> = {}
      root.querySelectorAll<HTMLElement>('[data-ws-dock-id]').forEach((el) => {
        const id = el.dataset.wsDockId
        if (!id) return
        const rect = el.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        next[id] = dockMagnifyScale(Math.abs(y - centerY))
      })
      setDockScales(next)
    })
  }

  function onDockPointerLeave(): void {
    if (openFlyoutId) return
    setDockScales({})
  }

  const clusterOptions = useMemo(
    () =>
      clusters.map((c) => ({
        value: c.id,
        label: c.customName || c.contextName
      })),
    [clusters]
  )

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((group) => {
        const members = sortClustersByConnection(
          group.clusterIds
            .map((id) => clusters.find((c) => c.id === id))
            .filter((c): c is ClusterEntry => !!c)
        )

        if (!q) {
          return { group, members, forceOpen: false }
        }

        const nameHit = matchesQuery(group.name, q)
        const matchedMembers = members.filter(
          (c) => matchesQuery(c.customName, q) || matchesQuery(c.contextName, q)
        )

        if (!nameHit && matchedMembers.length === 0) return null

        return {
          group,
          members: nameHit ? members : matchedMembers,
          forceOpen: true
        }
      })
      .filter((row): row is NonNullable<typeof row> => !!row)
  }, [groups, clusters, query])

  useEffect(() => {
    if (!listeningShortcut) return

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setListeningShortcut(false)
        setShortcutError(null)
        return
      }
      const binding = bindingFromKeyboardEvent(event)
      if (!binding) {
        setShortcutError(t('workspaces.shortcutRecordError'))
        return
      }
      setDraftShortcut(binding)
      setListeningShortcut(false)
      setShortcutError(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listeningShortcut, t])

  function openCreate(): void {
    setEditingId(null)
    setDraftName(t('workspaces.defaultName'))
    setDraftClusterIds([])
    setDraftShortcut(null)
    setDraftLogoUrl(undefined)
    setDraftAccent(null)
    setCropSource(null)
    setListeningShortcut(false)
    setShortcutError(null)
    setEditorOpen(true)
  }

  function openEdit(id: string): void {
    const g = groups.find((x) => x.id === id)
    if (!g) return
    setEditingId(id)
    setDraftName(g.name)
    setDraftClusterIds([...g.clusterIds])
    setDraftShortcut(g.shortcut ?? null)
    setDraftLogoUrl(g.logoUrl)
    setDraftAccent(g.accent ?? null)
    setCropSource(null)
    setListeningShortcut(false)
    setShortcutError(null)
    setEditorOpen(true)
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropSource(await readFileAsDataUrl(file))
  }

  async function saveEditor(): Promise<void> {
    const name = draftName.trim() || t('workspaces.defaultName')
    if (editingId) {
      await renameGroup(editingId, name)
      await setGroupClusters(editingId, draftClusterIds)
      await setGroupShortcut(editingId, draftShortcut)
      await setGroupLogo(editingId, draftLogoUrl ?? null)
      await setGroupAccent(editingId, draftAccent)
      message.success(t('workspaces.updated'))
    } else {
      await createGroup(name, draftClusterIds, draftShortcut, draftLogoUrl ?? null)
      message.success(t('workspaces.created'))
    }
    setEditorOpen(false)
  }

  const shortcutPartsLabel = draftShortcut ? shortcutParts(draftShortcut, isMac) : null

  const editorModal = (
    <>
      <Modal
        title={editingId ? t('workspaces.edit') : t('workspaces.new')}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void saveEditor()}
        okText={t('workspaces.save')}
        destroyOnClose
      >
        <Typography.Text strong>{t('workspaces.logo')}</Typography.Text>
        <Space align="start" size="middle" style={{ width: '100%', marginTop: 8, marginBottom: 16 }}>
          <ClusterAvatar logoUrl={draftLogoUrl} name={draftName || t('workspaces.defaultName')} size={48} />
          <div>
            <button
              type="button"
              className="ml-ws-logo-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon icon={Upload} variant="detail" />
              {t('workspaces.changeLogo')}
            </button>
            {draftLogoUrl ? (
              <button
                type="button"
                className="ml-ws-logo-btn ml-ws-logo-btn--danger"
                onClick={() => setDraftLogoUrl(undefined)}
              >
                {t('workspaces.removeLogo')}
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              style={{ display: 'none' }}
              onChange={(e) => void handleLogoSelected(e)}
            />
          </div>
        </Space>

        <Typography.Text strong>{t('workspaces.accent')}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          {t('workspaces.accentHint')}
        </Typography.Paragraph>
        <div className="ml-ws-accent-row">
          {/* "No colour" falls back to the theme accent, so a workspace never has to pick one. */}
          <button
            type="button"
            className={`ml-ws-accent ml-ws-accent--none${draftAccent === null ? ' is-selected' : ''}`}
            aria-label={t('workspaces.accentNone')}
            title={t('workspaces.accentNone')}
            onClick={() => setDraftAccent(null)}
          />
          {WORKSPACE_ACCENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`ml-ws-accent${draftAccent === id ? ' is-selected' : ''}`}
              style={{ background: WORKSPACE_ACCENTS[id] }}
              aria-label={id}
              title={id}
              onClick={() => setDraftAccent(id)}
            />
          ))}
        </div>

        <Typography.Text strong>{t('workspaces.name')}</Typography.Text>
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Production"
          style={{ marginTop: 8, marginBottom: 16 }}
        />
        <Typography.Text strong>{t('workspaces.clusters')}</Typography.Text>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
          placeholder={t('workspaces.selectClusters')}
          value={draftClusterIds}
          options={clusterOptions}
          onChange={setDraftClusterIds}
          optionFilterProp="label"
        />
        <Typography.Text strong>{t('workspaces.shortcut')}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          {t('workspaces.shortcutHint')}
        </Typography.Paragraph>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            type={listeningShortcut ? 'primary' : 'default'}
            onClick={() => {
              setShortcutError(null)
              setListeningShortcut((v) => !v)
            }}
          >
            {listeningShortcut
              ? t('workspaces.shortcutListening')
              : draftShortcut
                ? formatShortcutBinding(draftShortcut, isMac)
                : t('workspaces.shortcutAssign')}
          </Button>
          {draftShortcut && (
            <Button
              type="link"
              danger
              onClick={() => {
                setDraftShortcut(null)
                setListeningShortcut(false)
              }}
            >
              {t('workspaces.shortcutClear')}
            </Button>
          )}
        </div>
        {shortcutPartsLabel && !listeningShortcut && (
          <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
            {shortcutPartsLabel.map((part) => (
              <Typography.Text key={part} code style={{ fontSize: 11 }}>
                {part}
              </Typography.Text>
            ))}
          </div>
        )}
        {shortcutError && (
          <Typography.Text type="danger" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            {shortcutError}
          </Typography.Text>
        )}
      </Modal>
      <LogoCropModal
        imageSrc={cropSource}
        onCancel={() => setCropSource(null)}
        onSave={(dataUrl) => {
          setDraftLogoUrl(dataUrl)
          setCropSource(null)
        }}
      />
    </>
  )

  if (collapsed) {
    // The collapsed rail is already maximally compact (icons only) — there's nothing
    // further to collapse it into, so unlike the full sidebar's section header, this
    // mark is a static label, not a toggle. It used to call onToggleSection, which
    // flipped the same `sectionExpanded` state the full sidebar uses to show/hide the
    // workspaces list — clicking it here made the whole dock disappear with no way back.
    return (
      <div className="ml-sidebar-section ml-sidebar-section--workspaces ml-sidebar-section--compact">
        <Tooltip title={t('workspaces.compactTooltip')} placement="right" arrow={false}>
          <span
            className="ml-sidebar-compact-mark"
            aria-label={t('workspaces.compactTooltip')}
          >
            <Icon icon={Layers} variant="action" />
          </span>
        </Tooltip>
        <div
              ref={dockRailRef}
              className={`ml-sidebar-list ml-sidebar-list--compact-workspaces${
                dockVisual ? ' ml-sidebar-list--dock' : ''
              }`}
              onPointerMove={onDockPointerMove}
              onPointerLeave={onDockPointerLeave}
            >
              {groups.map((group) => {
                const members = sortClustersByConnection(
                  group.clusterIds
                    .map((id) => clusters.find((c) => c.id === id))
                    .filter((c): c is ClusterEntry => !!c)
                )
                const hasActive = members.some((c) => c.id === activeClusterId)
                const hasLive = members.some(
                  (c) =>
                    c.status === 'connected' &&
                    (c.id === activeClusterId || openedTabs.includes(c.id))
                )
                const scale = dockEnabled ? (dockScales[group.id] ?? 1) : 1
                const flyout = (
                  <div className="ml-resource-nav-flyout ml-ws-flyout">
                    <div className="ml-resource-nav-flyout-title">{group.name}</div>
                    <div className="ml-resource-nav-flyout-list" role="menu">
                      {members.length === 0 ? (
                        <div className="ml-ws-flyout-empty">{t('workspaces.noClusters')}</div>
                      ) : (
                        members.map((cluster) => {
                          const active = cluster.id === activeClusterId
                          const live =
                            cluster.status === 'connected' &&
                            (active || openedTabs.includes(cluster.id))
                          return (
                            <button
                              key={cluster.id}
                              type="button"
                              role="menuitem"
                              className={`ml-resource-nav-flyout-item${active ? ' is-active' : ''}${live ? ' is-session-live' : ''}`}
                              onClick={() => {
                                openClusterTab(cluster.id)
                                onNavigate?.()
                              }}
                            >
                              <span className="ml-resource-nav-flyout-item-icon">
                                <ClusterAvatar
                                  logoUrl={cluster.logoUrl}
                                  name={cluster.customName || cluster.contextName}
                                  contextName={cluster.contextName}
                                  endpoint={cluster.endpoint}
                                  size={20}
                                />
                              </span>
                              <span className="ml-resource-nav-flyout-item-label">
                                {cluster.customName || cluster.contextName}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )

                return (
                  <Popover
                    key={group.id}
                    content={flyout}
                    trigger={['hover']}
                    placement="rightTop"
                    arrow={false}
                    // Each icon has its own independent Popover, so a longer leave-delay than
                    // enter-delay meant moving quickly between icons opened the next flyout
                    // before the previous one's close timer fired — two shown at once, looking
                    // like they overlapped. Once any flyout in the dock is already open, treat
                    // hovering a sibling as an instant switch (no delay) instead of a fresh
                    // "first hover"; the leave delay only needs to survive the gap while the
                    // cursor travels from the icon to the flyout's own content.
                    mouseEnterDelay={openFlyoutId !== null ? 0 : 0.15}
                    mouseLeaveDelay={0.12}
                    destroyOnHidden={false}
                    align={{ offset: [10, -4] }}
                    onOpenChange={(open) => {
                      setOpenFlyoutId(open ? group.id : null)
                      if (open) setDockScales({})
                    }}
                    classNames={{ root: 'ml-resource-nav-flyout-overlay ml-ws-flyout-overlay' }}
                    styles={{
                      container: {
                        padding: 0,
                        background: 'transparent',
                        boxShadow: 'none',
                        border: 'none'
                      },
                      content: {
                        padding: 0,
                        background: 'transparent'
                      }
                    }}
                  >
                    <span className="ml-ws-rail-slot" data-ws-dock-id={group.id}>
                      <span
                        className="ml-ws-rail-slot__magnify"
                        style={
                          scale !== 1
                            ? {
                                transform: `scale(${scale})`,
                                zIndex: Math.round(scale * 20)
                              }
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className={`ml-ws-rail-item${hasActive ? ' is-active' : ''}${hasLive ? ' is-session-live' : ''}${
                            openFlyoutId === group.id ? ' is-flyout-open' : ''
                          }`}
                          aria-label={group.name}
                        >
                          <ClusterAvatar
                            logoUrl={group.logoUrl}
                            name={group.name}
                            size={28}
                            accentColor={workspaceAccentColor(group.accent) ?? undefined}
                          />
                        </button>
                      </span>
                    </span>
                  </Popover>
                )
              })}
            </div>
            <Tooltip title={t('workspaces.newTooltip')} placement="right" arrow={false}>
              <button
                type="button"
                className="ml-nav-fab"
                aria-label={t('workspaces.new')}
                onClick={openCreate}
              >
                <Icon icon={FolderPlus} variant="action" />
              </button>
            </Tooltip>
        {editorModal}
      </div>
    )
  }

  return (
    <div
      className={`ml-sidebar-section ml-sidebar-section--workspaces${
        sectionExpanded ? '' : ' ml-sidebar-section--workspaces-collapsed'
      }`}
      style={sectionExpanded ? undefined : { flex: 'none', minHeight: 0 }}
    >
      <div className="ml-sidebar-section-chrome ml-sidebar-section-chrome--rich">
        <button
          type="button"
          className="ml-sidebar-section-chrome__toggle"
          aria-expanded={sectionExpanded}
          onClick={onToggleSection}
        >
          <Icon icon={sectionExpanded ? ChevronDown : ChevronRight} variant="micro" />
          <span className="ml-sidebar-section-chrome__glyph" aria-hidden>
            <Icon icon={Layers} variant="micro" />
          </span>
          <span className="ml-sidebar-section-chrome__copy">
            <span className="ml-sidebar-section-chrome__label">{t('workspaces.title')}</span>
          </span>
        </button>
        <Tooltip title={t('workspaces.newTooltip')}>
          <button
            type="button"
            className="ml-sidebar-section-chrome__action"
            aria-label={t('workspaces.new')}
            onClick={openCreate}
          >
            <Icon icon={FolderPlus} variant="detail" />
          </button>
        </Tooltip>
        <span className="ml-sidebar-section-chrome__count">{groups.length}</span>
      </div>

      {sectionExpanded ? (
        <>
          {groups.length > 0 && (
            <div className="ml-sidebar-search">
              <ClusterSearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('chrome.searchWorkspaces')}
                size="small"
              />
            </div>
          )}

          {groups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="ml-sidebar-empty">{t('workspaces.empty')}</span>}
            />
          ) : filteredGroups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="ml-sidebar-empty">{t('chrome.noWorkspaceMatch')}</span>}
            />
          ) : (
            <div className="ml-sidebar-workspaces">
              {filteredGroups.map(({ group, members, forceOpen }) => {
                const isCollapsed = forceOpen ? false : !!group.collapsed
                const menu: MenuProps = {
                  items: [
                    {
                      key: 'edit',
                      icon: <Icon icon={Pencil} variant="detail" />,
                      label: t('workspaces.edit'),
                      onClick: () => openEdit(group.id)
                    },
                    {
                      key: 'delete',
                      danger: true,
                      icon: <Icon icon={Trash2} variant="detail" />,
                      label: t('workspaces.delete'),
                      onClick: () => void removeGroup(group.id)
                    }
                  ]
                }

                return (
                  <div
                    key={group.id}
                    className={`ml-ws-group${isCollapsed ? ' is-collapsed' : ' is-expanded'}`}
                    // Scoped custom property on the whole group, not just its header, so the
                    // clusters nested inside inherit the workspace's colour for their selection
                    // pill as well. Rules fall back to --ml-primary when it isn't set.
                    style={
                      workspaceAccentColor(group.accent)
                        ? ({
                            '--ml-ws-accent': workspaceAccentColor(group.accent)
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="ml-ws-group__head">
                      <button
                        type="button"
                        className="ml-ws-group__toggle"
                        onClick={() => void setCollapsed(group.id, !isCollapsed)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="ml-ws-group__chevron" aria-hidden>
                          <Icon icon={ChevronDown} variant="micro" />
                        </span>
                        <span className="ml-ws-group__avatar">
                          <ClusterAvatar
                            logoUrl={group.logoUrl}
                            name={group.name}
                            size={20}
                            accentColor={workspaceAccentColor(group.accent) ?? undefined}
                          />
                        </span>
                        <span className="ml-ws-group__meta">
                          <span className="ml-ws-group__name">{group.name}</span>
                          <span className="ml-ws-group__meta-trail">
                            {group.shortcut ? (
                              <span className="ml-ws-group__shortcut">
                                {formatShortcutBinding(group.shortcut, isMac)}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                      <Dropdown menu={menu} trigger={['click']}>
                        <button
                          type="button"
                          className="ml-ws-group__menu"
                          aria-label={t('workspaces.edit')}
                        >
                          <Icon icon={MoreHorizontal} variant="detail" />
                        </button>
                      </Dropdown>
                    </div>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          key="list"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="ml-ws-group__list">
                            {members.length === 0 ? (
                              <div className="ml-ws-group__empty">{t('workspaces.noClusters')}</div>
                            ) : (
                              members.map((cluster) => (
                                <FavoriteClusterBox
                                  key={`${group.id}-${cluster.id}`}
                                  cluster={cluster}
                                  active={cluster.id === activeClusterId}
                                  nested
                                  accentColor={workspaceAccentColor(group.accent) ?? undefined}
                                  fallbackLogoUrl={group.logoUrl}
                                  onActivate={onNavigate}
                                  onEdit={onEditCluster}
                                />
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}

      {editorModal}
    </div>
  )
}
