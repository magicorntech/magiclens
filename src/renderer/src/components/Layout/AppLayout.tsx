import { useEffect, useState } from 'react'
import { Drawer, Layout } from 'antd'
import { useClusterStore } from '../../stores/clusterStore'
import { useVpnStore } from '../../stores/vpnStore'
import { ensureClusterAccess } from '../../clusterVpn'
import { useResponsiveLayoutEffects } from '../../hooks/useResponsiveLayoutEffects'
import { usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterListPage } from '../../pages/ClusterListPage'
import { AdminConsolePage } from '../../pages/AdminConsolePage'
import { ProfilePage } from '../../pages/ProfilePage'
import { VpnPage } from '../../pages/VpnPage'
import { ClusterTabBar } from '../ClusterTabs/ClusterTabBar'
import { AddClusterModal } from '../ClusterTabs/AddClusterModal'
import { LeftSidebar } from './LeftSidebar'
import { MobileAppBar } from './MobileAppBar'
import { AppTopBar } from './AppTopBar'

export function AppLayout(): React.JSX.Element {
  const activeView = useClusterStore((s) => s.activeView)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const addClusterModalOpen = useClusterStore((s) => s.addClusterModalOpen)
  const setAddClusterModalOpen = useClusterStore((s) => s.setAddClusterModalOpen)
  const layoutMode = useLayoutMode()
  const overlayNav = usesOverlayNavigation(layoutMode)
  const [navOpen, setNavOpen] = useState(false)

  useResponsiveLayoutEffects()

  useEffect(() => {
    void useVpnStore.getState().refresh()
    return useVpnStore.getState().subscribeStatus()
  }, [])

  useEffect(() => {
    if (activeView !== 'tabs' || !activeClusterId) return
    const cluster = useClusterStore.getState().clusters.find((c) => c.id === activeClusterId)
    void ensureClusterAccess(activeClusterId, cluster?.customName)
  }, [activeClusterId, activeView])

  const mainContent = (
    <div className="app-layout-content">
      <div className="app-layout-content-inner">
        {activeView === 'clusters' ? (
          <ClusterListPage />
        ) : activeView === 'admin' ? (
          <AdminConsolePage />
        ) : activeView === 'profile' ? (
          <ProfilePage />
        ) : activeView === 'vpn' ? (
          <VpnPage />
        ) : (
          <ClusterTabBar />
        )}
      </div>
    </div>
  )

  if (overlayNav) {
    return (
      <Layout className="app-layout app-layout--overlay-nav">
        <MobileAppBar onMenuClick={() => setNavOpen(true)} />
        <div className="app-layout-main">
          {mainContent}
        </div>
        <Drawer
          title={null}
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          width={280}
          className="mobile-nav-drawer"
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <LeftSidebar variant="drawer" onNavigate={() => setNavOpen(false)} />
        </Drawer>
        <AddClusterModal open={addClusterModalOpen} onClose={() => setAddClusterModalOpen(false)} />
      </Layout>
    )
  }

  return (
    <Layout className="app-layout">
      <AppTopBar />
      <div className="app-layout-body">
        <LeftSidebar />
        {mainContent}
      </div>
      <AddClusterModal open={addClusterModalOpen} onClose={() => setAddClusterModalOpen(false)} />
    </Layout>
  )
}
