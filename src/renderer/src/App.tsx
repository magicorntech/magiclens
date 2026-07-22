import { useEffect, useState } from 'react'
import { useClusterStore } from './stores/clusterStore'
import { useAuthStore } from './stores/authStore'
import { useUpdateStore } from './stores/updateStore'
import { useDisplaySettingsStore } from './stores/displaySettingsStore'
import { useVpnStore } from './stores/vpnStore'
import { resolveUserScope, switchWorkspace, reconnectOpenedTabs } from './workspace'
import { syncOrgAssignments } from './enterprise/sync'
import { AppLayout } from './components/Layout/AppLayout'
import { LoadingScreen } from './components/Layout/LoadingScreen'
import { SplashIntroScreen } from './components/Layout/SplashIntroScreen'
import { LoginScreen } from './components/Auth/LoginScreen'
import {
  AssignedResourcesOnboarding,
  shouldShowResourcesOnboarding
} from './components/Auth/AssignedResourcesOnboarding'
import { WelcomeCard } from './components/Layout/WelcomeCard'
import { UpdateNotificationBanner } from './components/Update/UpdateNotificationBanner'
import { UpdateCenterModal } from './components/Update/UpdateCenterModal'
import { GlobalSearchModal } from './components/Search/GlobalSearchModal'
import { VpnSessionPromptModal } from './components/Vpn/VpnSessionPromptModal'
import { useGlobalSearchShortcut } from './hooks/useGlobalSearchShortcut'

export function App(): React.JSX.Element {
  const initUpdates = useUpdateStore((s) => s.init)
  const hydrateDisplaySettings = useDisplaySettingsStore((s) => s.hydrate)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const me = useAuthStore((s) => s.me)
  const offlineMode = useAuthStore((s) => s.offlineMode)
  const [ready, setReady] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [splashDismissed, setSplashDismissed] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [vpnOnboardingOpen, setVpnOnboardingOpen] = useState(false)

  useGlobalSearchShortcut()

  useEffect(() => {
    initUpdates()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      await Promise.all([hydrateDisplaySettings(), hydrateAuth()])
      if (cancelled) return

      const auth = useAuthStore.getState()
      const scope = resolveUserScope(auth.me, auth.offlineMode)
      // Hydrate first without reconnecting — org sync must rewrite kubeconfig files first.
      await switchWorkspace(scope, { reconnect: false })
      if (cancelled) return

      if (auth.me) {
        try {
          await syncOrgAssignments()
        } catch (err) {
          console.warn('[magiclens] boot sync failed:', err)
        }
      } else {
        await useVpnStore.getState().refresh()
      }
      if (cancelled) return

      const welcomeStateResult = await window.api.app.getWelcomeState()
      if (!welcomeStateResult.hasSeenWelcome) setShowWelcome(true)
      setShowSplash(welcomeStateResult.showSplash)

      if (
        shouldShowResourcesOnboarding(
          auth.me,
          useClusterStore.getState().clusters,
          useVpnStore.getState().profiles
        )
      ) {
        setVpnOnboardingOpen(true)
      }

      // Show UI immediately — cluster reconnect can hang for minutes without VPN.
      setReady(true)
      void reconnectOpenedTabs()
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

  function handleCloseWelcome(): void {
    setShowWelcome(false)
    void window.api.app.setWelcomeSeen()
  }

  function handleStartFromSplash(): void {
    setSplashDismissed(true)
    void window.api.app.setSplashSeen()
  }

  if (!ready || !authHydrated) return <LoadingScreen />

  const needsAuth = !me && !offlineMode
  if (needsAuth) {
    return (
      <LoginScreen
        onAuthenticated={() => {
          const auth = useAuthStore.getState()
          if (
            shouldShowResourcesOnboarding(
              auth.me,
              useClusterStore.getState().clusters,
              useVpnStore.getState().profiles
            )
          ) {
            setVpnOnboardingOpen(true)
          }
        }}
      />
    )
  }

  if (showSplash && !splashDismissed) {
    return <SplashIntroScreen onStart={handleStartFromSplash} />
  }

  return (
    <>
      <AppLayout />
      <WelcomeCard open={showWelcome} onClose={handleCloseWelcome} />
      <UpdateNotificationBanner />
      <UpdateCenterModal />
      <GlobalSearchModal />
      <VpnSessionPromptModal />
      {me && (
        <AssignedResourcesOnboarding
          me={me}
          open={vpnOnboardingOpen}
          onClose={() => setVpnOnboardingOpen(false)}
        />
      )}
    </>
  )
}
