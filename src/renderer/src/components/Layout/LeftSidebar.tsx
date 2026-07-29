import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Tooltip } from 'antd'
import { ChevronDown, ChevronLeft, ChevronRight, Layers, Network, Settings, Sparkles, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import logo from '../../assets/logo.png'
import { useClusterStore, type ClusterEntry } from '../../stores/clusterStore'
import { useVpnStore } from '../../stores/vpnStore'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { resolveUserScope, favoritesExpandedKey, favoritesHeightKey, workspacesExpandedKey } from '../../workspace'
import { applyClusterFilterAndSearch } from '../../clusterFilter'
import { ClusterSearchInput } from '../ClusterTabs/ClusterSearchInput'
import { FavoriteClusterBox } from '../ClusterTabs/FavoriteClusterBox'
import { EditClusterModal } from '../ClusterTabs/EditClusterModal'
import { SidebarWorkspaces } from './SidebarWorkspaces'
import { Icon } from '../ui/Icon'

const COLLAPSED_WIDTH = 72
const EXPANDED_WIDTH = 236
const DEFAULT_FAVORITES_HEIGHT = 184
const MIN_FAVORITES_HEIGHT = 96
const MAX_FAVORITES_HEIGHT = 480
const IS_MAC = navigator.platform.includes('Mac')

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

function loadFavoritesExpanded(scope: string): boolean {
  try {
    const raw = localStorage.getItem(favoritesExpandedKey(scope))
    if (raw === null) return true
    return raw !== '0' && raw !== 'false'
  } catch {
    return true
  }
}

function loadWorkspacesExpanded(scope: string): boolean {
  try {
    const raw = localStorage.getItem(workspacesExpandedKey(scope))
    if (raw === null) return true
    return raw !== '0' && raw !== 'false'
  } catch {
    return true
  }
}

export function LeftSidebar({ variant = 'inline', onNavigate }: LeftSidebarProps): React.JSX.Element {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const activeView = useClusterStore((s) => s.activeView)
  const storedCollapsed = useClusterStore((s) => s.leftSidebarCollapsed)
  const setCollapsed = useClusterStore((s) => s.setLeftSidebarCollapsed)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const showFavoritesSection = useDisplaySettingsStore((s) => s.showFavoritesSection)
  const showWorkspacesSection = useDisplaySettingsStore((s) => s.showWorkspacesSection)
  const vpnStatus = useVpnStore((s) => s.status)
  const vpnProfiles = useVpnStore((s) => s.profiles)
  const clusterVpnLinks = useClusterVpnStore((s) => s.links)
  const userScope = resolveUserScope(null, true)
  const isDrawer = variant === 'drawer'
  const collapsed = isDrawer ? false : storedCollapsed

  const [favoriteSearch, setFavoriteSearch] = useState('')
  const [favoritesHeight, setFavoritesHeight] = useState(() => loadFavoritesHeight(userScope))
  const [favoritesExpanded, setFavoritesExpanded] = useState(() => loadFavoritesExpanded(userScope))
  const [workspacesExpanded, setWorkspacesExpanded] = useState(() => loadWorkspacesExpanded(userScope))
  const [editingCluster, setEditingCluster] = useState<ClusterEntry | null>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const favorites = useMemo(
    () => applyClusterFilterAndSearch(clusters, 'favorites', collapsed ? '' : favoriteSearch),
    [clusters, favoriteSearch, collapsed]
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

  useEffect(() => {
    setFavoritesHeight(loadFavoritesHeight(userScope))
    setFavoritesExpanded(loadFavoritesExpanded(userScope))
    setWorkspacesExpanded(loadWorkspacesExpanded(userScope))
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

  useEffect(() => {
    try {
      localStorage.setItem(favoritesExpandedKey(userScope), favoritesExpanded ? '1' : '0')
    } catch {
      // ignore
    }
  }, [favoritesExpanded, userScope])

  useEffect(() => {
    try {
      localStorage.setItem(workspacesExpandedKey(userScope), workspacesExpanded ? '1' : '0')
    } catch {
      // ignore
    }
  }, [workspacesExpanded, userScope])

  function startResize(e: React.MouseEvent): void {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startHeight: favoritesHeight }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeEnd)
  }

  const width = isDrawer ? '100%' : collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
  const favoritesBodyOpen = favoritesExpanded
  const showFavoritesInRail = showFavoritesSection && (!collapsed || favoritesExpanded)
  const showWorkspacesInRail = showWorkspacesSection && (!collapsed || workspacesExpanded)

  useEffect(() => {
    if (isDrawer) return
    const px = `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`
    document.documentElement.style.setProperty('--ml-left-sidebar-width', px)
    return () => {
      document.documentElement.style.removeProperty('--ml-left-sidebar-width')
    }
  }, [collapsed, isDrawer])

  return (
    <motion.aside
      className={`ml-sidebar${collapsed ? ' ml-sidebar--collapsed' : ''}${isDrawer ? ' ml-sidebar--drawer' : ''}`}
      animate={{ width }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ width }}
    >
      <div
        className={`ml-sidebar-brand titlebar-drag-region${
          !collapsed && IS_MAC && !isDrawer ? ' ml-sidebar-brand--traffic' : ''
        }`}
      >
        <div className="ml-sidebar-brand__mark titlebar-no-drag">
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
      </div>

      <div className="ml-sidebar-actions titlebar-no-drag">
        <div
          className={`ml-sidebar-hub${collapsed ? ' ml-sidebar-hub--collapsed' : ''}`}
          role="tablist"
          aria-label="Navigation"
        >
          {(() => {
            const clustersBtn = (
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'clusters'}
                className={`ml-sidebar-hub-btn${activeView === 'clusters' ? ' ml-sidebar-hub-btn--active' : ''}`}
                onClick={() => handleNavigate(() => setActiveView('clusters'))}
              >
                <span className="ml-sidebar-hub-btn-icon">
                  <Icon icon={Layers} variant="action" />
                </span>
                {!collapsed && (
                  <span className="ml-sidebar-hub-btn-text">
                    <span className="ml-sidebar-hub-btn-title">{t('common.clusters')}</span>
                  </span>
                )}
              </button>
            )
            return collapsed ? (
              <Tooltip title={t('chrome.manageClusters')} placement="right" arrow={false}>
                {clustersBtn}
              </Tooltip>
            ) : (
              clustersBtn
            )
          })()}

          {(() => {
            const vpnBtn = (
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'vpn'}
                className={`ml-sidebar-hub-btn${activeView === 'vpn' ? ' ml-sidebar-hub-btn--active' : ''}${
                  vpnConnected
                    ? ' ml-sidebar-hub-btn--vpn-connected'
                    : vpnConnecting
                      ? ' ml-sidebar-hub-btn--vpn-connecting'
                      : ''
                }`}
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
                    <span className="ml-sidebar-hub-btn-title">{t('common.vpn')}</span>
                  </span>
                )}
              </button>
            )
            const vpnTitle = vpnConnected
              ? t('chrome.vpnConnected', { name: displayProfile?.name ?? 'VPN' })
              : vpnConnecting
                ? t('chrome.vpnConnecting', { name: displayProfile?.name ?? 'VPN' })
                : t('chrome.vpnTooltip')
            return (
              <Tooltip title={vpnTitle} placement="right" arrow={false}>
                {vpnBtn}
              </Tooltip>
            )
          })()}

          {(() => {
            const notesBtn = (
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'notes'}
                className={`ml-sidebar-hub-btn${activeView === 'notes' ? ' ml-sidebar-hub-btn--active' : ''}`}
                onClick={() => handleNavigate(() => setActiveView('notes'))}
              >
                <span className="ml-sidebar-hub-btn-icon">
                  <Icon icon={Sparkles} variant="action" />
                </span>
                {!collapsed && (
                  <span className="ml-sidebar-hub-btn-text">
                    <span className="ml-sidebar-hub-btn-title">{t('common.notes')}</span>
                  </span>
                )}
              </button>
            )
            return collapsed ? (
              <Tooltip title={t('chrome.notesTooltip')} placement="right" arrow={false}>
                {notesBtn}
              </Tooltip>
            ) : (
              notesBtn
            )
          })()}
        </div>
      </div>

      {showFavoritesInRail ? (
        <div
          className={`ml-sidebar-section ml-sidebar-section--favorites${
            favoritesExpanded ? '' : ' ml-sidebar-section--favorites-collapsed'
          }`}
          style={
            collapsed
              ? undefined
              : favoritesExpanded
                ? { height: favoritesHeight, flex: 'none' }
                : { height: 'auto', flex: 'none' }
          }
        >
          {!collapsed && (
            <div className="ml-sidebar-section-chrome ml-sidebar-section-chrome--rich">
              <button
                type="button"
                className="ml-sidebar-section-chrome__toggle"
                aria-expanded={favoritesExpanded}
                onClick={() => setFavoritesExpanded((open) => !open)}
              >
                <Icon icon={favoritesExpanded ? ChevronDown : ChevronRight} variant="micro" />
                <span className="ml-sidebar-section-chrome__glyph" aria-hidden>
                  <Icon icon={Star} variant="micro" />
                </span>
                <span className="ml-sidebar-section-chrome__copy">
                  <span className="ml-sidebar-section-chrome__label">{t('common.favorites')}</span>
                </span>
              </button>
              <span className="ml-sidebar-section-chrome__action-slot" aria-hidden />
              <span className="ml-sidebar-section-chrome__count">{favorites.length}</span>
            </div>
          )}
          {favoritesBodyOpen && (
            <>
              {!collapsed && (
                <div className="ml-sidebar-search">
                  <ClusterSearchInput
                    value={favoriteSearch}
                    onChange={setFavoriteSearch}
                    placeholder={t('chrome.searchFavorites')}
                    size="small"
                  />
                </div>
              )}
              <div className="ml-sidebar-list">
                {favorites.length === 0 ? (
                  !collapsed && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span className="ml-sidebar-empty">{t('chrome.noFavoriteClusters')}</span>
                      }
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
                      onEdit={setEditingCluster}
                    />
                  ))
                )}
              </div>
              {!collapsed && !isDrawer && favoritesExpanded && (
                <div
                  className="ml-sidebar-section-resize"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize favorites section"
                  onMouseDown={startResize}
                />
              )}
            </>
          )}
        </div>
      ) : null}

      {showWorkspacesInRail ? (
        <SidebarWorkspaces
          collapsed={collapsed}
          sectionExpanded={workspacesExpanded}
          onToggleSection={() => setWorkspacesExpanded((open) => !open)}
          onNavigate={onNavigate}
          onEditCluster={setEditingCluster}
        />
      ) : null}

      <div className="ml-sidebar-footer titlebar-no-drag">
        <div className="ml-sidebar-footer__row">
          <Tooltip title={t('common.settings')} placement="right" arrow={false}>
            <button
              type="button"
              className="ml-sidebar-btn ml-sidebar-btn--ghost"
              aria-label={t('common.settings')}
              onClick={() => {
                openSettings()
                onNavigate?.()
              }}
            >
              <Icon icon={Settings} variant="action" />
              {!collapsed ? <span>{t('common.settings')}</span> : null}
            </button>
          </Tooltip>
          {!isDrawer ? (
            <Tooltip
              title={collapsed ? t('chrome.expandSidebar') : t('chrome.collapseSidebar')}
              placement="right"
              arrow={false}
            >
              <button
                type="button"
                className="ml-sidebar-btn ml-sidebar-btn--ghost ml-sidebar-footer__collapse"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? t('chrome.expandSidebar') : t('chrome.collapseSidebar')}
              >
                <Icon icon={collapsed ? ChevronRight : ChevronLeft} variant="action" />
              </button>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <EditClusterModal cluster={editingCluster} onClose={() => setEditingCluster(null)} />
    </motion.aside>
  )
}
