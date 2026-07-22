export type Tokens = { accessToken: string; refreshToken: string }

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'TEAM_ADMIN' | 'MEMBER' | 'READ_ONLY'

export interface MeResponse {
  id: string
  name: string
  email: string
  status: string
  mustChangePassword?: boolean
  organization: {
    id: string
    name: string
    slug: string
    role: OrganizationRole
  } | null
  kubeconfigs: Array<{
    id: string
    name: string
    visibility: string
    serverEndpoint: string | null
    environment: string | null
    updatedAt?: string
    hasConfig?: boolean
  }>
  vpnProfiles?: Array<{
    id: string
    name: string
    description: string | null
    provider: string
    serverHost: string | null
    protocol: string | null
    updatedAt?: string
    hasConfig?: boolean
  }>
  unreadNotifications?: number
  /** Magiclens resource access: full | readonly | custom (with hidden kinds) */
  accessMode?: 'full' | 'readonly' | 'custom'
  /** Resource kinds hidden from this user in MagicLens UI */
  hiddenResourceKinds?: string[]
}

export interface UserNotification {
  id: string
  type: string
  title: string
  body: string | null
  resourceType: string | null
  resourceId: string | null
  readAt: string | null
  createdAt: string
}

const TOKEN_KEY = 'magiclens.enterprise.tokens'
const API_BASE_KEY = 'magiclens.enterprise.apiBase'

export function getApiBase(): string {
  try {
    return localStorage.getItem(API_BASE_KEY) || 'http://localhost:3000'
  } catch {
    return 'http://localhost:3000'
  }
}

export function setApiBase(url: string): void {
  localStorage.setItem(API_BASE_KEY, url.replace(/\/$/, ''))
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Tokens
  } catch {
    return null
  }
}

export function saveTokens(tokens: Tokens | null): void {
  if (!tokens) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

async function transport(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; body: string }> {
  const headers: Record<string, string> = {}
  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value
  })

  if (window.api?.enterprise?.request) {
    return window.api.enterprise.request({
      url,
      method: init.method,
      headers,
      body: typeof init.body === 'string' ? init.body : init.body != null ? String(init.body) : null
    })
  }

  try {
    const res = await fetch(url, init)
    return { ok: res.ok, status: res.status, body: await res.text() }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      status: 0,
      body: JSON.stringify({
        message: `Cannot reach MagicLens API (${message}). Start backend with npm run dev:infra && npm run dev:api`
      })
    }
  }
}

function parseErrorMessage(text: string, status: number): string {
  try {
    const json = JSON.parse(text) as { message?: string | string[] }
    if (Array.isArray(json.message)) return json.message.join(', ')
    if (json.message) return json.message
  } catch {
    // keep text
  }
  return text || `Request failed (${status})`
}

export async function enterpriseApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = loadTokens()
  const headers = new Headers(init.headers)
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json')
  if (tokens?.accessToken) headers.set('authorization', `Bearer ${tokens.accessToken}`)

  const base = getApiBase()
  let res = await transport(`${base}${path}`, { ...init, headers })

  if (res.status === 401 && tokens?.refreshToken) {
    const refreshed = await transport(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    })
    if (refreshed.ok) {
      const next = JSON.parse(refreshed.body) as Tokens
      saveTokens(next)
      headers.set('authorization', `Bearer ${next.accessToken}`)
      res = await transport(`${base}${path}`, { ...init, headers })
    } else {
      saveTokens(null)
    }
  }

  if (!res.ok) {
    throw new Error(parseErrorMessage(res.body, res.status))
  }
  if (res.status === 204 || !res.body) return undefined as T
  return JSON.parse(res.body) as T
}

export async function loginWithPassword(email: string, password: string) {
  const data = await enterpriseApi<{
    accessToken: string
    refreshToken: string
    mustChangePassword?: boolean
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  return data
}

/** @deprecated Use loginWithPassword */
export async function loginWithEmail(email: string, name?: string) {
  const data = await enterpriseApi<{
    accessToken: string
    refreshToken: string
  }>('/auth/dev/login', {
    method: 'POST',
    body: JSON.stringify({ email, name })
  })
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  return data
}

export function canAccessAdmin(role: OrganizationRole | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
