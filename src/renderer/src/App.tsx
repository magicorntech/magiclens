import { useEffect, useState } from 'react'
import { useClusterStore } from './stores/clusterStore'
import { useAuthStore } from './stores/authStore'
import { useUpdateStore } from './stores/updateStore'
import { useDisplaySettingsStore } from './stores/displaySettingsStore'
import { useVpnStore } from './stores/vpnStore'
import { resolveUserScope, switchWorkspace, reconnectOpenedTabs } from './workspace'
import { AppLayout } from './components/Layout/AppLayout'
import { LoadingScreen } from './components/Layout/LoadingScreen'
import { FeatureTourScreen } from './components/Layout/FeatureTourScreen'
import { UpdateNotificationBanner } from './components/Update/UpdateNotificationBanner'
import { UpdateCenterModal } from './components/Update/UpdateCenterModal'
import { GlobalSearchModal } from './components/Search/GlobalSearchModal'
import { VpnSessionPromptModal } from './components/Vpn/VpnSessionPromptModal'
import { useAppShortcuts } from './hooks/useAppShortcuts'

export function App(): React.JSX.Element {
  const initUpdates = useUpdateStore((s) => s.init)
  const hydrateDisplaySettings = useDisplaySettingsStore((s) => s.hydrate)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const [ready, setReady] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [tourDismissed, setTourDismissed] = useState(false)

  useAppShortcuts()

  useEffect(() => {
    initUpdates()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      try {
        await Promise.all([hydrateDisplaySettings(), hydrateAuth()])
        if (cancelled) return

        const auth = useAuthStore.getState()
        const scope = resolveUserScope(auth.me, auth.offlineMode)
        await switchWorkspace(scope, { reconnect: false })
        if (cancelled) return

        await useVpnStore.getState().refresh()
        if (cancelled) return

        const welcomeStateResult = await window.api.app.getWelcomeState()
        // First launch or first open after an update → feature card slider
        setShowTour(welcomeStateResult.showSplash)
      } catch (err) {
        console.error('[magiclens] boot failed:', err)
      } finally {
        if (!cancelled) {
          // Show UI immediately — cluster reconnect can hang for minutes without VPN.
          setReady(true)
          void reconnectOpenedTabs()
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready) return
    const unsubscribe = useClusterStore.subscribe((state) => {
      void window.api.uiState.set({
        openedTabs: state.openedTabs,
        activeClusterId: state.activeClusterId,
        activeView: state.activeView,
        splitView: state.splitView,
        splitLeftClusterId: state.splitLeftClusterId,
        splitRightClusterId: state.splitRightClusterId,
        focusedSplitPane: state.focusedSplitPane,
        leftSidebarCollapsed: state.leftSidebarCollapsed,
        resourceMenuCollapsed: state.resourceMenuCollapsed
      })
    })
    return unsubscribe
  }, [ready])

  function handleFinishTour(): void {
    setTourDismissed(true)
    void window.api.app.setSplashSeen()
    void window.api.app.setWelcomeSeen()
  }

  if (!ready || !authHydrated) return <LoadingScreen />

  if (showTour && !tourDismissed) {
    return <FeatureTourScreen onFinish={handleFinishTour} />
  }

  return (
    <>
      <AppLayout />
      <UpdateNotificationBanner />
      <UpdateCenterModal />
      <GlobalSearchModal />
      <VpnSessionPromptModal />
    </>
  )
}
