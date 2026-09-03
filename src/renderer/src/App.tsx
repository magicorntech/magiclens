import { useEffect, useState } from 'react'
import { whatsNewFor, type WhatsNewEntry } from '@shared/whatsNew'
import { WhatsNewModal } from './components/Update/WhatsNewModal'
import { MotionConfig } from 'framer-motion'
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
import { useSettingsUiStore, type SettingsSection } from './stores/settingsUiStore'

export function App(): React.JSX.Element {
  const initUpdates = useUpdateStore((s) => s.init)
  const hydrateDisplaySettings = useDisplaySettingsStore((s) => s.hydrate)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const [ready, setReady] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [whatsNew, setWhatsNew] = useState<{ version: string; entry: WhatsNewEntry } | null>(null)
  const [tourDismissed, setTourDismissed] = useState(false)

  useAppShortcuts()

  useEffect(() => {
    initUpdates()
  }, [])

  // The menu-bar widget's gear button asks the main process to focus a Settings section here.
  useEffect(() => {
    return window.api.app.onOpenSettingsSection((section) => {
      useSettingsUiStore.getState().openSettings(section as SettingsSection)
    })
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
        // A brand-new user gets the intro tour. Someone who already knows the app and simply
        // took an update gets that release's highlights instead — `showSplash` covers both
        // cases, so `previousVersion` is what tells them apart.
        const isFirstLaunch = !welcomeStateResult.hasSeenWelcome
        setShowTour(isFirstLaunch && welcomeStateResult.showSplash)
        if (!isFirstLaunch && welcomeStateResult.showSplash) {
          const entry = whatsNewFor(welcomeStateResult.currentVersion)
          // Releases with nothing worth announcing simply mark themselves seen and move on.
          if (entry) {
            setWhatsNew({ version: welcomeStateResult.currentVersion, entry })
          } else {
            void window.api.app.setSplashSeen()
          }
        }
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

  function handleDismissWhatsNew(): void {
    setWhatsNew(null)
    void window.api.app.setSplashSeen()
  }

  function handleFinishTour(): void {
    setTourDismissed(true)
    void window.api.app.setSplashSeen()
    void window.api.app.setWelcomeSeen()
  }

  if (!ready || !authHydrated) return <LoadingScreen />

  if (showTour && !tourDismissed) {
    return (
      <MotionConfig reducedMotion="user">
        <FeatureTourScreen onFinish={handleFinishTour} />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppLayout />
      {whatsNew ? (
        <WhatsNewModal
          version={whatsNew.version}
          entry={whatsNew.entry}
          open
          onClose={handleDismissWhatsNew}
        />
      ) : null}
      <UpdateNotificationBanner />
      <UpdateCenterModal />
      <GlobalSearchModal />
      <VpnSessionPromptModal />
    </MotionConfig>
  )
}
