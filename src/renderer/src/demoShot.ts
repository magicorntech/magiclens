import { RESOURCE_KINDS, type ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { useClusterStore } from './stores/clusterStore'
import { useThemeStore } from './stores/themeStore'
import { useAiAgentStore } from './stores/aiAgentStore'
import { useDisplaySettingsStore } from './stores/displaySettingsStore'
import { useNotesStore } from './stores/notesStore'
import { useSettingsUiStore } from './stores/settingsUiStore'

declare global {
  interface Window {
    __mlDemoShot?: (target: string) => void
    __mlDemoCmd?: (cmd: string) => void
    /** Capture variant: every page opens in this mode unless the target says otherwise. */
    __mlVariant?: 'light' | 'dark'
  }
}

const KINDS = new Set<string>(RESOURCE_KINDS)

export function installDemoShot(): void {
  window.__mlDemoShot = (rawTarget: string) => {
    // "dark:Nodes" renders the same page in the dark theme; everything else stays light.
    // "theme:<scheme>:<light|dark>:<target>" picks a colour scheme for that mode first.
    let spec = rawTarget
    if (spec.startsWith('theme:')) {
      const [, scheme, mode, ...rest] = spec.split(':')
      const theme = useThemeStore.getState()
      theme.setLightScheme(scheme as never)
      theme.setDarkScheme(scheme as never)
      spec = `${mode === 'dark' ? 'dark:' : ''}${rest.join(':')}`
    }
    const dark = spec.startsWith('dark:') || window.__mlVariant === 'dark'
    const target = spec.startsWith('dark:') ? spec.slice(5) : spec
    useThemeStore.getState().setMode(dark ? 'dark' : 'light')
    const store = useClusterStore.getState()
    const id = store.activeClusterId ?? store.clusters[0]?.id
    if (!id) return
    // Marketing shots want the page, not the assistant dock or the floating quick-launch button.
    useAiAgentStore.getState().setPanelOpen(false)
    void useDisplaySettingsStore.getState().setShowUtilityFab(false)
    // Topology only draws a single namespace.
    if (target === 'topology') store.setSelectedNamespace(id, 'shop')
    if (KINDS.has(target)) {
      store.openResourceKind(id, target as ResourceKind)
      return
    }
    store.openVirtualPage(id, target as VirtualPageKey)
  }

  // Scripted UI state changes for capture scenes: "<name>:<arg>".
  window.__mlDemoCmd = (cmd: string) => {
    const at = cmd.indexOf(':')
    const name = at < 0 ? cmd : cmd.slice(0, at)
    const arg = at < 0 ? '' : cmd.slice(at + 1)
    const store = useClusterStore.getState()
    const activeId = store.activeClusterId ?? store.clusters[0]?.id
    switch (name) {
      case 'resetTabs': {
        // One clean tab bar: close everything unpinned, then open the given kinds in order.
        for (const c of store.clusters) {
          useClusterStore.getState().closeAllResourceKinds(c.id)
          for (const v of [...c.openVirtualPages]) useClusterStore.getState().closeVirtualPage(c.id, v)
        }
        for (const k of arg.split(',').filter(Boolean)) {
          if (activeId) window.__mlDemoShot?.(k)
        }
        break
      }
      case 'cluster': {
        const target = store.clusters.find((c) => c.id === `demo-aurora-${arg}` || c.customName === arg)
        if (target) store.setActiveCluster(target.id)
        break
      }
      case 'clusterSplit':
        if (arg === 'on') store.enableSplitView()
        else store.disableSplitView()
        break
      case 'innerSplit': {
        if (!activeId) break
        if (arg === 'off') {
          store.updateResourceTabPrefs(activeId, { splitView: false })
          break
        }
        const [left, right] = arg.split(',') as ResourceKind[]
        if (left) store.openResourceKind(activeId, left)
        if (right) store.openResourceKind(activeId, right)
        store.updateResourceTabPrefs(activeId, {
          splitView: true,
          splitLeftKind: left,
          splitRightKind: right,
          focusedSplitPane: 'left'
        })
        break
      }
      case 'variant': {
        // White on white / Black on black: the two flat schemes the website shows in light and dark mode.
        window.__mlVariant = arg === 'dark' ? 'dark' : 'light'
        const theme = useThemeStore.getState()
        theme.setLightScheme('white' as never)
        theme.setDarkScheme('black' as never)
        theme.setMode(arg === 'dark' ? 'dark' : 'light')
        break
      }
      case 'view':
        store.setActiveView(arg as never)
        break
      case 'settings':
        useSettingsUiStore.getState().openSettings(arg as never)
        break
      case 'menu':
        store.setResourceMenuCollapsed(arg === 'collapsed')
        break
      case 'theme': {
        const [scheme, mode] = arg.split('/')
        const theme = useThemeStore.getState()
        if (scheme) {
          theme.setLightScheme(scheme as never)
          theme.setDarkScheme(scheme as never)
        }
        theme.setMode(mode === 'dark' ? 'dark' : 'light')
        break
      }
      case 'notes': {
        const notes = useNotesStore.getState()
        const [key, value] = arg.split('=')
        if (key === 'mode') notes.setEditorMode(value as never)
        if (key === 'split') notes.setSplitMode(value as never)
        if (key === 'paper') notes.setPaperStyle(value as never)
        if (key === 'width') notes.setPaperWidth(value as never)
        break
      }
    }
  }
}
