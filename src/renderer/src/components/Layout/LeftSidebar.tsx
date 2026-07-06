import { useMemo, useState } from 'react'
import { Button, Divider, Empty, Tooltip, Typography } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import logo from '../../assets/logo.png'
import { useClusterStore } from '../../stores/clusterStore'
import { applyClusterFilterAndSearch } from '../../clusterFilter'
import { AddClusterModal } from '../ClusterTabs/AddClusterModal'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { ThemeToggle } from './ThemeToggle'
import { SettingsModal } from './SettingsModal'

const COLLAPSED_WIDTH = 56
const EXPANDED_WIDTH = 240

export function LeftSidebar(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const activeView = useClusterStore((s) => s.activeView)
  const collapsed = useClusterStore((s) => s.leftSidebarCollapsed)
  const setCollapsed = useClusterStore((s) => s.setLeftSidebarCollapsed)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [favoriteSearch, setFavoriteSearch] = useState('')

  const favorites = useMemo(
    () => applyClusterFilterAndSearch(clusters, 'favorites', collapsed ? '' : favoriteSearch),
    [clusters, favoriteSearch, collapsed]
  )

  return (
    <div
      className="left-sidebar"
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        height: '100%',
        background: 'var(--ml-sidebar-bg)',
        borderRight: '1px solid var(--ml-sidebar-divider)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--ml-sidebar-text)',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      <div className="titlebar-drag-region" style={{ display: 'flex', alignItems: 'center', height: 48, flexShrink: 0 }}>
        {!collapsed && <div style={{ width: 76, flexShrink: 0 }} />}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <img src={logo} alt="MagicLens" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
          {!collapsed && (
            <Typography.Text
              style={{
                color: 'var(--ml-sidebar-text)',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              MagicLens
            </Typography.Text>
          )}
        </div>
      </div>

      <div
        className="titlebar-no-drag"
        style={{
          padding: collapsed ? '8px 6px' : '10px 10px',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          gap: 6,
          overflow: 'hidden'
        }}
      >
        <Tooltip title="Add Cluster" placement="right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            block={!collapsed}
            style={collapsed ? { width: '100%' } : { flex: '1 1 0', minWidth: 0, paddingInline: 6 }}
            onClick={() => setAddModalOpen(true)}
          >
            {!collapsed && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Add Cluster</span>
            )}
          </Button>
        </Tooltip>
        <Tooltip title="All Clusters" placement="right">
          <Button
            type={activeView === 'clusters' ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            size="small"
            block={!collapsed}
            className={activeView !== 'clusters' ? 'sidebar-action-btn' : undefined}
            style={collapsed ? { width: '100%' } : { flex: '1 1 0', minWidth: 0, paddingInline: 6 }}
            onClick={() => setActiveView('clusters')}
          >
            {!collapsed && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>All Clusters</span>
            )}
          </Button>
        </Tooltip>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Divider style={{ borderColor: 'var(--ml-sidebar-divider)', margin: '4px 0' }} />

        <div
          style={{
            padding: collapsed ? '0 6px 8px' : '0 16px 8px',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {!collapsed && (
            <>
              <Typography.Text
                style={{
                  color: 'var(--ml-sidebar-muted)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Favorites
              </Typography.Text>
              <div className="sidebar-search" style={{ margin: '8px 0' }}>
                <ClusterSearchInput
                  value={favoriteSearch}
                  onChange={setFavoriteSearch}
                  placeholder="Search favorites"
                  size="small"
                />
              </div>
            </>
          )}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {favorites.length === 0 ? (
              !collapsed && (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span style={{ color: 'var(--ml-sidebar-subtle)' }}>No favorite clusters</span>}
                  style={{ marginTop: 16 }}
                />
              )
            ) : (
              favorites.map((cluster) => (
                <FavoriteClusterBox
                  key={cluster.id}
                  cluster={cluster}
                  active={cluster.id === activeClusterId}
                  compact={collapsed}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          <Divider style={{ borderColor: 'var(--ml-sidebar-divider)', margin: '4px 0' }} />

          <div
            className="titlebar-no-drag"
            style={{
              padding: collapsed ? '8px 6px' : '8px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {!collapsed && (
              <div className="sidebar-segmented">
                <ThemeToggle />
              </div>
            )}
            <Tooltip title="Settings" placement="right">
              <Button
                icon={<SettingOutlined />}
                block
                className="sidebar-action-btn"
                onClick={() => setSettingsOpen(true)}
              >
                {!collapsed && 'Settings'}
              </Button>
            </Tooltip>
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                block
                className="sidebar-action-btn"
                onClick={() => setCollapsed(!collapsed)}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      <AddClusterModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
