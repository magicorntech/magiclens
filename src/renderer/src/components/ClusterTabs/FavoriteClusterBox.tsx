import { Dropdown, Tag, Tooltip, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, Pencil, Star, Unplug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { disconnectCluster } from '../../clusterConnect'
import { Icon } from '../ui/Icon'
import { ClusterAvatar } from './ClusterAvatar'
import { ClusterVpnBadge } from './ClusterVpnBadge'
import { ConnectionStatusBadge } from '../ResourceTable/ConnectionStatusBadge'

interface FavoriteClusterBoxProps {
  cluster: ClusterEntry
  active: boolean
  compact?: boolean
  onActivate?: () => void
  onEdit?: (cluster: ClusterEntry) => void
}

export function FavoriteClusterBox({
  cluster,
  active,
  compact = false,
  onActivate,
  onEdit
}: FavoriteClusterBoxProps): React.JSX.Element {
  const { t } = useTranslation()
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const toggleFavorite = useClusterStore((s) => s.toggleFavorite)
  const removeCluster = useClusterStore((s) => s.removeCluster)

  const canDisconnect =
    cluster.status === 'connected' || cluster.status === 'connecting' || cluster.status === 'error'

  const menuItems: MenuProps['items'] = [
    { key: 'open', label: t('clusterActions.open') },
    ...(onEdit
      ? [
          {
            key: 'edit',
            label: t('clusterActions.edit'),
            icon: <Icon icon={Pencil} variant="detail" />
          }
        ]
      : []),
    ...(canDisconnect
      ? [
          {
            key: 'disconnect',
            label: t('clusterActions.disconnect'),
            icon: <Icon icon={Unplug} variant="detail" />
          }
        ]
      : []),
    { type: 'divider' },
    {
      key: cluster.isFavorite ? 'unfavorite' : 'favorite',
      label: cluster.isFavorite
        ? t('clusterActions.removeFavorite')
        : t('clusterActions.addFavorite'),
      icon: (
        <Icon
          icon={Star}
          variant="detail"
          fill={cluster.isFavorite ? 'currentColor' : 'none'}
        />
      )
    },
    { key: 'remove', label: t('clusterActions.removeCluster'), danger: true }
  ]

  function handleOpen(): void {
    openClusterTab(cluster.id)
    onActivate?.()
  }

  function handleMenuClick(key: string): void {
    if (key === 'open') handleOpen()
    if (key === 'edit') onEdit?.(cluster)
    if (key === 'disconnect') void disconnectCluster(cluster.id)
    if (key === 'unfavorite' || key === 'favorite') toggleFavorite(cluster.id)
    if (key === 'remove') {
      void disconnectCluster(cluster.id).finally(() => {
        void window.api.clusterStore.remove(cluster.id)
        removeCluster(cluster.id)
      })
    }
  }

  if (compact) {
    return (
      <Dropdown
        menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }}
        trigger={['contextMenu']}
      >
        <Tooltip title={cluster.customName} placement="right">
          <div
            className={`favorite-cluster-row${active ? ' active' : ''}`}
            onClick={handleOpen}
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
      onClick={handleOpen}
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
        <Typography.Text
          ellipsis
          style={{
            display: 'block',
            color: 'var(--ml-sidebar-text)',
            fontSize: 13,
            lineHeight: '18px'
          }}
        >
          {cluster.customName}
        </Typography.Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
          <ConnectionStatusBadge status={cluster.status} errorMessage={cluster.errorMessage} compact />
          <ClusterVpnBadge clusterId={cluster.id} compact />
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
      <Dropdown menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key) }} trigger={['click']}>
        <span
          className="favorite-cluster-row-menu"
          style={{ color: 'var(--ml-sidebar-muted)', flexShrink: 0, padding: 4, display: 'inline-flex' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon={MoreHorizontal} variant="detail" />
        </span>
      </Dropdown>
    </div>
  )
}
