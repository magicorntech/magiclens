import { useEffect, useState } from 'react'
import { useClusterStore } from './stores/clusterStore'
import { useUpdateStore } from './stores/updateStore'
import { connectCluster } from './clusterConnect'
import { AppLayout } from './components/Layout/AppLayout'
import { LoadingScreen } from './components/Layout/LoadingScreen'
import { WelcomeCard } from './components/Layout/WelcomeCard'
import { UpdateNotificationBanner } from './components/Update/UpdateNotificationBanner'
import { UpdateCenterModal } from './components/Update/UpdateCenterModal'

export function App(): React.JSX.Element {
  const hydrateFromPersistence = useClusterStore((s) => s.hydrateFromPersistence)
  const hydrateUiState = useClusterStore((s) => s.hydrateUiState)
  const initUpdates = useUpdateStore((s) => s.init)
  const [ready, setReady] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    initUpdates()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      const [{ clusters: persisted }, uiState, welcomeState] = await Promise.all([
        window.api.clusterStore.list(),
        window.api.uiState.get(),
        window.api.app.getWelcomeState()
      ])
      if (cancelled) return

      if (!welcomeState.hasSeenWelcome) setShowWelcome(true)

      const persistedIds = new Set(persisted.map((c) => c.id))
      const openedTabs = uiState.openedTabs.filter((id) => persistedIds.has(id))
      const activeClusterId = uiState.activeClusterId && openedTabs.includes(uiState.activeClusterId)
        ? uiState.activeClusterId
        : (openedTabs[0] ?? null)

      hydrateFromPersistence(persisted)
      hydrateUiState({ openedTabs, activeClusterId, activeView: uiState.activeView })
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
        activeView: state.activeView
      })
    })
    return unsubscribe
  }, [ready])

  function handleCloseWelcome(): void {
    setShowWelcome(false)
    void window.api.app.setWelcomeSeen()
  }

  if (!ready) return <LoadingScreen />

  return (
    <>
      <AppLayout />
      <WelcomeCard open={showWelcome} onClose={handleCloseWelcome} />
      <UpdateNotificationBanner />
      <UpdateCenterModal />
    </>
  )
}
