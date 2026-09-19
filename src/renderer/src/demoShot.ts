import { RESOURCE_KINDS, type ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { useClusterStore } from './stores/clusterStore'
import { useThemeStore } from './stores/themeStore'

declare global {
  interface Window {
    __mlDemoShot?: (target: string) => void
  }
}

const KINDS = new Set<string>(RESOURCE_KINDS)

export function installDemoShot(): void {
  window.__mlDemoShot = (target: string) => {
    useThemeStore.getState().setMode('light')
    const store = useClusterStore.getState()
    const id = store.activeClusterId ?? store.clusters[0]?.id
    if (!id) return
    if (KINDS.has(target)) {
      store.openResourceKind(id, target as ResourceKind)
      return
    }
    store.openVirtualPage(id, target as VirtualPageKey)
  }
}
