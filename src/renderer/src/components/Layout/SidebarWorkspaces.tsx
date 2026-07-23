import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Input, Modal, Select, Space, Tooltip, Typography, message } from 'antd'
import { ChevronDown, ChevronRight, FolderPlus, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  bindingFromKeyboardEvent,
  formatShortcutBinding,
  shortcutParts,
  type ShortcutBinding
} from '@shared/types/keyboardShortcuts'
import { useClusterStore, type ClusterEntry } from '../../stores/clusterStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { ClusterAvatar } from '../ClusterTabs/ClusterAvatar'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { LogoCropModal } from '../ClusterTabs/LogoCropModal'
import { Icon } from '../ui/Icon'

interface SidebarWorkspacesProps {
  collapsed: boolean
  onNavigate?: () => void
  onEditCluster?: (cluster: ClusterEntry) => void
}

const LOGO_ACCEPT = 'image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.ico'

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
  onNavigate,
  onEditCluster
}: SidebarWorkspacesProps): React.JSX.Element {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const groups = useClusterGroupsStore((s) => s.groups)
  const createGroup = useClusterGroupsStore((s) => s.createGroup)
  const renameGroup = useClusterGroupsStore((s) => s.renameGroup)
  const removeGroup = useClusterGroupsStore((s) => s.removeGroup)
  const setCollapsed = useClusterGroupsStore((s) => s.setCollapsed)
  const setGroupClusters = useClusterGroupsStore((s) => s.setGroupClusters)
  const setGroupShortcut = useClusterGroupsStore((s) => s.setGroupShortcut)
  const setGroupLogo = useClusterGroupsStore((s) => s.setGroupLogo)

  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftClusterIds, setDraftClusterIds] = useState<string[]>([])
  const [draftShortcut, setDraftShortcut] = useState<ShortcutBinding | null>(null)
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | undefined>(undefined)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [listeningShortcut, setListeningShortcut] = useState(false)
  const [shortcutError, setShortcutError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMac = navigator.platform.includes('Mac')

  const clusterOptions = useMemo(
    () =>
      clusters.map((c) => ({
        value: c.id,
        label: c.customName || c.contextName
      })),
    [clusters]
  )

  /** Clusters that belong to any workspace, with workspace names for tooltips (collapsed rail). */
  const compactWorkspaceClusters = useMemo(() => {
    const byId = new Map<string, { cluster: ClusterEntry; workspaceNames: string[] }>()
    for (const group of groups) {
      for (const id of group.clusterIds) {
        const cluster = clusters.find((c) => c.id === id)
        if (!cluster) continue
        const existing = byId.get(id)
        if (existing) {
          if (!existing.workspaceNames.includes(group.name)) {
            existing.workspaceNames.push(group.name)
          }
        } else {
          byId.set(id, { cluster, workspaceNames: [group.name] })
        }
      }
    }
    return [...byId.values()]
  }, [groups, clusters])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((group) => {
        const members = group.clusterIds
          .map((id) => clusters.find((c) => c.id === id))
          .filter((c): c is ClusterEntry => !!c)

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
            <Button
              size="small"
              icon={<Icon icon={Upload} variant="detail" />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('workspaces.changeLogo')}
            </Button>
            {draftLogoUrl ? (
              <Button
                type="link"
                danger
                size="small"
                style={{ marginLeft: 4 }}
                onClick={() => setDraftLogoUrl(undefined)}
              >
                {t('workspaces.removeLogo')}
              </Button>
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
    return (
      <div className="ml-sidebar-section ml-sidebar-section--workspaces ml-sidebar-section--compact">
        <Tooltip title={t('workspaces.compactTooltip')} placement="right">
          <div className="ml-sidebar-compact-mark" aria-label={t('workspaces.compactTooltip')}>
            {t('workspaces.compactMark')}
          </div>
        </Tooltip>
        <div className="ml-sidebar-list ml-sidebar-list--compact-workspaces">
          {compactWorkspaceClusters.map(({ cluster, workspaceNames }) => (
            <Tooltip
              key={cluster.id}
              title={`${cluster.customName || cluster.contextName} · ${workspaceNames.join(', ')}`}
              placement="right"
            >
              <div>
                <FavoriteClusterBox
                  cluster={cluster}
                  active={cluster.id === activeClusterId}
                  compact
                  onActivate={onNavigate}
                  onEdit={onEditCluster}
                />
              </div>
            </Tooltip>
          ))}
        </div>
        <Tooltip title={t('workspaces.newTooltip')} placement="right">
          <button
            type="button"
            className="ml-sidebar-btn ml-sidebar-btn--ghost"
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
    <div className="ml-sidebar-section ml-sidebar-section--workspaces">
      <div className="ml-sidebar-section-label-row">
        <div className="ml-sidebar-section-label">{t('workspaces.title')}</div>
        <Button
          type="text"
          size="small"
          icon={<Icon icon={FolderPlus} variant="detail" />}
          aria-label={t('workspaces.new')}
          onClick={openCreate}
        />
      </div>

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
              <div key={group.id} className="ml-sidebar-workspace">
                <div className="ml-sidebar-workspace__head">
                  <button
                    type="button"
                    className="ml-sidebar-workspace__toggle"
                    onClick={() => void setCollapsed(group.id, !isCollapsed)}
                  >
                    <Icon icon={isCollapsed ? ChevronRight : ChevronDown} variant="micro" />
                    <ClusterAvatar logoUrl={group.logoUrl} name={group.name} size={18} />
                    <Typography.Text strong ellipsis style={{ maxWidth: 120 }}>
                      {group.name}
                    </Typography.Text>
                    <span className="ml-sidebar-workspace__count">{members.length}</span>
                    {group.shortcut && (
                      <Typography.Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                        {formatShortcutBinding(group.shortcut, isMac)}
                      </Typography.Text>
                    )}
                  </button>
                  <Dropdown menu={menu} trigger={['click']}>
                    <button type="button" className="ml-icon-btn" aria-label={t('workspaces.edit')}>
                      <Icon icon={MoreHorizontal} variant="detail" />
                    </button>
                  </Dropdown>
                </div>
                {!isCollapsed && (
                  <div className="ml-sidebar-workspace__list">
                    {members.length === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12, padding: '4px 8px' }}>
                        {t('workspaces.noClusters')}
                      </Typography.Text>
                    ) : (
                      members.map((cluster) => (
                        <FavoriteClusterBox
                          key={`${group.id}-${cluster.id}`}
                          cluster={cluster}
                          active={cluster.id === activeClusterId}
                          onActivate={onNavigate}
                          onEdit={onEditCluster}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editorModal}
    </div>
  )
}
