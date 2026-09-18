import { Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, Pencil, Star, Unplug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNamespaceSelectionLabel, isAllNamespaces } from '@shared/namespaceSelection'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { disconnectCluster } from '../../clusterConnect'
import { Icon } from '../ui/Icon'
import { ClusterAvatar } from './ClusterAvatar'
import { ClusterVpnBadge } from './ClusterVpnBadge'
import { ConnectionStatusBadge } from '../ResourceTable/ConnectionStatusBadge'

interface FavoriteClusterBoxProps {
  cluster: ClusterEntry
  active: boolean
  compact?: boolean
  /** Nested under a workspace — slightly denser + indented. */
  nested?: boolean
  /** The owning workspace's accent, when it has one — see ClusterAvatar. */
  accentColor?: string
  /**
   * The owning workspace's own logo, used when this cluster has none of its own. Individual
   * clusters are usually auto-discovered from a kubeconfig and never get a logo assigned
   * directly — only the workspace does, via the editor — so without this every cluster nested
   * under a nicely-branded workspace still fell back to a generic letter tile, even right below
   * that workspace's own logo.
   */
  fallbackLogoUrl?: string
  /** Override compact-mode tooltip (defaults to cluster name). */
  tooltipTitle?: string
  onActivate?: () => void
  onEdit?: (cluster: ClusterEntry) => void
}

export function FavoriteClusterBox({
  cluster,
  active,
  compact = false,
  nested = false,
  accentColor,
  fallbackLogoUrl,
  tooltipTitle,
  onActivate,
  onEdit
}: FavoriteClusterBoxProps): React.JSX.Element {
  const { t } = useTranslation()
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const toggleFavorite = useClusterStore((s) => s.toggleFavorite)
  const removeCluster = useClusterStore((s) => s.removeCluster)
  const showClusterNamespace = useDisplaySettingsStore((s) => s.showClusterNamespace)
  const isOpen = active || openedTabs.includes(cluster.id)

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

  function handleMenuClick(info: Parameters<NonNullable<MenuProps['onClick']>>[0]): void {
    info.domEvent.stopPropagation()
    info.domEvent.preventDefault()
    const key = String(info.key)
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

  const statusClass =
    cluster.status === 'connected'
      ? 'is-connected'
      : cluster.status === 'connecting'
        ? 'is-connecting'
        : cluster.status === 'error'
          ? 'is-error'
          : 'is-idle'
  /** Connected + open tab — green session cue in favorites / workspaces. */
  const sessionLive = cluster.status === 'connected' && isOpen

  if (compact) {
    return (
      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        trigger={['contextMenu']}
      >
        <Tooltip
          title={tooltipTitle ?? cluster.customName}
          placement="right"
          arrow={false}
          mouseEnterDelay={0.35}
        >
          <button
            type="button"
            className={`ml-nav-item ml-nav-item--compact${active ? ' is-active' : ''}${sessionLive ? ' is-session-live' : ''} ${statusClass}`}
            onClick={handleOpen}
            aria-label={cluster.customName}
          >
            <span className="ml-nav-item__avatar-wrap">
              <ClusterAvatar
                logoUrl={cluster.logoUrl}
                fallbackLogoUrl={fallbackLogoUrl}
                name={cluster.customName}
                contextName={cluster.contextName}
                endpoint={cluster.endpoint}
                size={28}
                accentColor={accentColor}
              />
              <span className="ml-nav-item__status-dot" aria-hidden />
            </span>
          </button>
        </Tooltip>
      </Dropdown>
    )
  }

  const ns =
    showClusterNamespace &&
    cluster.selectedNamespace &&
    !isAllNamespaces(cluster.selectedNamespace)
      ? formatNamespaceSelectionLabel(cluster.selectedNamespace, t('common.allNamespaces'))
      : null

  return (
    <div
      className={`ml-nav-item${active ? ' is-active' : ''}${nested ? ' ml-nav-item--nested' : ''}${sessionLive ? ' is-session-live' : ''} ${statusClass}`}
    >
      <button
        type="button"
        className="ml-nav-item__open"
        onClick={handleOpen}
        aria-label={cluster.customName}
      >
        <span className="ml-nav-item__avatar-wrap">
          <ClusterAvatar
            logoUrl={cluster.logoUrl}
            fallbackLogoUrl={fallbackLogoUrl}
            name={cluster.customName}
            contextName={cluster.contextName}
            endpoint={cluster.endpoint}
            // Nested matches the workspace header's own avatar (also 20px) rather than its own
            // slightly-larger size — the two sit in the same tight vertical stack, often
            // showing the same logo repeated, so a couple of px between them read as a visible
            // mismatch rather than an intentional hierarchy cue. The reference pattern this
            // list mirrors (ResourceMenu) uses one icon size for a section and its children too.
            size={nested ? 20 : 26}
            accentColor={accentColor}
          />
          <span className="ml-nav-item__status-dot" aria-hidden />
        </span>
        <div className="ml-nav-item__body">
          <span className="ml-nav-item__title">{cluster.customName}</span>
          <span className="ml-nav-item__meta">
            <ConnectionStatusBadge status={cluster.status} errorMessage={cluster.errorMessage} compact />
            <ClusterVpnBadge clusterId={cluster.id} compact />
            {ns ? <span className="ml-nav-item__chip">{ns}</span> : null}
          </span>
        </div>
      </button>
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
        <button
          type="button"
          className="ml-nav-item__menu"
          aria-label={t('clusterActions.edit')}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon={MoreHorizontal} variant="detail" />
        </button>
      </Dropdown>
    </div>
  )
}
