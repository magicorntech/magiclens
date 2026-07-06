import { useMemo, useState } from 'react'
import { Button, Divider, Empty, Menu, Typography } from 'antd'
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
      style={{
        width: 240,
        height: '100%',
        background: '#001529',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff'
      }}
    >
      <div className="titlebar-drag-region" style={{ display: 'flex', alignItems: 'center', height: 48 }}>
        {/* Reserves space for the macOS traffic lights so the logo never overlaps them. */}
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
            style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            MagicLens
          </Typography.Text>
        </div>
      </div>

      <div className="titlebar-no-drag" style={{ padding: '8px 16px' }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={() => setAddModalOpen(true)}>
          Add Cluster
        </Button>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectable
        selectedKeys={activeView === 'clusters' ? ['all-clusters'] : []}
        items={[{ key: 'all-clusters', icon: <UnorderedListOutlined />, label: 'All Clusters' }]}
        onClick={() => setActiveView('clusters')}
        style={{ borderRight: 0, background: 'transparent' }}
      />

      <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />

      <div style={{ padding: '0 16px 8px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, textTransform: 'uppercase' }}>
          Favorites
        </Typography.Text>
        <div style={{ margin: '8px 0' }}>
          <ClusterSearchInput value={favoriteSearch} onChange={setFavoriteSearch} placeholder="Search favorites" size="small" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {favorites.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: 'rgba(255,255,255,0.45)' }}>No favorite clusters</span>}
              style={{ marginTop: 16 }}
            />
          ) : (
            favorites.map((cluster) => (
              <FavoriteClusterBox key={cluster.id} cluster={cluster} active={cluster.id === activeClusterId} />
            ))
          )}
        </div>
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />

      <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ThemeToggle />
        <Button icon={<SettingOutlined />} block onClick={() => setSettingsOpen(true)}>
          Settings
        </Button>
      </div>

      <AddClusterModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
