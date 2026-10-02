import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Empty, Tooltip } from 'antd'
import { Box, ChevronDown, ChevronRight, Globe2, PanelLeft, Settings, Sparkles, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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
import { OPEN_CLUSTER_SETTINGS_EVENT } from '../../clusterSettingsEvents'
import type { ClusterSettingsSectionId } from '@shared/types/clusterSettings'
import { SidebarWorkspaces } from './SidebarWorkspaces'
import { Icon } from '../ui/Icon'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import { UpdateAvailableBadge } from '../Update/UpdateAvailableBadge'

const COLLAPSED_WIDTH = 80
const EXPANDED_WIDTH = 236
const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 360
const SIDEBAR_WIDTH_KEY = 'ml.leftSidebarWidth'
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
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const storedCollapsed = useClusterStore((s) => s.leftSidebarCollapsed)
  const setCollapsed = useClusterStore((s) => s.setLeftSidebarCollapsed)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const showFavoritesSection = useDisplaySettingsStore((s) => s.showFavoritesSection)
  const showWorkspacesSection = useDisplaySettingsStore((s) => s.showWorkspacesSection)
  const vpnStatus = useVpnStore((s) => s.status)
  const clusterVpnLinks = useClusterVpnStore((s) => s.links)
  const userScope = resolveUserScope(null, true)
  const isDrawer = variant === 'drawer'
  const collapsed = isDrawer ? false : storedCollapsed
  // Tab strip already clears traffic lights — skip the dead spacer so the hub
  // starts on the same horizontal line as the content under the tab divider.
  const tabStripOwnsTop = activeView === 'tabs' && openedTabs.length > 0
  const showBrandSpacer = !isDrawer && !tabStripOwnsTop
  const { width: expandedWidth, resizing, handleProps } = useResizableDrawerWidth({
    storageKey: SIDEBAR_WIDTH_KEY,
    defaultWidth: EXPANDED_WIDTH,
    minWidth: MIN_SIDEBAR_WIDTH,
    maxWidth: MAX_SIDEBAR_WIDTH,
    maxRatio: 0.36,
    edge: 'left'
  })

  const [favoriteSearch, setFavoriteSearch] = useState('')
  const [favoritesHeight, setFavoritesHeight] = useState(() => loadFavoritesHeight(userScope))
  const [favoritesExpanded, setFavoritesExpanded] = useState(() => loadFavoritesExpanded(userScope))
  const [workspacesExpanded, setWorkspacesExpanded] = useState(() => loadWorkspacesExpanded(userScope))
  const [editingCluster, setEditingCluster] = useState<ClusterEntry | null>(null)
  const [editSection, setEditSection] = useState<ClusterSettingsSectionId | 'appearance' | 'kubeconfig' | undefined>()
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const favorites = useMemo(
    () => applyClusterFilterAndSearch(clusters, 'favorites', collapsed ? '' : favoriteSearch),
    [clusters, favoriteSearch, collapsed]
  )
  const hasFavorites = useMemo(() => clusters.some((c) => c.isFavorite), [clusters])

  // If every star was removed, collapse so a later re-add doesn't reopen a stale "empty" pane.
  useEffect(() => {
    if (!hasFavorites && favoritesExpanded) setFavoritesExpanded(false)
  }, [hasFavorites, favoritesExpanded])

  const contextVpnId =
    activeView === 'tabs' && activeClusterId ? clusterVpnLinks[activeClusterId] : undefined
  const displayVpnId = contextVpnId ?? vpnStatus?.activeProfileId

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

  useEffect(() => {
    function onOpen(event: Event): void {
      const detail = (event as CustomEvent<{ clusterId?: string; section?: string }>).detail
      const found = clusters.find((c) => c.id === detail?.clusterId)
      if (!found) return
      if (detail.section === 'appearance' || detail.section === 'kubeconfig') {
        setEditSection(detail.section)
      } else if (detail.section) {
        setEditSection(detail.section as ClusterSettingsSectionId)
      } else {
        setEditSection('integrations')
      }
      setEditingCluster(found)
    }
    window.addEventListener(OPEN_CLUSTER_SETTINGS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CLUSTER_SETTINGS_EVENT, onOpen)
  }, [clusters])

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

  const width = isDrawer ? '100%' : collapsed ? COLLAPSED_WIDTH : expandedWidth
  const favoritesBodyOpen = favoritesExpanded && hasFavorites
  // Empty Favorites chrome is noise — only show when the setting is on AND there is at least one starred cluster.
  const showFavoritesInRail = showFavoritesSection && hasFavorites
  // Collapsed rail always shows the workspaces dock — `workspacesExpanded` only means
  // "list open" in the full sidebar's collapsible section, not "hide entirely" here.
  const showWorkspacesInRail = showWorkspacesSection

  useLayoutEffect(() => {
    if (isDrawer) return
    const px = `${collapsed ? COLLAPSED_WIDTH : expandedWidth}px`
    document.documentElement.style.setProperty('--ml-left-sidebar-width', px)
    return () => {
      document.documentElement.style.removeProperty('--ml-left-sidebar-width')
    }
  }, [collapsed, isDrawer, expandedWidth])

  return (
    <motion.aside
      className={`ml-sidebar${collapsed ? ' ml-sidebar--collapsed' : ''}${isDrawer ? ' ml-sidebar--drawer' : ''}${resizing ? ' ml-sidebar--resizing' : ''}`}
      animate={{ width }}
      transition={resizing ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ width }}
    >
      {showBrandSpacer ? (
        <div
          className={`ml-sidebar-brand titlebar-drag-region${
            !collapsed && IS_MAC ? ' ml-sidebar-brand--traffic' : ''
          }${collapsed ? ' ml-sidebar-brand--collapsed' : ''}`}
          aria-hidden
        />
      ) : null}

      <div
        className={`ml-sidebar-actions titlebar-no-drag${tabStripOwnsTop ? ' ml-sidebar-actions--flush' : ''}`}
      >
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
                  <Icon icon={Box} size={14} strokeWidth={1.5} />
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
                  <Icon icon={Globe2} size={14} strokeWidth={1.5} />
                </span>
                {!collapsed && (
                  <span className="ml-sidebar-hub-btn-text">
                    <span className="ml-sidebar-hub-btn-title">{t('common.vpn')}</span>
                  </span>
                )}
              </button>
            )
            return vpnBtn
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
                  <Icon icon={Sparkles} size={14} strokeWidth={1.5} />
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
            favoritesBodyOpen ? '' : ' ml-sidebar-section--favorites-collapsed'
          }`}
          style={
            collapsed
              ? undefined
              : favoritesBodyOpen
                ? { height: favoritesHeight, flex: 'none' }
                : { height: 'auto', flex: 'none' }
          }
        >
          {!collapsed && (
            <div className="ml-sidebar-section-chrome ml-sidebar-section-chrome--rich">
              <button
                type="button"
                className="ml-sidebar-section-chrome__toggle"
                aria-expanded={favoritesBodyOpen}
                onClick={() => {
                  if (!hasFavorites) return
                  setFavoritesExpanded((open) => !open)
                }}
              >
                <Icon icon={favoritesBodyOpen ? ChevronDown : ChevronRight} variant="micro" />
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
              {!collapsed && !isDrawer && favoritesBodyOpen && (
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
            <button
              type="button"
              className="ml-sidebar-btn ml-sidebar-btn--ghost ml-sidebar-btn--settings"
              aria-label={t('common.settings')}
              onClick={() => {
                openSettings()
                onNavigate?.()
              }}
            >
              <Icon icon={Settings} size={16} strokeWidth={1.4} />
              {!collapsed ? <span>{t('common.settings')}</span> : null}
            </button>
          <UpdateAvailableBadge showLabel={!collapsed} placement="top" />
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
                <Icon icon={PanelLeft} size={16} strokeWidth={1.4} />
              </button>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <EditClusterModal
        cluster={editingCluster}
        initialSection={editSection}
        onClose={() => {
          setEditingCluster(null)
          setEditSection(undefined)
        }}
      />
      {!collapsed && !isDrawer ? (
        <button
          type="button"
          className="ml-rail-resize-handle titlebar-no-drag"
          aria-label={t('chrome.resizeSidebar')}
          title={t('chrome.resizeSidebar')}
          {...handleProps}
        />
      ) : null}
    </motion.aside>
  )
}
