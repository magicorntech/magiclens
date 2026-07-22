import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Tooltip } from 'antd'
import { ChevronLeft, ChevronRight, Layers, Network, Shield, UserRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/logo.png'
import { useClusterStore } from '../../stores/clusterStore'
import { useAuthStore } from '../../stores/authStore'
import { useVpnStore } from '../../stores/vpnStore'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { resolveUserScope, favoritesHeightKey } from '../../workspace'
import { applyClusterFilterAndSearch } from '../../clusterFilter'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { Icon } from '../ui/Icon'

const COLLAPSED_WIDTH = 60
const EXPANDED_WIDTH = 252
const DEFAULT_FAVORITES_HEIGHT = 220
const MIN_FAVORITES_HEIGHT = 100
const MAX_FAVORITES_HEIGHT = 520

interface LeftSidebarProps {
  variant?: 'inline' | 'drawer'
  onNavigate?: () => void
}

function loadFavoritesHeight(scope: string): number {
  try {
    const raw = localStorage.getItem(favoritesHeightKey(scope))
    const n = raw ? parseInt(raw, 10) : DEFAULT_FAVORITES_HEIGHT
    return Number.isFinite(n) ? Math.min(MAX_FAVORITES_HEIGHT, Math.max(MIN_FAVORITES_HEIGHT, n)) : DEFAULT_FAVORITES_HEIGHT
  } catch {
    return DEFAULT_FAVORITES_HEIGHT
  }
}

export function LeftSidebar({ variant = 'inline', onNavigate }: LeftSidebarProps): React.JSX.Element {
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const activeView = useClusterStore((s) => s.activeView)
  const storedCollapsed = useClusterStore((s) => s.leftSidebarCollapsed)
  const setCollapsed = useClusterStore((s) => s.setLeftSidebarCollapsed)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const me = useAuthStore((s) => s.me)
  const offlineMode = useAuthStore((s) => s.offlineMode)
  const vpnStatus = useVpnStore((s) => s.status)
  const vpnProfiles = useVpnStore((s) => s.profiles)
  const clusterVpnLinks = useClusterVpnStore((s) => s.links)
  const requireLogin = useAuthStore((s) => s.requireLogin)
  const userScope = resolveUserScope(me, offlineMode)
  const isDrawer = variant === 'drawer'
  const collapsed = isDrawer ? false : storedCollapsed

  const [favoriteSearch, setFavoriteSearch] = useState('')
  const [favoritesHeight, setFavoritesHeight] = useState(() => loadFavoritesHeight(userScope))
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const favorites = useMemo(
    () => applyClusterFilterAndSearch(clusters, 'favorites', collapsed ? '' : favoriteSearch),
    [clusters, favoriteSearch, collapsed]
  )

  const connectedCount = useMemo(
    () => clusters.filter((c) => c.status === 'connected').length,
    [clusters]
  )

  const contextVpnId =
    activeView === 'tabs' && activeClusterId ? clusterVpnLinks[activeClusterId] : undefined
  const displayVpnId = contextVpnId ?? vpnStatus?.activeProfileId
  const displayProfile = vpnProfiles.find((p) => p.id === displayVpnId)

  const vpnConnected = displayVpnId
    ? (vpnStatus?.connectedProfileIds?.includes(displayVpnId) ?? false) ||
      (vpnStatus?.activeProfileId === displayVpnId && vpnStatus?.status === 'connected')
    : vpnStatus?.status === 'connected'
  const vpnConnecting =
    vpnStatus?.activeProfileId === displayVpnId && vpnStatus?.status === 'connecting'
  const vpnError = vpnStatus?.status === 'error' && vpnStatus.activeProfileId === displayVpnId
  const vpnMeta = displayProfile
    ? vpnConnected
      ? displayProfile.name
      : vpnConnecting
        ? `${displayProfile.name} · Connecting…`
        : vpnError
          ? vpnStatus?.message ?? 'Error'
          : displayProfile.name
    : vpnStatus?.status === 'connected'
      ? vpnProfiles.find((p) => p.id === vpnStatus.activeProfileId)?.name ?? 'Connected'
      : vpnStatus?.status === 'connecting'
        ? 'Connecting…'
        : vpnStatus?.status === 'error'
          ? vpnStatus?.message ?? 'Error'
          : 'Disconnected'

  useEffect(() => {
    setFavoritesHeight(loadFavoritesHeight(userScope))
  }, [userScope])

  function handleNavigate(action: () => void): void {
    action()
    onNavigate?.()
  }

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return
    const delta = e.clientY - dragRef.current.startY
    const next = Math.min(
      MAX_FAVORITES_HEIGHT,
      Math.max(MIN_FAVORITES_HEIGHT, dragRef.current.startHeight + delta)
    )
    setFavoritesHeight(next)
  }, [])

  const onResizeEnd = useCallback(() => {
    dragRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', onResizeEnd)
  }, [onResizeMove])

  useEffect(() => {
    try {
      localStorage.setItem(favoritesHeightKey(userScope), String(favoritesHeight))
    } catch {
      // ignore
    }
  }, [favoritesHeight, userScope])

  function startResize(e: React.MouseEvent): void {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startHeight: favoritesHeight }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeEnd)
  }

  const width = isDrawer ? '100%' : collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  return (
    <motion.aside
      className={`ml-sidebar${collapsed ? ' ml-sidebar--collapsed' : ''}${isDrawer ? ' ml-sidebar--drawer' : ''}`}
      animate={{ width }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ width }}
    >
      <div className="ml-sidebar-brand titlebar-drag-region">
        {!collapsed && <div className="ml-sidebar-traffic-spacer" />}
        <img src={logo} alt="" className="ml-sidebar-logo" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              className="ml-sidebar-brand-text"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
            >
              MagicLens
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-sidebar-actions titlebar-no-drag">
        <Tooltip title="Manage clusters" placement="right">
          <button
            type="button"
            className={`ml-sidebar-hub-btn${activeView === 'clusters' ? ' ml-sidebar-hub-btn--active' : ''}`}
            onClick={() => handleNavigate(() => setActiveView('clusters'))}
          >
            <span className="ml-sidebar-hub-btn-icon">
              <Icon icon={Layers} variant="action" />
            </span>
            {!collapsed && (
              <span className="ml-sidebar-hub-btn-text">
                <span className="ml-sidebar-hub-btn-title">Clusters</span>
                <span className="ml-sidebar-hub-btn-meta">
                  {clusters.length} total · {connectedCount} connected
                </span>
              </span>
            )}
            {!collapsed && clusters.length > 0 && (
              <span className="ml-sidebar-hub-btn-badge">{clusters.length}</span>
            )}
          </button>
        </Tooltip>

        <Tooltip
          title={
            vpnConnected
              ? `Connected · ${displayProfile?.name ?? 'VPN'}`
              : vpnConnecting
                ? `Connecting · ${displayProfile?.name ?? 'VPN'}`
                : 'VPN profiles (OpenVPN, Pritunl, WireGuard)'
          }
          placement="right"
        >
          <button
            type="button"
            className={`ml-sidebar-hub-btn${activeView === 'vpn' ? ' ml-sidebar-hub-btn--active' : ''}`}
            onClick={() => handleNavigate(() => setActiveView('vpn'))}
          >
            <span
              className={`ml-sidebar-hub-btn-icon${
                vpnConnected
                  ? ' ml-sidebar-hub-btn-icon--vpn-connected'
                  : vpnConnecting
                    ? ' ml-sidebar-hub-btn-icon--vpn-connecting'
                    : ''
              }`}
            >
              <Icon icon={Network} variant="action" />
            </span>
            {!collapsed && (
              <span className="ml-sidebar-hub-btn-text">
                <span className="ml-sidebar-hub-btn-title">VPN</span>
                <span className="ml-sidebar-hub-btn-meta">{vpnMeta}</span>
              </span>
            )}
          </button>
        </Tooltip>

        {!me ? (
          <Tooltip title="Sign in to your organization account" placement="right">
            <button
              type="button"
              className="ml-sidebar-hub-btn"
              onClick={() => handleNavigate(() => requireLogin())}
            >
              <span className="ml-sidebar-hub-btn-icon">
                <Icon icon={UserRound} variant="action" />
              </span>
              {!collapsed && (
                <span className="ml-sidebar-hub-btn-text">
                  <span className="ml-sidebar-hub-btn-title">Login</span>
                  <span className="ml-sidebar-hub-btn-meta">
                    {offlineMode ? 'Offline mode' : 'Organization account'}
                  </span>
                </span>
              )}
            </button>
          </Tooltip>
        ) : isAdmin() ? (
          <Tooltip title="Admin Console" placement="right">
            <button
              type="button"
              className={`ml-sidebar-hub-btn${activeView === 'admin' ? ' ml-sidebar-hub-btn--active' : ''}`}
              onClick={() => handleNavigate(() => setActiveView('admin'))}
            >
              <span className="ml-sidebar-hub-btn-icon">
                <Icon icon={Shield} variant="action" />
              </span>
              {!collapsed && (
                <span className="ml-sidebar-hub-btn-text">
                  <span className="ml-sidebar-hub-btn-title">Admin</span>
                  <span className="ml-sidebar-hub-btn-meta">{me.organization?.role ?? 'ADMIN'} access</span>
                </span>
              )}
            </button>
          </Tooltip>
        ) : (
          <Tooltip title="Your assigned clusters and VPN profiles" placement="right">
            <button
              type="button"
              className={`ml-sidebar-hub-btn${activeView === 'profile' ? ' ml-sidebar-hub-btn--active' : ''}`}
              onClick={() => handleNavigate(() => setActiveView('profile'))}
            >
              <span className="ml-sidebar-hub-btn-icon">
                <Icon icon={UserRound} variant="action" />
              </span>
              {!collapsed && (
                <span className="ml-sidebar-hub-btn-text">
                  <span className="ml-sidebar-hub-btn-title">Profile</span>
                  <span className="ml-sidebar-hub-btn-meta">{me.organization?.role ?? 'Member'}</span>
                </span>
              )}
            </button>
          </Tooltip>
        )}
      </div>

      <div
        className="ml-sidebar-section"
        style={collapsed ? undefined : { height: favoritesHeight, flex: 'none' }}
      >
        {!collapsed && <div className="ml-sidebar-section-label">Favorites</div>}
        {!collapsed && (
          <div className="ml-sidebar-search">
            <ClusterSearchInput
              value={favoriteSearch}
              onChange={setFavoriteSearch}
              placeholder="Search favorites"
              size="small"
            />
          </div>
        )}
        <div className="ml-sidebar-list">
          {favorites.length === 0 ? (
            !collapsed && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className="ml-sidebar-empty">No favorite clusters</span>}
              />
            )
          ) : (
            favorites.map((cluster) => (
              <FavoriteClusterBox
                key={cluster.id}
                cluster={cluster}
                active={cluster.id === activeClusterId}
                compact={collapsed}
                onActivate={onNavigate}
              />
            ))
          )}
        </div>
        {!collapsed && !isDrawer && (
          <div
            className="ml-sidebar-section-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize favorites section"
            onMouseDown={startResize}
          />
        )}
      </div>

      <div className="ml-sidebar-footer titlebar-no-drag">
        {!isDrawer && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <button type="button" className="ml-sidebar-btn ml-sidebar-btn--ghost" onClick={() => setCollapsed(!collapsed)}>
              <Icon icon={collapsed ? ChevronRight : ChevronLeft} variant="action" />
            </button>
          </Tooltip>
        )}
      </div>
    </motion.aside>
  )
}
