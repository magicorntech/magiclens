import { create } from 'zustand'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceWatchStatus } from '@shared/types/resourceWatch'

export interface ResourceWatchDisplay {
  kind: ResourceKind
  namespace: string
  watchStatus: ResourceWatchStatus
  isError: boolean
}

interface ResourceWatchDisplayState {
  byCluster: Record<string, ResourceWatchDisplay | undefined>
  setDisplay: (clusterId: string, display: ResourceWatchDisplay | null) => void
}

export const useResourceWatchDisplayStore = create<ResourceWatchDisplayState>((set) => ({
  byCluster: {},
  setDisplay: (clusterId, display) =>
    set((state) => ({
      byCluster: display
        ? { ...state.byCluster, [clusterId]: display }
        : Object.fromEntries(Object.entries(state.byCluster).filter(([id]) => id !== clusterId))
    }))
}))
