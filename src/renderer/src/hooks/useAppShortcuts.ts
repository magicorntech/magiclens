import { useEffect } from 'react'
import { matchesShortcut } from '@shared/types/keyboardShortcuts'
import { useClusterStore } from '../stores/clusterStore'
import { useDisplaySettingsStore } from '../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../stores/globalSearchStore'
import { useSettingsUiStore } from '../stores/settingsUiStore'

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  const tag = el?.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable
}

export function useAppShortcuts(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const shortcuts = useDisplaySettingsStore.getState().keyboardShortcuts
      const search = useGlobalSearchStore.getState()
      const editable = isEditableTarget(event.target)

      if (matchesShortcut(event, shortcuts.globalSearch)) {
        event.preventDefault()
        if (search.open) search.closeSearch()
        else search.openSearch()
        return
      }

      if (search.open && event.key === 'Escape') {
        event.preventDefault()
        search.closeSearch()
        return
      }

      // Navigation / layout shortcuts should not fire while typing
      if (editable) return

      if (matchesShortcut(event, shortcuts.toggleSplitView)) {
        event.preventDefault()
        const { splitView, enableSplitView, disableSplitView } = useClusterStore.getState()
        if (splitView) disableSplitView()
        else enableSplitView()
        return
      }

      if (matchesShortcut(event, shortcuts.goToClusters)) {
        event.preventDefault()
        useClusterStore.getState().setActiveView('clusters')
        return
      }

      if (matchesShortcut(event, shortcuts.goToVpn)) {
        event.preventDefault()
        useClusterStore.getState().setActiveView('vpn')
        return
      }

      if (matchesShortcut(event, shortcuts.toggleSidebar)) {
        event.preventDefault()
        const { leftSidebarCollapsed, setLeftSidebarCollapsed } = useClusterStore.getState()
        setLeftSidebarCollapsed(!leftSidebarCollapsed)
        return
      }

      if (matchesShortcut(event, shortcuts.openSettings)) {
        event.preventDefault()
        useSettingsUiStore.getState().openSettings()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
