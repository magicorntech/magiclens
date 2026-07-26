import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Drawer, Layout, Splitter } from 'antd'
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
import { canUseSplitLayouts, usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { useResourceWatchDisplayStore } from '../../stores/resourceWatchDisplayStore'

const TERMINAL_LABEL_MIN_WIDTH = 480

function useCompactToolbar(ref: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false)
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
  const splitView = useClusterStore((s) => s.splitView)
  const utilityPanelPlacement = useDisplaySettingsStore((s) => s.utilityPanelPlacement)
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const compactToolbar = useCompactToolbar(headerInnerRef)
  const { tabs, addTerminalTab, setActiveTab } = useBottomPanel()
  const [resourceNavOpen, setResourceNavOpen] = useState(false)
  const resourceWatchDisplay = useResourceWatchDisplayStore((s) => s.byCluster[cluster.id])

  const hasTerminalTab = tabs.some((tab) => tab.kind === 'terminal')
  const panelPlacement = resolvePanelPlacement(utilityPanelPlacement, allowSidePanel)
  const showHeaderNamespace =
    !!selectedVirtualPage &&
    selectedVirtualPage !== 'clusterOverview' &&
    selectedVirtualPage !== 'workloadsOverview' &&
    selectedVirtualPage !== 'configOverview' &&
    selectedVirtualPage !== 'helmCharts' &&
    selectedVirtualPage !== 'helmReleases' &&
    selectedVirtualPage !== 'dynamicCustomResources' &&
    selectedVirtualPage !== 'operatorResources'

  function handleTerminalClick(): void {
    const existing = tabs.find((tab) => tab.kind === 'terminal')
    if (existing) setActiveTab(existing.id)
    else addTerminalTab()
  }

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
    <Layout className="ml-app-shell">
      <header
        className={`ml-workspace-header${splitView ? ' ml-workspace-header--compact' : ''}${splitPane === 'left' ? ' ml-workspace-header--pane-left' : ''}${splitPane === 'right' ? ' ml-workspace-header--pane-right' : ''}`}
      >
        <div ref={headerInnerRef} className="ml-workspace-header-inner">
          {!splitView && (
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
              <span className="ml-workspace-cluster-name">{cluster.customName}</span>
              {!overlayResourceNav &&
                (cluster.serverVersion || (!selectedVirtualPage && resourceWatchDisplay)) && (
                  <div className="ml-workspace-header-meta">
                    {cluster.serverVersion && (
                      <StatusBadge label={cluster.serverVersion} variant="info" size="sm" />
                    )}
                    {!selectedVirtualPage && resourceWatchDisplay && (
                      <WatchStatusBadge
                        isError={resourceWatchDisplay.isError}
                        watchStatus={resourceWatchDisplay.watchStatus}
                      />
                    )}
                  </div>
                )}
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
            <button
              type="button"
              className={`ml-btn ml-btn--secondary${hasTerminalTab ? ' ml-btn--active' : ''}`}
              onClick={handleTerminalClick}
            >
              <Icon icon={Terminal} variant="action" />
              {!compactToolbar && <span>{t('chromeExtra.terminal')}</span>}
            </button>
          </div>
        </div>
      </header>

      <Layout className="ml-workspace-body">
        {!overlayResourceNav && (
          <Sider
            width={260}
            collapsible
            collapsed={resourceMenuCollapsed}
            onCollapse={setResourceMenuCollapsed}
            collapsedWidth={56}
            className="ml-resource-sider"
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
          </Sider>
        )}
        <Content className="ml-workspace-content">
          <div className="ml-workspace-content-inner">{renderWorkspaceBody()}</div>
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
