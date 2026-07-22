export type VpnProvider = 'openvpn' | 'wireguard' | 'pritunl' | 'generic'

export type VpnOrigin = 'local' | 'org'

export type VpnConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface VpnAuthCredentials {
  /** Usually taken from profile metadata; optional override */
  username?: string
  /** Not used for PIN+MFA VPNs — kept optional for compatibility */
  password?: string
  pin: string
  mfaCode: string
}

export interface VpnNetworkStats {
  interfaceName: string | null
  rxBytes: number
  txBytes: number
  rxRateBps: number
  txRateBps: number
  updatedAt: string
}

export interface VpnConfigMeta {
  username?: string
  serverHost?: string
  /** Pritunl logical server name e.g. "master" */
  serverName?: string
  protocol?: string
  organization?: string
  suggestedName?: string
  /** e.g. otp_pin */
  passwordMode?: string
}

export interface VpnProfileEntry {
  id: string
  name: string
  provider: VpnProvider
  origin: VpnOrigin
  remoteId?: string
  description?: string
  username?: string
  organization?: string
  serverHost?: string
  serverName?: string
  protocol?: string
  config: string
  updatedAt: string
  createdAt: string
}

export interface VpnProfileSummary {
  id: string
  name: string
  provider: VpnProvider
  origin: VpnOrigin
  remoteId?: string
  description?: string
  username?: string
  organization?: string
  serverHost?: string
  serverName?: string
  protocol?: string
  updatedAt: string
  createdAt: string
  hasConfig: boolean
  requiresAuth: boolean
}

export interface VpnRuntimeStatus {
  activeProfileId: string | null
  /** All currently connected VPN profile ids (multi-tunnel). */
  connectedProfileIds: string[]
  status: VpnConnectionStatus
  provider: VpnProvider | null
  message?: string
  connectedAt?: string
  stats?: VpnNetworkStats | null
  tools: {
    openvpn: boolean
    openvpnPath?: string
    wireguard: boolean
    wgQuickPath?: string
    tunnelblick: boolean
    wireguardApp: boolean
  }
}

export interface VpnConnectResult {
  ok: boolean
  status: VpnConnectionStatus
  error?: string
  method?: 'cli' | 'external'
}

export function detectVpnProvider(config: string, hint?: string, filename?: string): VpnProvider {
  const lowerHint = (hint ?? '').toLowerCase()
  const lowerName = (filename ?? '').toLowerCase()
  if (
    lowerHint.includes('pritunl') ||
    lowerName.includes('pritunl') ||
    /"password_mode"\s*:/.test(config) ||
    /"sync_hosts"\s*:/.test(config) ||
    /^\s*#\s*"user"\s*:/m.test(config)
  ) {
    return 'pritunl'
  }
  if (lowerHint.includes('wireguard') || lowerHint === 'wg') return 'wireguard'
  if (lowerHint.includes('openvpn') || lowerHint === 'ovpn') return 'openvpn'

  if (lowerName.endsWith('.ovpn')) {
    return /"organization"\s*:/.test(config) ? 'pritunl' : 'openvpn'
  }
  if (lowerName.endsWith('.conf') && /\[Interface\]/i.test(config)) return 'wireguard'

  if (/\[Interface\]/.test(config) && (/PrivateKey\s*=/.test(config) || /Address\s*=/.test(config))) {
    return 'wireguard'
  }
  if (/^\s*client\b/m.test(config) || /^\s*remote\s+/m.test(config) || /<ca>/.test(config)) {
    return /"password_mode"\s*:/.test(config) ? 'pritunl' : 'openvpn'
  }
  return 'generic'
}

export function vpnConfigExtension(provider: VpnProvider): '.ovpn' | '.conf' {
  return provider === 'wireguard' ? '.conf' : '.ovpn'
}

export function vpnRequiresAuth(provider: VpnProvider, config: string): boolean {
  if (provider === 'wireguard') return false
  if (/^\s*auth-user-pass\b/m.test(config)) return true
  if (provider === 'pritunl' || provider === 'openvpn') return true
  return false
}

export function vpnHasStaticChallenge(config: string): boolean {
  return /^\s*static-challenge\b/m.test(config)
}

