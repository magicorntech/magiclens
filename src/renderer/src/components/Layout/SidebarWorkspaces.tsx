import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Select, Typography, message } from 'antd'
import { ChevronDown, ChevronRight, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { useClusterStore } from '../../stores/clusterStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { Icon } from '../ui/Icon'
import type { ClusterEntry } from '../../stores/clusterStore'

interface SidebarWorkspacesProps {
  collapsed: boolean
  onNavigate?: () => void
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query)
}

export function SidebarWorkspaces({ collapsed, onNavigate }: SidebarWorkspacesProps): React.JSX.Element {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const groups = useClusterGroupsStore((s) => s.groups)
  const createGroup = useClusterGroupsStore((s) => s.createGroup)
  const renameGroup = useClusterGroupsStore((s) => s.renameGroup)
  const removeGroup = useClusterGroupsStore((s) => s.removeGroup)
  const setCollapsed = useClusterGroupsStore((s) => s.setCollapsed)
  const setGroupClusters = useClusterGroupsStore((s) => s.setGroupClusters)

  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftClusterIds, setDraftClusterIds] = useState<string[]>([])

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

  function openCreate(): void {
    setEditingId(null)
    setDraftName('Workspace')
    setDraftClusterIds([])
    setEditorOpen(true)
  }

  function openEdit(id: string): void {
    const g = groups.find((x) => x.id === id)
    if (!g) return
    setEditingId(id)
    setDraftName(g.name)
    setDraftClusterIds([...g.clusterIds])
    setEditorOpen(true)
  }

  async function saveEditor(): Promise<void> {
    const name = draftName.trim() || 'Workspace'
    if (editingId) {
      await renameGroup(editingId, name)
      await setGroupClusters(editingId, draftClusterIds)
      message.success('Workspace updated')
    } else {
      await createGroup(name, draftClusterIds)
      message.success('Workspace created')
    }
    setEditorOpen(false)
  }

  if (collapsed) {
    return (
      <div className="ml-sidebar-section ml-sidebar-section--workspaces ml-sidebar-section--compact">
        <button
          type="button"
          className="ml-sidebar-btn ml-sidebar-btn--ghost"
          aria-label="New workspace"
          onClick={openCreate}
        >
          <Icon icon={FolderPlus} variant="action" />
        </button>
      </div>
    )
  }

  return (
    <div className="ml-sidebar-section ml-sidebar-section--workspaces">
      <div className="ml-sidebar-section-label-row">
        <div className="ml-sidebar-section-label">Workspaces</div>
        <Button
          type="text"
          size="small"
          icon={<Icon icon={FolderPlus} variant="detail" />}
          aria-label="New workspace"
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
          description={<span className="ml-sidebar-empty">Group clusters into workspaces</span>}
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
                  label: 'Edit workspace',
                  onClick: () => openEdit(group.id)
                },
                {
                  key: 'delete',
                  danger: true,
                  icon: <Icon icon={Trash2} variant="detail" />,
                  label: 'Delete workspace',
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
                    <Typography.Text strong ellipsis style={{ maxWidth: 140 }}>
                      {group.name}
                    </Typography.Text>
                    <span className="ml-sidebar-workspace__count">{members.length}</span>
                  </button>
                  <Dropdown menu={menu} trigger={['click']}>
                    <button type="button" className="ml-icon-btn" aria-label="Workspace actions">
                      <Icon icon={MoreHorizontal} variant="detail" />
                    </button>
                  </Dropdown>
                </div>
                {!isCollapsed && (
                  <div className="ml-sidebar-workspace__list">
                    {members.length === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12, padding: '4px 8px' }}>
                        No clusters yet — edit workspace to add some.
                      </Typography.Text>
                    ) : (
                      members.map((cluster) => (
                        <FavoriteClusterBox
                          key={`${group.id}-${cluster.id}`}
                          cluster={cluster}
                          active={cluster.id === activeClusterId}
                          onActivate={onNavigate}
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

      <Modal
        title={editingId ? 'Edit workspace' : 'New workspace'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={() => void saveEditor()}
        okText="Save"
        destroyOnClose
      >
        <Typography.Text strong>Name</Typography.Text>
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Production"
          style={{ marginTop: 8, marginBottom: 16 }}
        />
        <Typography.Text strong>Clusters</Typography.Text>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%', marginTop: 8 }}
          placeholder="Select clusters for this workspace"
          value={draftClusterIds}
          options={clusterOptions}
          onChange={setDraftClusterIds}
          optionFilterProp="label"
        />
      </Modal>
    </div>
  )
}
