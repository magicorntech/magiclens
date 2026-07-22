import { create } from 'zustand'
import type { VpnAuthCredentials, VpnProfileSummary, VpnRuntimeStatus } from '@shared/types/vpn'
import { enterpriseApi } from '../enterprise/api'
import { useAuthStore } from './authStore'

interface VpnState {
  profiles: VpnProfileSummary[]
  status: VpnRuntimeStatus | null
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  refresh: () => Promise<void>
  addFromPaste: (input: {
    name: string
    config: string
    provider?: string
    username?: string
    organization?: string
    serverHost?: string
    serverName?: string
    protocol?: string
  }) => Promise<void>
  /** Pick .ovpn and return draft for review — does not save yet */
  pickFileDraft: () => Promise<
    | { ok: false; canceled: true }
    | {
        ok: true
        name: string
        config: string
        provider: string
        username?: string
        organization?: string
        serverHost?: string
        serverName?: string
        protocol?: string
      }
  >
  addFromDraft: (input: {
    name: string
    config: string
    provider?: string
    username?: string
    organization?: string
    serverHost?: string
    serverName?: string
    protocol?: string
  }) => Promise<void>
  updateProfile: (input: {
    id: string
    name?: string
    username?: string
    organization?: string
    serverHost?: string
    serverName?: string
    protocol?: string
    description?: string
  }) => Promise<{ ok: boolean; error?: string }>
  remove: (id: string) => Promise<void>
  connect: (
    id: string,
    options?: { preferExternal?: boolean; credentials?: VpnAuthCredentials }
  ) => Promise<{ ok: boolean; error?: string }>
  disconnect: (id?: string) => Promise<void>
  reveal: (id: string) => Promise<void>
  syncOrgProfiles: () => Promise<number>
  subscribeStatus: () => () => void
}

const emptyStatus: VpnRuntimeStatus = {
  activeProfileId: null,
  connectedProfileIds: [],
  status: 'disconnected',
  provider: null,
  tools: {
    openvpn: false,
    wireguard: false,
    tunnelblick: false,
    wireguardApp: false
  }
}

export const useVpnStore = create<VpnState>((set, get) => ({
  profiles: [],
  status: null,
  loading: false,
  error: null,

  hydrate: async () => {
    await get().refresh()
    if (useAuthStore.getState().me) {
      await get().syncOrgProfiles()
      await get().refresh()
    }
  },

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const data = await window.api.vpn.list()
      set({ profiles: data.profiles, status: data.status, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
        status: get().status ?? emptyStatus
      })
    }
  },

  addFromPaste: async (input) => {
    await window.api.vpn.add(input)
    await get().refresh()
  },

  pickFileDraft: async () => {
    return window.api.vpn.pickFile()
  },

  addFromDraft: async (input) => {
    await window.api.vpn.add(input)
    await get().refresh()
  },

  updateProfile: async (input) => {
    const res = await window.api.vpn.update(input)
    if (!res.ok) return { ok: false, error: res.error }
    await get().refresh()
    return { ok: true }
  },

  remove: async (id) => {
    await window.api.vpn.remove(id)
    await get().refresh()
  },

  connect: async (id, options) => {
    const result = await window.api.vpn.connect(
      id,
      options?.preferExternal,
      options?.credentials
    )
    await get().refresh()
    return { ok: result.ok, error: result.error }
  },

  disconnect: async (id) => {
    await window.api.vpn.disconnect(id)
    await get().refresh()
  },

  reveal: async (id) => {
    await window.api.vpn.reveal(id)
  },

  syncOrgProfiles: async () => {
    const me = useAuthStore.getState().me
    if (!me?.vpnProfiles?.length) {
      await window.api.vpn.syncOrgIds([])
      return 0
    }
    let synced = 0
    const remoteIds: string[] = []
    const errors: string[] = []
    for (const remote of me.vpnProfiles) {
      remoteIds.push(remote.id)
      if (remote.hasConfig === false) {
        errors.push(`${remote.name}: config not uploaded yet`)
        continue
      }
      try {
        const detail = await enterpriseApi<{
          id: string
          name: string
          provider: string
          description: string | null
          serverHost: string | null
          protocol: string | null
          config: string
        }>(`/vpn-profiles/${remote.id}/config`)
        const { parseVpnConfigMeta, detectVpnProvider } = await import('@shared/types/vpn')
        const meta = parseVpnConfigMeta(detail.config, detail.name)
        const provider = detectVpnProvider(
          detail.config,
          detail.provider || undefined,
          detail.name
        )
        await window.api.vpn.upsertOrg({
          remoteId: detail.id,
          name: detail.name,
          config: detail.config,
          provider,
          description: detail.description ?? undefined,
          username: meta.username,
          organization: meta.organization,
          serverHost: meta.serverHost ?? detail.serverHost ?? undefined,
          serverName: meta.serverName,
          protocol: meta.protocol ?? detail.protocol ?? undefined
        })
        synced++
      } catch (err) {
        errors.push(`${remote.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    await window.api.vpn.syncOrgIds(remoteIds)
    if (errors.length) {
      console.warn('[magiclens] VPN sync issues:', errors.join('; '))
    }
    return synced
  },

  subscribeStatus: () => {
    return window.api.vpn.onStatusChanged((status) => {
      set({ status })
    })
  }
}))
