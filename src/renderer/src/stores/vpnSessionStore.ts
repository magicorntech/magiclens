import { create } from 'zustand'
import type { VpnAuthCredentials } from '@shared/types/vpn'

type SessionCreds = {
  pin: string
  mfaCode: string
  pinAt: number
  mfaAt: number
}

/** Keep PIN like Pritunl session (~5h). MFA/TOTP is only reusable briefly. */
const PIN_TTL_MS = 5 * 60 * 60 * 1000
const MFA_TTL_MS = 90_000

interface VpnSessionState {
  credentialsByProfile: Record<string, SessionCreds>
  authPrompt: { profileId: string; clusterId?: string; clusterName?: string } | null
  setCredentials: (profileId: string, creds: Omit<VpnAuthCredentials, 'username'>) => void
  /** Full PIN+MFA only when MFA is still fresh enough for OpenVPN reconnect. */
  getCredentials: (profileId: string) => Omit<VpnAuthCredentials, 'username'> | null
  getPin: (profileId: string) => string | null
  clearCredentials: (profileId?: string) => void
  requestAuthPrompt: (input: { profileId: string; clusterId?: string; clusterName?: string }) => void
  clearAuthPrompt: () => void
}

export const useVpnSessionStore = create<VpnSessionState>((set, get) => ({
  credentialsByProfile: {},
  authPrompt: null,

  setCredentials: (profileId, creds) => {
    const now = Date.now()
    set({
      credentialsByProfile: {
        ...get().credentialsByProfile,
        [profileId]: {
          pin: creds.pin,
          mfaCode: creds.mfaCode,
          pinAt: now,
          mfaAt: now
        }
      }
    })
  },

  getCredentials: (profileId) => {
    const entry = get().credentialsByProfile[profileId]
    if (!entry) return null
    const now = Date.now()
    if (now - entry.pinAt > PIN_TTL_MS) {
      const next = { ...get().credentialsByProfile }
      delete next[profileId]
      set({ credentialsByProfile: next })
      return null
    }
    if (now - entry.mfaAt > MFA_TTL_MS) return null
    return { pin: entry.pin, mfaCode: entry.mfaCode }
  },

  getPin: (profileId) => {
    const entry = get().credentialsByProfile[profileId]
    if (!entry) return null
    if (Date.now() - entry.pinAt > PIN_TTL_MS) {
      const next = { ...get().credentialsByProfile }
      delete next[profileId]
      set({ credentialsByProfile: next })
      return null
    }
    return entry.pin
  },

  clearCredentials: (profileId) => {
    if (!profileId) {
      set({ credentialsByProfile: {} })
      return
    }
    const next = { ...get().credentialsByProfile }
    delete next[profileId]
    set({ credentialsByProfile: next })
  },

  requestAuthPrompt: (input) => set({ authPrompt: input }),

  clearAuthPrompt: () => set({ authPrompt: null })
}))
