import { useEffect, useRef } from 'react'
import { matchesShortcut } from '@shared/types/keyboardShortcuts'
import type { ResourceKind } from '@shared/resourceKinds'
import { resolveChord } from '@shared/resourceChords'
import { useClusterStore } from '../stores/clusterStore'
import { useClusterGroupsStore } from '../stores/clusterGroupsStore'
import { useDisplaySettingsStore } from '../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../stores/globalSearchStore'
import { useResourceChordStore } from '../stores/resourceChordStore'
import { useSettingsUiStore } from '../stores/settingsUiStore'

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  const tag = el?.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable
}

function openChordKind(kind: ResourceKind): void {
  const clusters = useClusterStore.getState()
  const id =
    clusters.activeClusterId ||
    clusters.openedTabs[0] ||
    clusters.clusters.find((cluster) => cluster.status === 'connected')?.id
  if (!id) return
  clusters.openClusterTab(id)
  clusters.openResourceKind(id, kind)
}

export function useAppShortcuts(): void {
  const sequence = useRef<string[]>([])
  const timer = useRef<number | null>(null)

  useEffect(() => {
    function clearSequence(): void {
      sequence.current = []
      useResourceChordStore.getState().setPending([])
      if (timer.current != null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }

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
        return
      }

      const workspace = useClusterGroupsStore
        .getState()
        .groups.find((g) => g.shortcut && matchesShortcut(event, g.shortcut))
      if (workspace) {
        event.preventDefault()
        void useClusterGroupsStore.getState().activateWorkspace(workspace.id)
        return
      }

      if (useSettingsUiStore.getState().open) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) {
        if (sequence.current.length) clearSequence()
        return
      }
      const key = event.key.toLowerCase()
      if (!/^[a-z0-9]$/.test(key)) return

      const chords = useResourceChordStore.getState().chords.filter((chord) => chord.keys.length >= 2)
      if (chords.length === 0) return

      let next = [...sequence.current, key].slice(-3)
      let outcome = resolveChord(chords, next)
      if (outcome.type === 'none' && next.length > 1) {
        next = [key]
        outcome = resolveChord(chords, next)
      }
      if (outcome.type === 'none') {
        clearSequence()
        return
      }
      event.preventDefault()
      if (timer.current != null) window.clearTimeout(timer.current)
      if (outcome.type === 'fire') {
        openChordKind(outcome.chord.kind)
        clearSequence()
        return
      }
      sequence.current = next
      useResourceChordStore.getState().setPending(next)
      timer.current = window.setTimeout(() => clearSequence(), 320)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearSequence()
    }
  }, [])
}
