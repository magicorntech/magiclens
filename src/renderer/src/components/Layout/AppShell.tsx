import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Drawer, Layout, Splitter } from 'antd'
import { Menu, Terminal } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import type { VirtualPageKey } from '../../resourceConfig/kinds.renderer'
import { ResourceMenu } from './ResourceMenu'
import { NamespaceSelector } from './NamespaceSelector'
import { BottomPanel } from './BottomPanel'
import { BottomPanelProvider, useBottomPanel } from './BottomPanelContext'
import { usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
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
    <BottomPanelProvider>
      <AppShellInner {...props} />
    </BottomPanelProvider>
  )
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
  const layoutMode = useLayoutMode()
  const overlayResourceNav = usesOverlayNavigation(layoutMode)
  const resourceMenuCollapsed = useClusterStore((s) => s.resourceMenuCollapsed)
  const setResourceMenuCollapsed = useClusterStore((s) => s.setResourceMenuCollapsed)
  const splitView = useClusterStore((s) => s.splitView)
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const compactToolbar = useCompactToolbar(headerInnerRef)
  const { tabs, addTerminalTab, setActiveTab } = useBottomPanel()
  const [resourceNavOpen, setResourceNavOpen] = useState(false)
  const resourceWatchDisplay = useResourceWatchDisplayStore((s) => s.byCluster[cluster.id])

  const hasTerminalTab = tabs.some((t) => t.kind === 'terminal')

  function handleTerminalClick(): void {
    const existing = tabs.find((t) => t.kind === 'terminal')
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

  return (
    <Layout className="ml-app-shell">
      <header
        className={`ml-workspace-header${splitView ? ' ml-workspace-header--compact' : ''}${splitPane === 'left' ? ' ml-workspace-header--pane-left' : ''}${splitPane === 'right' ? ' ml-workspace-header--pane-right' : ''}`}
      >
        <div ref={headerInnerRef} className="ml-workspace-header-inner">
          {!splitView && (
            <div className="ml-workspace-header-leading">
              {overlayResourceNav && (
                <button type="button" className="ml-icon-btn" onClick={() => setResourceNavOpen(true)} aria-label="Resources">
                  <Icon icon={Menu} variant="toolbar" />
                </button>
              )}
              <span className="ml-workspace-cluster-name">{cluster.customName}</span>
              {!overlayResourceNav && (cluster.serverVersion || (!selectedVirtualPage && resourceWatchDisplay)) && (
                <div className="ml-workspace-header-meta">
                  {cluster.serverVersion && <StatusBadge label={cluster.serverVersion} variant="info" size="sm" />}
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
            <button
              type="button"
              className={`ml-btn ml-btn--secondary${hasTerminalTab ? ' ml-btn--active' : ''}`}
              onClick={handleTerminalClick}
            >
              <Icon icon={Terminal} variant="action" />
              {!compactToolbar && <span>Terminal</span>}
            </button>
            <NamespaceSelector clusterId={cluster.id} value={cluster.selectedNamespace} onChange={onNamespaceChange} />
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
          <div className="ml-workspace-content-inner">
            {tabs.length > 0 ? (
              <Splitter layout="vertical" style={{ height: '100%' }}>
                <Splitter.Panel defaultSize="65%" min="25%">
                  <div className="ml-workspace-main">{children}</div>
                </Splitter.Panel>
                <Splitter.Panel defaultSize="35%" min="15%" max="75%">
                  <BottomPanel />
                </Splitter.Panel>
              </Splitter>
            ) : (
              children
            )}
          </div>
        </Content>
      </Layout>

      {overlayResourceNav && (
        <Drawer
          title="Resources"
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
