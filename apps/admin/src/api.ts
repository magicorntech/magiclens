const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type Tokens = { accessToken: string; refreshToken: string }

const TOKEN_KEY = 'magiclens.admin.tokens'

export function loadTokens(): Tokens | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Tokens
  } catch {
    return null
  }
}

export function saveTokens(tokens: Tokens | null): void {
  if (!tokens) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = loadTokens()
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  if (tokens?.accessToken) headers.set('authorization', `Bearer ${tokens.accessToken}`)

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401 && tokens?.refreshToken) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    })
    if (refreshed.ok) {
      const next = (await refreshed.json()) as Tokens
      saveTokens(next)
      headers.set('authorization', `Bearer ${next.accessToken}`)
      const retry = await fetch(`${API_BASE}${path}`, { ...init, headers })
      if (!retry.ok) throw new Error(await retry.text())
      return retry.json() as Promise<T>
    }
  }
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function login(email: string, name?: string) {
  const data = await api<{ accessToken: string; refreshToken: string }>('/auth/dev/login', {
    method: 'POST',
    body: JSON.stringify({ email, name })
  })
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  return data
}
