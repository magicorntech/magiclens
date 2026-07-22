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
const STORAGE_KEY = 'magiclens.vpnSession.v1'

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

function pruneExpired(creds: Record<string, SessionCreds>): Record<string, SessionCreds> {
  const now = Date.now()
  const next: Record<string, SessionCreds> = {}
  for (const [id, entry] of Object.entries(creds)) {
    if (now - entry.pinAt <= PIN_TTL_MS) next[id] = entry
  }
  return next
}

function loadPersisted(): Record<string, SessionCreds> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SessionCreds>
    if (!parsed || typeof parsed !== 'object') return {}
    return pruneExpired(parsed)
  } catch {
    return {}
  }
}

function persist(creds: Record<string, SessionCreds>): void {
  try {
    const pruned = pruneExpired(creds)
    if (Object.keys(pruned).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
  } catch {
    // ignore quota / private mode
  }
}

export const useVpnSessionStore = create<VpnSessionState>((set, get) => ({
  credentialsByProfile: loadPersisted(),
  authPrompt: null,

  setCredentials: (profileId, creds) => {
    const now = Date.now()
    const next = {
      ...get().credentialsByProfile,
      [profileId]: {
        pin: creds.pin,
        mfaCode: creds.mfaCode,
        pinAt: now,
        mfaAt: now
      }
    }
    persist(next)
    set({ credentialsByProfile: next })
  },

  getCredentials: (profileId) => {
    const entry = get().credentialsByProfile[profileId]
    if (!entry) return null
    const now = Date.now()
    if (now - entry.pinAt > PIN_TTL_MS) {
      const next = { ...get().credentialsByProfile }
      delete next[profileId]
      persist(next)
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
      persist(next)
      set({ credentialsByProfile: next })
      return null
    }
    return entry.pin
  },

  clearCredentials: (profileId) => {
    if (!profileId) {
      persist({})
      set({ credentialsByProfile: {} })
      return
    }
    const next = { ...get().credentialsByProfile }
    delete next[profileId]
    persist(next)
    set({ credentialsByProfile: next })
  },

  requestAuthPrompt: (input) => set({ authPrompt: input }),

  clearAuthPrompt: () => set({ authPrompt: null })
}))
