import { useMemo, useState } from 'react'
import { Button, Divider, Empty, Typography } from 'antd'
import { PlusOutlined, SettingOutlined, UnorderedListOutlined } from '@ant-design/icons'
import logo from '../../assets/logo.png'
import { useClusterStore } from '../../stores/clusterStore'
import { applyClusterFilterAndSearch } from '../../clusterFilter'
import { AddClusterModal } from '../ClusterTabs/AddClusterModal'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { ThemeToggle } from './ThemeToggle'
import { SettingsModal } from './SettingsModal'

export function LeftSidebar(): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const activeView = useClusterStore((s) => s.activeView)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [favoriteSearch, setFavoriteSearch] = useState('')

  const favorites = useMemo(
    () => applyClusterFilterAndSearch(clusters, 'favorites', favoriteSearch),
    [clusters, favoriteSearch]
  )

  return (
    <div
      className="left-sidebar"
      style={{
        width: 240,
        height: '100%',
        background: 'var(--ml-sidebar-bg)',
        borderRight: '1px solid var(--ml-sidebar-divider)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--ml-sidebar-text)'
      }}
    >
      <div className="titlebar-drag-region" style={{ display: 'flex', alignItems: 'center', height: 48 }}>
        <div style={{ width: 76, flexShrink: 0 }} />
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
        </div>
      </div>

      <div
        className="titlebar-no-drag"
        style={{ padding: '10px 10px', display: 'flex', gap: 6, overflow: 'hidden' }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          style={{ flex: '1 1 0', minWidth: 0, paddingInline: 6 }}
          onClick={() => setAddModalOpen(true)}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Add Cluster</span>
        </Button>
        <Button
          type={activeView === 'clusters' ? 'primary' : 'default'}
          icon={<UnorderedListOutlined />}
          size="small"
          className={activeView !== 'clusters' ? 'sidebar-action-btn' : undefined}
          style={{ flex: '1 1 0', minWidth: 0, paddingInline: 6 }}
          onClick={() => setActiveView('clusters')}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>All Clusters</span>
        </Button>
      </div>

      <Divider style={{ borderColor: 'var(--ml-sidebar-divider)', margin: '4px 0' }} />

      <div style={{ padding: '0 16px 8px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography.Text
          style={{ color: 'var(--ml-sidebar-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Favorites
        </Typography.Text>
        <div className="sidebar-search" style={{ margin: '8px 0' }}>
          <ClusterSearchInput value={favoriteSearch} onChange={setFavoriteSearch} placeholder="Search favorites" size="small" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {favorites.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: 'var(--ml-sidebar-subtle)' }}>No favorite clusters</span>
              }
              style={{ marginTop: 16 }}
            />
          ) : (
            favorites.map((cluster) => (
              <FavoriteClusterBox key={cluster.id} cluster={cluster} active={cluster.id === activeClusterId} />
            ))
          )}
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--ml-sidebar-divider)', margin: '4px 0' }} />

      <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="sidebar-segmented">
          <ThemeToggle />
        </div>
        <Button
          icon={<SettingOutlined />}
          block
          className="sidebar-action-btn"
          onClick={() => setSettingsOpen(true)}
        >
          Settings
        </Button>
      </div>

      <AddClusterModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
