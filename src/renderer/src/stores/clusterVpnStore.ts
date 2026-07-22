import { create } from 'zustand'
import type { ClusterVpnLinks } from '@shared/types/clusterVpn'

interface ClusterVpnState {
  links: ClusterVpnLinks
  hydrated: boolean
  hydrate: () => Promise<void>
  setLink: (clusterId: string, vpnProfileId: string | null) => Promise<void>
  getLink: (clusterId: string) => string | undefined
  removeLink: (clusterId: string) => Promise<void>
}

export const useClusterVpnStore = create<ClusterVpnState>((set, get) => ({
  links: {},
  hydrated: false,

  hydrate: async () => {
    const { links } = await window.api.clusterVpn.getLinks()
    set({ links, hydrated: true })
  },

  setLink: async (clusterId, vpnProfileId) => {
    const { links } = await window.api.clusterVpn.setLink(clusterId, vpnProfileId)
    set({ links })
  },

  getLink: (clusterId) => get().links[clusterId],

  removeLink: async (clusterId) => {
    const { links } = await window.api.clusterVpn.removeLink(clusterId)
    set({ links })
  }
}))
