import { create } from 'zustand'
import {
  canAccessAdmin,
  enterpriseApi,
  getApiBase,
  loadTokens,
  loginWithPassword,
  saveTokens,
  setApiBase,
  type MeResponse,
  type OrganizationRole,
  type UserNotification
} from '../enterprise/api'
import { syncOrgAssignments } from '../enterprise/sync'
import { resolveUserScope, switchWorkspace } from '../workspace'
import { useVpnStore } from './vpnStore'
import { useVpnSessionStore } from './vpnSessionStore'

interface AuthState {
  hydrated: boolean
  offlineMode: boolean
  loading: boolean
  error: string | null
  me: MeResponse | null
  apiBase: string
  notifications: UserNotification[]
  mustChangePassword: boolean

  hydrate: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  continueOffline: () => void
  requireLogin: () => void
  setApiBaseUrl: (url: string) => void
  refreshMe: () => Promise<void>
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>
  syncAssignments: () => Promise<{ newNotifications: UserNotification[] }>
  markNotificationsRead: (ids?: string[]) => Promise<void>
  isAdmin: () => boolean
  role: () => OrganizationRole | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  offlineMode: false,
  loading: false,
  error: null,
  me: null,
  apiBase: getApiBase(),
  notifications: [],
  mustChangePassword: false,

  hydrate: async () => {
    const tokens = loadTokens()
    const offline = localStorage.getItem('magiclens.enterprise.offline') === '1'
    if (!tokens) {
      set({ hydrated: true, offlineMode: offline, me: null })
      return
    }
    try {
      const me = await enterpriseApi<MeResponse>('/auth/me')
      set({
        hydrated: true,
        me,
        offlineMode: false,
        error: null,
        mustChangePassword: !!me.mustChangePassword
      })
    } catch {
      saveTokens(null)
      set({ hydrated: true, me: null, offlineMode: offline })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const session = await loginWithPassword(email, password)
      localStorage.removeItem('magiclens.enterprise.offline')
      const me = await enterpriseApi<MeResponse>('/auth/me')
      set({
        me,
        offlineMode: false,
        loading: false,
        error: null,
        mustChangePassword: !!(session.mustChangePassword || me.mustChangePassword)
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      })
      throw err
    }
  },

  logout: async () => {
    const tokens = loadTokens()
    try {
      if (tokens?.refreshToken) {
        await enterpriseApi('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        })
      }
    } catch {
      // ignore
    }
    try {
      await window.api.vpn.disconnect()
    } catch {
      // ignore
    }
    saveTokens(null)
    useVpnSessionStore.getState().clearCredentials()
    useVpnSessionStore.getState().clearAuthPrompt()
    set({ me: null, offlineMode: false, notifications: [], mustChangePassword: false })
    await switchWorkspace('offline')
    await useVpnStore.getState().refresh()
  },

  continueOffline: () => {
    localStorage.setItem('magiclens.enterprise.offline', '1')
    set({ offlineMode: true, me: null, error: null })
  },

  requireLogin: () => {
    localStorage.removeItem('magiclens.enterprise.offline')
    set({ offlineMode: false })
  },

  setApiBaseUrl: (url) => {
    setApiBase(url)
    set({ apiBase: getApiBase() })
  },

  refreshMe: async () => {
    const me = await enterpriseApi<MeResponse>('/auth/me')
    set({ me, mustChangePassword: !!me.mustChangePassword })
  },

  changePassword: async (newPassword, currentPassword) => {
    await enterpriseApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, currentPassword })
    })
    set({ mustChangePassword: false })
    await get().refreshMe()
  },

  syncAssignments: async () => {
    if (!get().me) return { newNotifications: [] }
    const prevUnread = get().me?.unreadNotifications ?? 0
    const [me, notifications] = await Promise.all([
      enterpriseApi<MeResponse>('/auth/me'),
      enterpriseApi<UserNotification[]>('/notifications?unread=1')
    ])
    const known = new Set(get().notifications.map((n) => n.id))
    const newNotifications =
      me.unreadNotifications && me.unreadNotifications > prevUnread
        ? notifications.filter((n) => !known.has(n.id))
        : notifications.filter((n) => !known.has(n.id))
    set({
      me,
      notifications,
      mustChangePassword: !!me.mustChangePassword
    })
    try {
      await syncOrgAssignments()
    } catch {
      // ignore sync errors during background poll
    }
    return { newNotifications }
  },

  markNotificationsRead: async (ids) => {
    await enterpriseApi('/notifications/read', {
      method: 'POST',
      body: JSON.stringify(ids?.length ? { ids } : { all: true })
    })
    await get().syncAssignments()
  },

  isAdmin: () => canAccessAdmin(get().me?.organization?.role),

  role: () => get().me?.organization?.role ?? null
}))
