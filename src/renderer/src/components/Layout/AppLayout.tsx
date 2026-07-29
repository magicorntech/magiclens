import { useEffect, useState } from 'react'
import { Drawer, Layout, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useClusterStore } from '../../stores/clusterStore'
import { useVpnStore } from '../../stores/vpnStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { useNotesStore } from '../../stores/notesStore'
import { ensureClusterAccess } from '../../clusterVpn'
import { useResponsiveLayoutEffects } from '../../hooks/useResponsiveLayoutEffects'
import { usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterListPage } from '../../pages/ClusterListPage'
import { VpnPage } from '../../pages/VpnPage'
import { NotesPage } from '../../pages/NotesPage'
import { ClusterTabBar } from '../ClusterTabs/ClusterTabBar'
import { ClusterTabStrip } from '../ClusterTabs/ClusterTabStrip'
import { AddClusterModal } from '../ClusterTabs/AddClusterModal'
import { LeftSidebar } from './LeftSidebar'
import { MobileAppBar } from './MobileAppBar'
import { AppTopBar } from './AppTopBar'
import { SettingsModal } from './SettingsModal'
import { NoteEditorModal } from '../Notes/NoteEditorModal'

export function AppLayout(): React.JSX.Element {
  const { t } = useTranslation()
  const activeView = useClusterStore((s) => s.activeView)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const addClusterModalOpen = useClusterStore((s) => s.addClusterModalOpen)
  const setAddClusterModalOpen = useClusterStore((s) => s.setAddClusterModalOpen)
  const settingsOpen = useSettingsUiStore((s) => s.open)
  const setSettingsOpen = useSettingsUiStore((s) => s.setOpen)
  const lastReminder = useNotesStore((s) => s.lastReminder)
  const clearLastReminder = useNotesStore((s) => s.clearLastReminder)
  const layoutMode = useLayoutMode()
  const overlayNav = usesOverlayNavigation(layoutMode)
  const [navOpen, setNavOpen] = useState(false)

  useResponsiveLayoutEffects()

  useEffect(() => {
    void useVpnStore.getState().refresh()
    return useVpnStore.getState().subscribeStatus()
  }, [])

  useEffect(() => {
    void useNotesStore.getState().hydrate()
    return useNotesStore.getState().subscribeReminders()
  }, [])

  useEffect(() => {
    if (!lastReminder) return
    message.info({
      content: t('notes.reminderToast', { title: lastReminder.title }),
      duration: 6
    })
    clearLastReminder()
  }, [lastReminder, clearLastReminder, t])

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
        ) : activeView === 'vpn' ? (
          <VpnPage />
        ) : activeView === 'notes' ? (
          <NotesPage />
        ) : (
          <ClusterTabBar />
        )}
      </div>
    </div>
  )

  const settingsModal = (
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
  )

  if (overlayNav) {
    return (
      <Layout className="app-layout app-layout--overlay-nav">
        <MobileAppBar onMenuClick={() => setNavOpen(true)} />
        <div className="app-layout-main">{mainContent}</div>
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
        {settingsModal}
        <NoteEditorModal />
      </Layout>
    )
  }

  return (
    <Layout className="app-layout app-layout--browser">
      <ClusterTabStrip />
      <AppTopBar />
      <div className="app-layout-body">
        <LeftSidebar />
        {mainContent}
      </div>
      <AddClusterModal open={addClusterModalOpen} onClose={() => setAddClusterModalOpen(false)} />
      {settingsModal}
      <NoteEditorModal />
    </Layout>
  )
}
