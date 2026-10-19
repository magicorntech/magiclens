import { useEffect, useState } from 'react'
import { Drawer, Layout, message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import { RESOURCE_KINDS } from '@shared/resourceKinds'
import { useClusterStore } from '../../stores/clusterStore'
import { useLocalAlertsStore } from '../../stores/localAlertsStore'
import { useVpnStore } from '../../stores/vpnStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { useNotesStore } from '../../stores/notesStore'
import { ensureClusterAccess } from '../../clusterVpn'
import { useResponsiveLayoutEffects } from '../../hooks/useResponsiveLayoutEffects'
import { usesOverlayNavigation, useLayoutMode } from '../../hooks/useLayoutMode'
import { ClusterListPage } from '../../pages/ClusterListPage'
import { VpnPage } from '../../pages/VpnPage'
import { NotesPage } from '../../pages/NotesPage'
import { MollyPage } from '../../pages/MollyPage'
import { ClusterTabBar } from '../ClusterTabs/ClusterTabBar'
import { ClusterTabStrip } from '../ClusterTabs/ClusterTabStrip'
import { AddClusterModal } from '../ClusterTabs/AddClusterModal'
import { LeftSidebar } from './LeftSidebar'
import { MobileAppBar } from './MobileAppBar'
import { SettingsModal } from './SettingsModal'
import { NoteEditorModal } from '../Notes/NoteEditorModal'
import { LocalAlertsWatcher } from '../Alerts/LocalAlertsWatcher'

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
    const apply = (fullscreen: boolean): void => {
      document.documentElement.classList.toggle('ml-fullscreen', fullscreen)
    }
    void window.api.app.getFullscreen().then((res) => apply(res.fullscreen))
    return window.api.app.onFullscreenChanged((payload) => apply(payload.fullscreen))
  }, [])

  useEffect(() => {
    void useNotesStore.getState().hydrate()
    return useNotesStore.getState().subscribeReminders()
  }, [])

  useEffect(() => {
    const alerts = useLocalAlertsStore.getState()
    if (alerts.osNotify && !alerts.permissionAsked) {
      void window.api.alerts.requestPermission()
      alerts.setPermissionAsked(true)
    }
    const kinds = new Set<string>(RESOURCE_KINDS)
    return window.api.alerts.onOpen((target) => {
      if (
        target.clusterId &&
        target.kind &&
        target.name &&
        kinds.has(target.kind)
      ) {
        useClusterStore.getState().navigateToResource(target.clusterId, {
          kind: target.kind as ResourceKind,
          namespace: target.namespace ?? '',
          name: target.name
        })
        return
      }
      if (target.noteId) {
        const note = useNotesStore.getState().notes.find((item) => item.id === target.noteId)
        if (note && !note.id.startsWith('test-')) {
          useNotesStore.getState().openEdit(note)
          return
        }
      }
      useClusterStore.getState().setActiveView('notes')
    })
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
        ) : activeView === 'molly' ? (
          <MollyPage />
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
        <LocalAlertsWatcher />
      </Layout>
    )
  }

  return (
    <Layout className="app-layout app-layout--browser">
      <ClusterTabStrip />
      <div className="app-layout-body">
        <LeftSidebar />
        {mainContent}
      </div>
      <AddClusterModal open={addClusterModalOpen} onClose={() => setAddClusterModalOpen(false)} />
      {settingsModal}
      <NoteEditorModal />
      <LocalAlertsWatcher />
    </Layout>
  )
}
