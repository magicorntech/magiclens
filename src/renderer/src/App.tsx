import { useEffect, useState } from 'react'
import { useClusterStore } from './stores/clusterStore'
import { useUpdateStore } from './stores/updateStore'
import { useDisplaySettingsStore } from './stores/displaySettingsStore'
import { connectCluster } from './clusterConnect'
import { AppLayout } from './components/Layout/AppLayout'
import { LoadingScreen } from './components/Layout/LoadingScreen'
import { SplashIntroScreen } from './components/Layout/SplashIntroScreen'
import { WelcomeCard } from './components/Layout/WelcomeCard'
import { UpdateNotificationBanner } from './components/Update/UpdateNotificationBanner'
import { UpdateCenterModal } from './components/Update/UpdateCenterModal'
import { GlobalSearchModal } from './components/Search/GlobalSearchModal'
import { useGlobalSearchShortcut } from './hooks/useGlobalSearchShortcut'

export function App(): React.JSX.Element {
  const hydrateFromPersistence = useClusterStore((s) => s.hydrateFromPersistence)
  const hydrateUiState = useClusterStore((s) => s.hydrateUiState)
  const initUpdates = useUpdateStore((s) => s.init)
  const hydrateDisplaySettings = useDisplaySettingsStore((s) => s.hydrate)
  const [ready, setReady] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [splashDismissed, setSplashDismissed] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useGlobalSearchShortcut()

  useEffect(() => {
    initUpdates()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      const [clusterStoreResult, uiState, welcomeState] = await Promise.all([
        window.api.clusterStore.list(),
        window.api.uiState.get(),
        window.api.app.getWelcomeState(),
        hydrateDisplaySettings()
      ])
      const persisted = clusterStoreResult.clusters
      if (cancelled) return

      if (!welcomeState.hasSeenWelcome) setShowWelcome(true)
      setShowSplash(welcomeState.showSplash)

      const persistedIds = new Set(persisted.map((c) => c.id))
      const openedTabs = uiState.openedTabs.filter((id) => persistedIds.has(id))
      const activeClusterId = uiState.activeClusterId && openedTabs.includes(uiState.activeClusterId)
        ? uiState.activeClusterId
        : (openedTabs[0] ?? null)

      hydrateFromPersistence(persisted)
      hydrateUiState({
        openedTabs,
        activeClusterId,
        activeView: uiState.activeView,
        splitView: uiState.splitView,
        splitLeftClusterId: uiState.splitLeftClusterId,
        splitRightClusterId: uiState.splitRightClusterId,
        focusedSplitPane: uiState.focusedSplitPane,
        leftSidebarCollapsed: uiState.leftSidebarCollapsed,
        resourceMenuCollapsed: uiState.resourceMenuCollapsed
      })
      setReady(true)

      for (const id of openedTabs) {
        const entry = persisted.find((c) => c.id === id)
        if (!entry) continue
        await connectCluster(entry.id, entry.source, entry.contextName)
        if (cancelled) return
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

  function handleCloseWelcome(): void {
    setShowWelcome(false)
    void window.api.app.setWelcomeSeen()
  }

  function handleStartFromSplash(): void {
    setSplashDismissed(true)
    void window.api.app.setSplashSeen()
  }

  if (!ready) return <LoadingScreen />
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
    </>
  )
}