/** Parse Pritunl profile JSON embedded as `# ...` comments at the top of .ovpn */
export function parsePritunlHeaderJson(config: string): Record<string, unknown> | null {
  const lines = config.split(/\r?\n/)
  const jsonLines: string[] = []
  let started = false
  let depth = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!started) {
      if (trimmed === '#{' || trimmed.startsWith('#{')) {
        started = true
        const body = trimmed.replace(/^#\s?/, '')
        jsonLines.push(body)
        depth += countJsonBraceDelta(body)
        continue
      }
      // allow blank / other comments before the JSON block
      if (trimmed === '' || (trimmed.startsWith('#') && !trimmed.startsWith('#{'))) continue
      break
    }
    if (!trimmed.startsWith('#')) break
    const body = trimmed.replace(/^#\s?/, '')
    jsonLines.push(body)
    depth += countJsonBraceDelta(body)
    if (depth <= 0) break
  }
  if (jsonLines.length === 0) return null
  const raw = jsonLines.join('\n')
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1')) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function countJsonBraceDelta(fragment: string): number {
  let delta = 0
  let inString = false
  let escaped = false
  for (let i = 0; i < fragment.length; i++) {
    const ch = fragment[i]!
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === '[') delta++
    else if (ch === '}' || ch === ']') delta--
  }
  return delta
}

/**
 * Extract username / server / organization from OpenVPN / Pritunl / WireGuard config.
 * Pritunl stores real fields in a JSON comment block — do NOT use setenv UV_NAME as username.
 */
export function parseVpnConfigMeta(config: string, filename?: string): VpnConfigMeta {
  const meta: VpnConfigMeta = {}

  const pritunl = parsePritunlHeaderJson(config)
  if (pritunl) {
    if (typeof pritunl.user === 'string' && pritunl.user.trim()) {
      meta.username = pritunl.user.trim()
    }
    if (typeof pritunl.organization === 'string' && pritunl.organization.trim()) {
      meta.organization = pritunl.organization.trim()
    }
    if (typeof pritunl.server === 'string' && pritunl.server.trim()) {
      meta.serverName = pritunl.server.trim()
    }
    if (typeof pritunl.password_mode === 'string') {
      meta.passwordMode = pritunl.password_mode
    }
  }

  // remote host (actual VPN endpoint) — e.g. remote 34.107.68.139 10329 udp
  const remote = /^\s*remote\s+(\S+)(?:\s+(\d+))?(?:\s+(\S+))?/im.exec(config)
  if (remote) {
    meta.serverHost = remote[1]
    if (remote[3]) meta.protocol = remote[3]
  }

  if (!meta.serverHost && Array.isArray(pritunl?.sync_hosts) && pritunl.sync_hosts[0]) {
    meta.serverHost = String(pritunl.sync_hosts[0]).replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  const endpoint = /^\s*Endpoint\s*=\s*([^:\s]+)/im.exec(config)
  if (!meta.serverHost && endpoint) meta.serverHost = endpoint[1]

  const proto = /^\s*proto\s+(\S+)/im.exec(config)
  if (proto) meta.protocol = proto[1]

  // Explicit username env only — never UV_NAME (device id like radium-9647)
  if (!meta.username) {
    const setenvUser = /^\s*setenv\s+(?:UV_USERNAME|USERNAME|USER)\s+(.+)$/im.exec(config)
    if (setenvUser) meta.username = setenvUser[1]!.trim().replace(/^"|"$/g, '')
  }

  if (!meta.username) {
    const commentUser = /^\s*#\s*"user"\s*:\s*"([^"]+)"/im.exec(config)
    if (commentUser) meta.username = commentUser[1]
  }

  if (!meta.organization) {
    const setenvOrg =
      /^\s*setenv\s+(?:UV_ORG|ORGANIZATION|ORG|UV_ORGANIZATION)\s+(.+)$/im.exec(config)
    if (setenvOrg) meta.organization = setenvOrg[1]!.trim().replace(/^"|"$/g, '')
  }

  if (!meta.organization) {
    const commentOrg = /^\s*#\s*"organization"\s*:\s*"([^"]+)"/im.exec(config)
    if (commentOrg) meta.organization = commentOrg[1]
  }

  if (filename) {
    meta.suggestedName = filename.replace(/\.(ovpn|conf)$/i, '')
  }

  return meta
}

/** Build OpenVPN auth password line from PIN + MFA (Pritunl otp_pin = no account password). */
export function buildVpnAuthPassword(
  credentials: VpnAuthCredentials,
  options?: { staticChallenge?: boolean }
): string {
  const pin = credentials.pin.trim()
  const mfa = credentials.mfaCode.trim()
  const password = credentials.password?.trim() ?? ''

  if (options?.staticChallenge) {
    const enc = (s: string): string => {
      if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf8').toString('base64')
      return btoa(unescape(encodeURIComponent(s)))
    }
    const passPart = password || pin
    const response = mfa || pin
    return `SCRV1:${enc(passPart)}:${enc(response)}`
  }

  // Pritunl password_mode otp_pin: password field = PIN + OTP
  return `${password}${pin}${mfa}`
}

export function formatBitrate(bps: number): string {
  if (!Number.isFinite(bps) || bps < 0) return '0 B/s'
  if (bps < 1024) return `${bps.toFixed(0)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  if (bps < 1024 * 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
  return `${(bps / (1024 * 1024 * 1024)).toFixed(2)} GB/s`
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
