import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Drawer, Layout, Splitter, Tooltip } from 'antd'
import { Menu, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { UtilityPanelPlacement } from '@shared/types/app'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import type { VirtualPageKey } from '../../resourceConfig/kinds.renderer'
import { ResourceMenu } from './ResourceMenu'
import { NamespaceSelector } from './NamespaceSelector'
import { BottomPanel } from './BottomPanel'
import { BottomPanelProvider, useBottomPanel } from './BottomPanelContext'
import { UtilityDockFab } from './UtilityDockFab'
import { AiAssistantPanel } from './AiAssistantPanel'
import { canUseSplitLayouts, usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { useResourceWatchDisplayStore } from '../../stores/resourceWatchDisplayStore'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import { useAiAgentStore } from '../../stores/aiAgentStore'

/**
 * Virtual pages that show data across the whole cluster and do their own filtering. The header's
 * namespace selector is hidden for these — leaving it visible offers a control that changes
 * nothing on the page under it.
 */
const CLUSTER_SCOPED_VIRTUAL_PAGES = new Set<VirtualPageKey>([
  'topology',
  'visualizer',
  'eventTimeline',
  'security',
  'workloadsOverview',
  'configOverview',
  'networkOverview',
  'storageOverview',
  'helmCharts',
  'helmReleases',
  'dynamicCustomResources',
  'operatorResources',
  'argoDashboard',
  'argoApplications',
  'argoApplicationSets',
  'argoProjects',
  'argoRepositories',
  'argoClusters',
  'appArgoCd',
  'appPrometheus',
  'appGrafana'
])

/** Header width below which Terminal/Copilot drop text labels (icon-only). */
const TERMINAL_LABEL_MIN_WIDTH = 820
const RESOURCE_SIDER_WIDTH = 260
const RESOURCE_SIDER_COLLAPSED_WIDTH = 56
const RESOURCE_SIDER_MIN_WIDTH = 196
const RESOURCE_SIDER_MAX_WIDTH = 420
const RESOURCE_SIDER_WIDTH_KEY = 'ml.resourceSiderWidth'

function useCompactToolbar(ref: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < TERMINAL_LABEL_MIN_WIDTH)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return compact
}

const { Sider, Content } = Layout

interface AppShellProps {
  cluster: ClusterEntry
  splitPane?: 'left' | 'right'
  onNamespaceChange: (namespace: string) => void
  onSelectKind: (kind: ResourceKind) => void
  selectedVirtualPage: VirtualPageKey | null
  onSelectVirtualPage: (key: VirtualPageKey) => void
  children: ReactNode
}

export function AppShell(props: AppShellProps): React.JSX.Element {
  return (
    <BottomPanelProvider clusterId={props.cluster.id}>
      <AppShellInner {...props} />
    </BottomPanelProvider>
  )
}

function resolvePanelPlacement(
  placement: UtilityPanelPlacement,
  allowSide: boolean
): UtilityPanelPlacement {
  if (!allowSide && placement !== 'bottom') return 'bottom'
  return placement
}

function AppShellInner({
  cluster,
  splitPane,
  onNamespaceChange,
  onSelectKind,
  selectedVirtualPage,
  onSelectVirtualPage,
  children
}: AppShellProps): React.JSX.Element {
  const { t } = useTranslation()
  const layoutMode = useLayoutMode()
  const overlayResourceNav = usesOverlayNavigation(layoutMode)
  const allowSidePanel = canUseSplitLayouts(layoutMode)
  const resourceMenuCollapsed = useClusterStore((s) => s.resourceMenuCollapsed)
  const setResourceMenuCollapsed = useClusterStore((s) => s.setResourceMenuCollapsed)
  const { width: resourceSiderWidth, resizing: resourceSiderResizing, handleProps: resourceSiderHandle } =
    useResizableDrawerWidth({
      storageKey: RESOURCE_SIDER_WIDTH_KEY,
      defaultWidth: RESOURCE_SIDER_WIDTH,
      minWidth: RESOURCE_SIDER_MIN_WIDTH,
      maxWidth: RESOURCE_SIDER_MAX_WIDTH,
      maxRatio: 0.4,
      edge: 'left'
    })

  // Cluster tabs always match expanded resource menu width (not the collapsed rail).
  useEffect(() => {
    document.documentElement.style.setProperty('--ml-cluster-tab-width', `${resourceSiderWidth}px`)
    const siderPx = `${
      overlayResourceNav
        ? resourceSiderWidth
        : resourceMenuCollapsed
          ? RESOURCE_SIDER_COLLAPSED_WIDTH
          : resourceSiderWidth
    }px`
    document.documentElement.style.setProperty('--ml-resource-sider-width', siderPx)
    return () => {
      document.documentElement.style.removeProperty('--ml-cluster-tab-width')
      document.documentElement.style.removeProperty('--ml-resource-sider-width')
    }
  }, [overlayResourceNav, resourceMenuCollapsed, resourceSiderWidth])
  const splitView = useClusterStore((s) => s.splitView)
  const utilityPanelPlacement = useDisplaySettingsStore((s) => s.utilityPanelPlacement)
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const compactToolbar = useCompactToolbar(headerInnerRef)
  const { tabs, addTerminalTab, setActiveTab } = useBottomPanel()
  const [resourceNavOpen, setResourceNavOpen] = useState(false)
  const resourceWatchDisplay = useResourceWatchDisplayStore((s) => s.byCluster[cluster.id])
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const assistantOpen = useAiAgentStore((s) => s.panelOpen)
  const showAssistant = !hideAssistant && assistantOpen

  const hasTerminalTab = tabs.some((tab) => tab.kind === 'terminal')
  const panelPlacement = resolvePanelPlacement(utilityPanelPlacement, allowSidePanel)
  const showHeaderNamespace =
    !!selectedVirtualPage && !CLUSTER_SCOPED_VIRTUAL_PAGES.has(selectedVirtualPage)

  const isMapPage = selectedVirtualPage === 'topology' || selectedVirtualPage === 'visualizer'
  const showClusterName = !splitView && !isMapPage
  const showHeaderTerminal = !isMapPage

  /** Browser model: no dedicated cluster header — only overlay/split/namespace. */
  const showChromeHeader = overlayResourceNav || splitView || showHeaderNamespace

  const clusterMeta = [cluster.serverVersion, cluster.status === 'connected' ? 'Connected' : cluster.status]
    .filter(Boolean)
    .join(' · ')

  function handleTerminalClick(): void {
    const existing = tabs.find((tab) => tab.kind === 'terminal')
    if (existing) setActiveTab(existing.id)
    else addTerminalTab()
  }

  useEffect(() => {
    function onOpenTerminal(): void {
      handleTerminalClick()
    }
    window.addEventListener('ml-open-terminal', onOpenTerminal)
    return () => window.removeEventListener('ml-open-terminal', onOpenTerminal)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable open handler for chrome bus
  }, [tabs, addTerminalTab, setActiveTab])

  function handleSelectKind(kind: ResourceKind): void {
    onSelectKind(kind)
    setResourceNavOpen(false)
  }

  function handleSelectVirtualPage(key: VirtualPageKey): void {
    onSelectVirtualPage(key)
    setResourceNavOpen(false)
  }

  function renderWorkspaceBody(): React.JSX.Element {
    if (tabs.length === 0) {
      return <>{children}</>
    }

    const main = <div className="ml-workspace-main">{children}</div>
    const panel = <BottomPanel placement={panelPlacement} allowSidePlacement={allowSidePanel} />

    if (panelPlacement === 'left') {
      return (
        <Splitter layout="horizontal" style={{ height: '100%' }}>
          <Splitter.Panel defaultSize="38%" min="18%" max="70%">
            {panel}
          </Splitter.Panel>
          <Splitter.Panel defaultSize="62%" min="25%">
            {main}
          </Splitter.Panel>
        </Splitter>
      )
    }

    if (panelPlacement === 'right') {
      return (
        <Splitter layout="horizontal" style={{ height: '100%' }}>
          <Splitter.Panel defaultSize="62%" min="25%">
            {main}
          </Splitter.Panel>
          <Splitter.Panel defaultSize="38%" min="18%" max="70%">
            {panel}
          </Splitter.Panel>
        </Splitter>
      )
    }

    return (
      <Splitter layout="vertical" style={{ height: '100%' }}>
        <Splitter.Panel defaultSize="65%" min="25%">
          {main}
        </Splitter.Panel>
        <Splitter.Panel defaultSize="35%" min="15%" max="75%">
          {panel}
        </Splitter.Panel>
      </Splitter>
    )
  }

  return (
    <Layout className={`ml-app-shell${!showChromeHeader ? ' ml-app-shell--no-cluster-header' : ''}`}>
      {showChromeHeader ? (
      <header
        className={`ml-workspace-header ml-workspace-header--slim${splitView ? ' ml-workspace-header--compact' : ''}${splitPane === 'left' ? ' ml-workspace-header--pane-left' : ''}${splitPane === 'right' ? ' ml-workspace-header--pane-right' : ''}`}
      >
        <div ref={headerInnerRef} className="ml-workspace-header-inner">
          {(showClusterName || overlayResourceNav) && (
            <div className="ml-workspace-header-leading">
              {overlayResourceNav && (
                <button
                  type="button"
                  className="ml-icon-btn"
                  onClick={() => setResourceNavOpen(true)}
                  aria-label={t('resourceNav.aria')}
                >
                  <Icon icon={Menu} variant="toolbar" />
                </button>
              )}
              {showClusterName ? (
                <>
                  <Tooltip title={clusterMeta || cluster.customName} placement="bottomLeft">
                    <span className="ml-workspace-cluster-name">
                      <span
                        className={`ml-workspace-status-dot ml-workspace-status-dot--${cluster.status}`}
                        aria-hidden
                      />
                      {cluster.customName}
                    </span>
                  </Tooltip>
                  {!selectedVirtualPage && resourceWatchDisplay ? (
                    <WatchStatusBadge
                      isError={resourceWatchDisplay.isError}
                      watchStatus={resourceWatchDisplay.watchStatus}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          )}
          <div className="ml-workspace-header-actions">
            {showHeaderNamespace ? (
              <NamespaceSelector
                clusterId={cluster.id}
                value={cluster.selectedNamespace}
                onChange={onNamespaceChange}
              />
            ) : null}
            {showHeaderTerminal ? (
              <Tooltip title={t('chromeExtra.terminal')}>
                <button
                  type="button"
                  className={`ml-btn ml-btn--secondary ml-btn--icon${hasTerminalTab ? ' ml-btn--active' : ''}`}
                  onClick={handleTerminalClick}
                  aria-label={t('chromeExtra.terminal')}
                >
                  <Icon icon={Terminal} variant="action" />
                  {!compactToolbar && <span>{t('chromeExtra.terminal')}</span>}
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </header>
      ) : null}

      <Layout className="ml-workspace-body">
        {!overlayResourceNav && (
          <Sider
            width={resourceSiderWidth}
            collapsible
            collapsed={resourceMenuCollapsed}
            onCollapse={setResourceMenuCollapsed}
            collapsedWidth={RESOURCE_SIDER_COLLAPSED_WIDTH}
            className={`ml-resource-sider${resourceSiderResizing ? ' ml-resource-sider--resizing' : ''}`}
            theme="light"
          >
            <ResourceMenu
              clusterId={cluster.id}
              selectedKind={cluster.selectedResourceKind}
              selectedVirtualPage={selectedVirtualPage}
              onSelect={onSelectKind}
              onSelectVirtualPage={onSelectVirtualPage}
              collapsed={resourceMenuCollapsed}
            />
            {!resourceMenuCollapsed ? (
              <button
                type="button"
                className="ml-rail-resize-handle titlebar-no-drag"
                aria-label={t('resourceNav.resize')}
                title={t('resourceNav.resize')}
                {...resourceSiderHandle}
              />
            ) : null}
          </Sider>
        )}
        <Content className="ml-workspace-content">
          <div className="ml-workspace-content-inner">
            {showAssistant ? (
              <div className="ml-workspace-with-assistant">
                <div className="ml-workspace-with-assistant__main">
                  {renderWorkspaceBody()}
                  {selectedVirtualPage !== 'appArgoCd' &&
                  selectedVirtualPage !== 'appPrometheus' &&
                  selectedVirtualPage !== 'appGrafana' ? (
                    <UtilityDockFab clusterId={cluster.id} namespace={cluster.selectedNamespace} />
                  ) : null}
                </div>
                <AiAssistantPanel
                  clusterId={cluster.id}
                  clusterName={cluster.customName || cluster.contextName || cluster.id}
                  namespace={cluster.selectedNamespace}
                  selectedKind={cluster.selectedResourceKind}
                  selectedVirtualPage={selectedVirtualPage}
                />
              </div>
            ) : (
              <>
                {renderWorkspaceBody()}
                {selectedVirtualPage !== 'appArgoCd' &&
                selectedVirtualPage !== 'appPrometheus' &&
                selectedVirtualPage !== 'appGrafana' ? (
                  <UtilityDockFab clusterId={cluster.id} namespace={cluster.selectedNamespace} />
                ) : null}
              </>
            )}
          </div>
        </Content>
      </Layout>

      {overlayResourceNav && (
        <Drawer
          title={t('resourceNav.aria')}
          placement="left"
          open={resourceNavOpen}
          onClose={() => setResourceNavOpen(false)}
          width={300}
          className="resource-nav-drawer"
          styles={{ body: { padding: 0 } }}
        >
          <ResourceMenu
            clusterId={cluster.id}
            selectedKind={cluster.selectedResourceKind}
            selectedVirtualPage={selectedVirtualPage}
            onSelect={handleSelectKind}
            onSelectVirtualPage={handleSelectVirtualPage}
          />
        </Drawer>
      )}
    </Layout>
  )
}
