import { Dropdown, Tag, Tooltip, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined, StarFilled } from '@ant-design/icons'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterAvatar } from './ClusterAvatar'
import { ConnectionStatusBadge } from '../ResourceTable/ConnectionStatusBadge'

interface FavoriteClusterBoxProps {
  cluster: ClusterEntry
  active: boolean
  compact?: boolean
}

export function FavoriteClusterBox({ cluster, active, compact = false }: FavoriteClusterBoxProps): React.JSX.Element {
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const toggleFavorite = useClusterStore((s) => s.toggleFavorite)
  const removeCluster = useClusterStore((s) => s.removeCluster)

  const menuItems: MenuProps['items'] = [
    { key: 'open', label: 'Open' },
    { key: 'unfavorite', label: 'Remove from favorites', icon: <StarFilled /> },
    { key: 'remove', label: 'Remove cluster', danger: true }
  ]

  function handleMenuClick(key: string): void {
    if (key === 'open') openClusterTab(cluster.id)
    if (key === 'unfavorite') toggleFavorite(cluster.id)
    if (key === 'remove') {
      void window.api.cluster.disconnect({ clusterId: cluster.id })
      void window.api.clusterStore.remove(cluster.id)
      removeCluster(cluster.id)
    }
  }

  if (compact) {
    return (
      <Dropdown menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }} trigger={['contextMenu']}>
        <Tooltip title={cluster.customName} placement="right">
          <div
            className={`favorite-cluster-row${active ? ' active' : ''}`}
            onClick={() => openClusterTab(cluster.id)}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '6px 4px',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            <ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={28} />
          </div>
        </Tooltip>
      </Dropdown>
    )
  }

  return (
    <div
      className={`favorite-cluster-row${active ? ' active' : ''}`}
      onClick={() => openClusterTab(cluster.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 6px 6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        minWidth: 0
      }}
    >
      <ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text ellipsis style={{ display: 'block', color: 'var(--ml-sidebar-text)', fontSize: 13, lineHeight: '18px' }}>
          {cluster.customName}
        </Typography.Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
          <ConnectionStatusBadge status={cluster.status} errorMessage={cluster.errorMessage} compact />
          {cluster.selectedNamespace && cluster.selectedNamespace !== 'ALL' && (
            <Tag
              style={{
                fontSize: 10,
                lineHeight: '14px',
                padding: '0 4px',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 80
              }}
            >
              {cluster.selectedNamespace}
            </Tag>
          )}
        </div>
      </div>
      <Dropdown
        menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }}
        trigger={['click']}
      >
        <MoreOutlined
          className="favorite-cluster-row-menu"
          style={{ color: 'var(--ml-sidebar-muted)', flexShrink: 0, padding: 4 }}
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    </div>
  )
}
