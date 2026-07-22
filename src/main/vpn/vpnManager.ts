import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, chmodSync, unlinkSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app, BrowserWindow, shell } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  VpnAuthCredentials,
  VpnConnectResult,
  VpnConnectionStatus,
  VpnNetworkStats,
  VpnProvider,
  VpnRuntimeStatus
} from '@shared/types/vpn'
import {
  buildVpnAuthPassword,
  vpnConfigExtension,
  vpnHasStaticChallenge,
  vpnRequiresAuth
} from '@shared/types/vpn'
import { getVpnProfile, listVpnProfiles } from '../persistence/vpnStore'

const execFileAsync = promisify(execFile)

interface ActiveSession {
  profileId: string
  provider: VpnProvider
  process: ChildProcess | null
  configPath: string
  authPath?: string
  interfaceName?: string
  connectedAt: string
  method: 'cli' | 'external'
}

class VpnManager {
  private sessions = new Map<string, ActiveSession>()
  private focusProfileId: string | null = null
  private status: VpnConnectionStatus = 'disconnected'
  private message?: string
  private stats: VpnNetworkStats | null = null
  private statsTimer: NodeJS.Timeout | null = null
  private lastSample: { rx: number; tx: number; at: number; iface: string } | null = null

  private vpnDir(): string {
    const dir = join(app.getPath('userData'), 'vpn')
    mkdirSync(dir, { recursive: true })
    return dir
  }

  private primarySession(): ActiveSession | null {
    if (this.focusProfileId && this.sessions.has(this.focusProfileId)) {
      return this.sessions.get(this.focusProfileId) ?? null
    }
    const first = this.sessions.values().next()
    return first.done ? null : first.value
  }

  private async which(bin: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [bin], {
        env: process.env
      })
      const path = stdout.trim().split(/\r?\n/)[0]
      return path && existsSync(path) ? path : null
    } catch {
      return null
    }
  }

  private async detectTools(): Promise<VpnRuntimeStatus['tools']> {
    const openvpnPath = (await this.which('openvpn')) ?? undefined
    const wgQuickPath = (await this.which('wg-quick')) ?? undefined
    const tunnelblick =
      process.platform === 'darwin' && existsSync('/Applications/Tunnelblick.app')
    const wireguardApp =
      process.platform === 'darwin' && existsSync('/Applications/WireGuard.app')
    return {
      openvpn: !!openvpnPath,
      openvpnPath,
      wireguard: !!wgQuickPath,
      wgQuickPath,
      tunnelblick,
      wireguardApp
    }
  }

  async getStatus(): Promise<VpnRuntimeStatus> {
    await this.recoverOrphanSessions()
    const tools = await this.detectTools()
    const primary = this.primarySession()
    const connected =
      this.status === 'connecting' || this.status === 'error'
        ? this.status
        : this.sessions.size > 0
          ? 'connected'
          : 'disconnected'
    return {
      activeProfileId: primary?.profileId ?? null,
      connectedProfileIds: [...this.sessions.keys()],
      status: connected,
      provider: primary?.provider ?? null,
      message: this.message,
      connectedAt: primary?.connectedAt,
      stats: connected === 'connected' ? this.stats : null,
      tools
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch (err) {
      // Root-owned OpenVPN: signal 0 returns EPERM when the process exists.
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as NodeJS.ErrnoException).code
          : undefined
      return code === 'EPERM'
    }
  }

  private readPidFile(profileId: string): number | null {
    const pidPath = join(this.vpnDir(), `${profileId}.pid`)
    if (!existsSync(pidPath)) return null
    try {
      const pid = Number(readFileSync(pidPath, 'utf8').trim())
      return Number.isFinite(pid) && pid > 0 ? pid : null
    } catch {
      return null
    }
  }

  private clearPidFile(profileId: string): void {
    const pidPath = join(this.vpnDir(), `${profileId}.pid`)
    try {
      if (existsSync(pidPath)) unlinkSync(pidPath)
    } catch {
      // ignore
    }
  }

  private wireguardIface(profileId: string): string {
    return `ml-${profileId.slice(0, 8)}`
  }

  private async interfaceExists(name: string): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        await execFileAsync('ifconfig', [name])
        return true
      }
      await execFileAsync('ip', ['link', 'show', name])
      return true
    } catch {
      return false
    }
  }

  /**
   * OpenVPN is started with --daemon, so tunnels survive app quit.
   * Rebuild in-memory sessions from pid files / WG interfaces on restart.
   */
  private syncSessionsWithOs(): void {
    let changed = false

    for (const [id, session] of [...this.sessions.entries()]) {
      if (session.method !== 'cli') continue
      if (session.process && !session.process.killed) continue

      if (session.provider === 'wireguard' || session.interfaceName?.startsWith('ml-')) {
        // Checked async in getStatus path — use pid/file heuristic only here;
        // WG recovery uses interfaceExists from recoverOrphans (async). Skip prune here.
        continue
      }

      const pid = this.readPidFile(id)
      if (!pid || !this.isProcessAlive(pid)) {
        this.sessions.delete(id)
        if (pid) this.clearPidFile(id)
        if (this.focusProfileId === id) {
          this.focusProfileId = this.sessions.keys().next().value ?? null
        }
        changed = true
      }
    }

    for (const summary of listVpnProfiles()) {
      if (this.sessions.has(summary.id)) continue
      const profile = getVpnProfile(summary.id)
      if (!profile) continue

      if (profile.provider === 'wireguard') {
        // Async recovery handled in recoverOrphanSessionsAsync
        continue
      }

      const pid = this.readPidFile(profile.id)
      if (!pid) continue
      if (!this.isProcessAlive(pid)) {
        this.clearPidFile(profile.id)
        continue
      }

      this.sessions.set(profile.id, {
        profileId: profile.id,
        provider: profile.provider,
        process: null,
        configPath: this.writeConfigFile(profile.id, profile.provider, profile.config),
        connectedAt: new Date().toISOString(),
        method: 'cli'
      })
      changed = true
    }

    if (changed) {
      if (this.sessions.size > 0) {
        if (!this.focusProfileId || !this.sessions.has(this.focusProfileId)) {
          this.focusProfileId = this.sessions.keys().next().value ?? null
        }
        this.status = 'connected'
        this.message = `Connected · ${this.sessions.size} tunnel(s)`
        this.startStatsPolling()
      } else {
        this.focusProfileId = null
        this.status = 'disconnected'
        this.message = undefined
        this.stopStatsPolling()
        this.stats = null
      }
    }
  }

  /** WireGuard ifaces need async checks — call from getStatus/connect. */
  async recoverOrphanSessions(): Promise<void> {
    this.syncSessionsWithOs()
    let changed = false

    for (const summary of listVpnProfiles()) {
      if (this.sessions.has(summary.id)) continue
      const profile = getVpnProfile(summary.id)
      if (!profile || profile.provider !== 'wireguard') continue

      const iface = this.wireguardIface(profile.id)
      if (!(await this.interfaceExists(iface))) continue

      const wgPath = join(this.vpnDir(), `${iface}.conf`)
      this.sessions.set(profile.id, {
        profileId: profile.id,
        provider: profile.provider,
        process: null,
        configPath: existsSync(wgPath) ? wgPath : this.writeConfigFile(profile.id, 'wireguard', profile.config),
        interfaceName: iface,
        connectedAt: new Date().toISOString(),
        method: 'cli'
      })
      changed = true
    }

    // Drop WG sessions whose iface is gone
    for (const [id, session] of [...this.sessions.entries()]) {
      if (session.provider !== 'wireguard' && !session.interfaceName?.startsWith('ml-')) continue
      if (session.method !== 'cli') continue
      const iface = session.interfaceName ?? this.wireguardIface(id)
      if (!(await this.interfaceExists(iface))) {
        this.sessions.delete(id)
        if (this.focusProfileId === id) {
          this.focusProfileId = this.sessions.keys().next().value ?? null
        }
        changed = true
      }
    }

    if (changed) {
      if (this.sessions.size > 0) {
        if (!this.focusProfileId || !this.sessions.has(this.focusProfileId)) {
          this.focusProfileId = this.sessions.keys().next().value ?? null
        }
        this.status = 'connected'
        this.message = `Connected · ${this.sessions.size} tunnel(s)`
        this.startStatsPolling()
      } else {
        this.focusProfileId = null
        this.status = 'disconnected'
        this.message = undefined
        this.stopStatsPolling()
        this.stats = null
      }
    }
  }

  private broadcast(): void {
    void this.getStatus().then((status) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IPC.VPN_STATUS_CHANGED, status)
      }
    })
  }

  private setState(status: VpnConnectionStatus, message?: string): void {
    this.status = status
    this.message = message
    if (status !== 'connected') {
      this.stopStatsPolling()
      this.stats = null
      this.lastSample = null
    }
    this.broadcast()
  }

  private writeConfigFile(profileId: string, provider: VpnProvider, config: string): string {
    const ext = vpnConfigExtension(provider === 'pritunl' ? 'openvpn' : provider)
    const path = join(this.vpnDir(), `${profileId}${ext}`)
    writeFileSync(path, config, { encoding: 'utf8', mode: 0o600 })
    try {
      chmodSync(path, 0o600)
    } catch {
      // ignore
    }
    return path
  }

  private writeAuthFile(profileId: string, username: string, passwordLine: string): string {
    const path = join(this.vpnDir(), `${profileId}.auth`)
    writeFileSync(path, `${username}\n${passwordLine}\n`, { encoding: 'utf8', mode: 0o600 })
    try {
      chmodSync(path, 0o600)
    } catch {
      // ignore
    }
    return path
  }

  private scrubAuthUserPass(config: string): string {
    return config
      .split(/\r?\n/)
      .filter((line) => !/^\s*auth-user-pass\b/i.test(line))
      .join('\n')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** Ensure OpenVPN log/pid are user-readable after elevated daemon writes them. */
  private prepareOpenVpnSidecars(logPath: string, pidPath: string): void {
    for (const path of [logPath, pidPath]) {
      try {
        if (!existsSync(path)) writeFileSync(path, '', { encoding: 'utf8', mode: 0o666 })
        chmodSync(path, 0o666)
      } catch {
        // ignore
      }
    }
  }

  private readLogTail(logPath: string, maxChars = 8000): string {
    try {
      const raw = readFileSync(logPath, 'utf8')
      return raw.length > maxChars ? raw.slice(-maxChars) : raw
    } catch {
      return ''
    }
  }

  /**
   * Wait until THIS OpenVPN process brings up a new tunnel.
   * Ignore pre-existing utuns/routes from other VPN profiles (multi-tunnel).
   */
  private async waitForOpenVpnReady(
    logPath: string,
    timeoutMs = 60_000,
    baselineIfaces: Set<string> = new Set()
  ): Promise<{ ok: true; iface?: string } | { ok: false; error: string }> {
    const started = Date.now()
    let lastTail = ''
    let sawLog = false

    while (Date.now() - started < timeoutMs) {
      lastTail = this.readLogTail(logPath)
      if (lastTail) sawLog = true

      if (
        sawLog &&
        /auth_failed|authentication failed|auth failed|tls handshake failed|cannot resolve host|exiting due to fatal error|private key password verification failed/i.test(
          lastTail
        )
      ) {
        const hint = lastTail
          .split(/\r?\n/)
          .filter((l) => /auth|error|fatal|tls|password/i.test(l))
          .slice(-6)
          .join(' · ')
        return {
          ok: false,
          error: hint || 'OpenVPN authentication/connection failed — check username, PIN and MFA'
        }
      }

      const ifaces = await this.listTunnelInterfaces()
      const newIface = ifaces.find((iface) => !baselineIfaces.has(iface))
      const logSaysReady =
        /Initialization Sequence Completed|CONNECTED,SUCCESS|Tunnel is up|Initialization Sequence Completed With Errors/i.test(
          lastTail
        )

      // Require a NEW tunnel iface (or clear log success after enough time without baseline tunnels).
      if (newIface && (logSaysReady || Date.now() - started > 3000)) {
        return { ok: true, iface: newIface }
      }
      if (logSaysReady && newIface) {
        return { ok: true, iface: newIface }
      }
      // Single-tunnel case: no baseline, log ready, any tunnel iface
      if (logSaysReady && baselineIfaces.size === 0 && ifaces[0] && Date.now() - started > 2000) {
        return { ok: true, iface: ifaces[0] }
      }

      this.setState(
        'connecting',
        sawLog && /auth|password|challenge/i.test(lastTail)
          ? 'Authenticating with VPN…'
          : sawLog && /tls|handshake/i.test(lastTail)
            ? 'TLS handshake…'
            : 'Waiting for VPN tunnel…'
      )
      await this.sleep(500)
    }

    const ifaces = await this.listTunnelInterfaces()
    const newIface = ifaces.find((iface) => !baselineIfaces.has(iface))
    if (newIface) {
      return { ok: true, iface: newIface }
    }

    const hint = lastTail
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-8)
      .join(' · ')
    return {
      ok: false,
      error:
        hint ||
        'VPN timed out before the tunnel was ready. Routes to private clusters were not installed.'
    }
  }

  private async listTunnelInterfaces(): Promise<string[]> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execFileAsync('ifconfig', ['-l'], { timeout: 3000 })
        return stdout
          .trim()
          .split(/\s+/)
          .filter((iface) => /^(utun|tun|tap|wg|ml-)/i.test(iface))
      }
      const { stdout } = await execFileAsync('ls', ['/sys/class/net'], { timeout: 3000 })
      return stdout
        .trim()
        .split(/\s+/)
        .filter((iface) => /^(tun|tap|wg|ml-|utun)/i.test(iface))
    } catch {
      return []
    }
  }

  /** True when routing table has a private (RFC1918) route via a tunnel iface. */
  private async hasPrivateVpnRoute(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execFileAsync('netstat', ['-rn', '-f', 'inet'], { timeout: 3000 })
        return stdout.split('\n').some((line) => {
          const cols = line.trim().split(/\s+/)
          if (cols.length < 4) return false
          const dest = cols[0] ?? ''
          const iface = cols[cols.length - 1] ?? ''
          if (!/^(utun|tun|tap|wg|ml-)/i.test(iface)) return false
          return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(dest)
        })
      }
      const { stdout } = await execFileAsync('ip', ['route'], { timeout: 3000 })
      return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(stdout)
    } catch {
      return false
    }
  }

  /** Prefer a tunnel iface that has an IPv4 address (real OpenVPN/WG), not empty system utuns. */
  private async detectTunnelInterface(): Promise<string | null> {
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await execFileAsync('ifconfig', [], { timeout: 4000 })
        const blocks = stdout.split(/\n(?=\w)/)
        const scored: Array<{ iface: string; score: number }> = []
        for (const block of blocks) {
          const name = /^(\w+):/.exec(block)?.[1]
          if (!name || !/^(utun|tun|tap|wg|ml-)/i.test(name)) continue
          let score = 0
          if (/\binet\s+\d+\.\d+\.\d+\.\d+/.test(block)) score += 10
          if (/\binet\s+10\./.test(block) || /\binet\s+172\.(1[6-9]|2\d|3[01])\./.test(block)) {
            score += 20
          }
          if (/\binet\s+192\.168\./.test(block)) score += 15
          if (score > 0) scored.push({ iface: name, score })
        }
        scored.sort((a, b) => b.score - a.score)
        if (scored[0]) return scored[0].iface
      } catch {
        // fall through
      }
    }
    const sample = await this.readInterfaceCounters()
    return sample?.iface ?? null
  }

  private async runElevated(command: string): Promise<void> {
    if (process.platform === 'darwin') {
      const script = `do shell script ${JSON.stringify(command)} with administrator privileges`
      await execFileAsync('osascript', ['-e', script], { timeout: 120_000 })
      return
    }
    if (process.platform === 'linux') {
      await execFileAsync('pkexec', ['bash', '-lc', command], { timeout: 120_000 })
      return
    }
    await execFileAsync('cmd', ['/c', command], { timeout: 120_000, shell: true })
  }

  async connect(
    profileId: string,
    preferExternal = false,
    credentials?: VpnAuthCredentials
  ): Promise<VpnConnectResult> {
    const profile = getVpnProfile(profileId)
    if (!profile) return { ok: false, status: 'error', error: 'VPN profile not found' }
    if (!profile.config.trim()) {
      return { ok: false, status: 'error', error: 'VPN profile has no config content' }
    }

    // Re-attach tunnels left running after a previous app quit.
    await this.recoverOrphanSessions()

    const needsAuth = vpnRequiresAuth(profile.provider, profile.config)
    if (needsAuth && !preferExternal) {
      const username = credentials?.username?.trim() || profile.username?.trim()
      if (!username) {
        return {
          ok: false,
          status: 'error',
          error: 'VPN profile has no username — re-import the .ovpn or set username in the profile'
        }
      }
      if (!credentials?.pin?.trim() || !credentials.mfaCode?.trim()) {
        return {
          ok: false,
          status: 'error',
          error: 'PIN and MFA code are required'
        }
      }
    }

    // Already connected — keep tunnel (Pritunl-style session). Just focus it.
    const existing = this.sessions.get(profileId)
    if (existing) {
      this.focusProfileId = profileId
      this.setState('connected', `Already connected · ${profile.name}`)
      this.startStatsPolling()
      return { ok: true, status: 'connected', method: existing.method }
    }

    const effectiveProvider: 'openvpn' | 'wireguard' =
      profile.provider === 'wireguard' ? 'wireguard' : 'openvpn'

    this.focusProfileId = profileId
    this.setState('connecting', `Connecting ${profile.name}…`)

    let configBody = profile.config
    let authPath: string | undefined
    const authUsername = credentials?.username?.trim() || profile.username?.trim()
    if (authUsername && credentials?.pin && credentials.mfaCode && effectiveProvider !== 'wireguard') {
      const passwordLine = buildVpnAuthPassword(
        {
          username: authUsername,
          pin: credentials.pin,
          mfaCode: credentials.mfaCode,
          password: credentials.password
        },
        { staticChallenge: vpnHasStaticChallenge(profile.config) }
      )
      authPath = this.writeAuthFile(profile.id, authUsername, passwordLine)
      configBody = this.scrubAuthUserPass(profile.config)
    }

    const configPath = this.writeConfigFile(profile.id, profile.provider, configBody)
    const tools = await this.detectTools()
    const baselineIfaces = new Set(await this.listTunnelInterfaces())

    try {
      if (preferExternal || (!tools.openvpn && !tools.wireguard)) {
        const external = await this.openExternal(configPath, effectiveProvider, tools)
        if (external.ok) {
          this.setState('connecting', 'Waiting for system VPN app tunnel…')
          const iface = await this.waitForExternalTunnel(25_000, baselineIfaces)
          if (!iface) {
            this.setState(
              'error',
              'System VPN app opened but no tunnel interface appeared. Connect inside Tunnelblick/WireGuard, then retry.'
            )
            return {
              ok: false,
              status: 'error',
              error:
                'VPN app opened but tunnel is not up yet. Finish connecting in Tunnelblick/WireGuard, then try cluster again.'
            }
          }
          this.sessions.set(profileId, {
            profileId,
            provider: profile.provider,
            process: null,
            configPath,
            authPath,
            interfaceName: iface,
            connectedAt: new Date().toISOString(),
            method: 'external'
          })
          this.focusProfileId = profileId
          this.setState('connected', `${external.message ?? 'Opened in system VPN app'} (${iface})`)
          this.startStatsPolling()
          return { ok: true, status: 'connected', method: 'external' }
        }
        if (preferExternal) {
          this.setState('error', external.error)
          return { ok: false, status: 'error', error: external.error }
        }
      }

      if (effectiveProvider === 'wireguard') {
        if (!tools.wgQuickPath) {
          const external = await this.openExternal(configPath, 'wireguard', tools)
          if (external.ok) {
            this.sessions.set(profileId, {
              profileId,
              provider: profile.provider,
              process: null,
              configPath,
              connectedAt: new Date().toISOString(),
              method: 'external'
            })
            this.focusProfileId = profileId
            this.setState('connected', external.message)
            this.startStatsPolling()
            return { ok: true, status: 'connected', method: 'external' }
          }
          this.setState('error', 'WireGuard tools not found.')
          return {
            ok: false,
            status: 'error',
            error: 'WireGuard tools not found. Install with: brew install wireguard-tools'
          }
        }
        const iface = `ml-${profile.id.slice(0, 8)}`
        const wgPath = join(this.vpnDir(), `${iface}.conf`)
        writeFileSync(wgPath, profile.config, { mode: 0o600 })
        await this.runElevated(`"${tools.wgQuickPath}" up "${wgPath}"`)
        this.sessions.set(profileId, {
          profileId,
          provider: profile.provider,
          process: null,
          configPath: wgPath,
          interfaceName: iface,
          connectedAt: new Date().toISOString(),
          method: 'cli'
        })
        this.focusProfileId = profileId
        this.setState('connected', `WireGuard up (${iface})`)
        this.startStatsPolling()
        return { ok: true, status: 'connected', method: 'cli' }
      }

      if (!tools.openvpnPath) {
        const external = await this.openExternal(configPath, 'openvpn', tools)
        if (external.ok) {
          this.sessions.set(profileId, {
            profileId,
            provider: profile.provider,
            process: null,
            configPath,
            authPath,
            connectedAt: new Date().toISOString(),
            method: 'external'
          })
          this.focusProfileId = profileId
          this.setState('connected', external.message)
          this.startStatsPolling()
          return { ok: true, status: 'connected', method: 'external' }
        }
        this.setState('error', 'OpenVPN not found.')
        return {
          ok: false,
          status: 'error',
          error: 'OpenVPN not found. Install with: brew install openvpn — or install Tunnelblick'
        }
      }

      const logPath = join(this.vpnDir(), `${profile.id}.log`)
      const pidPath = join(this.vpnDir(), `${profile.id}.pid`)
      this.prepareOpenVpnSidecars(logPath, pidPath)
      try {
        writeFileSync(logPath, '', { encoding: 'utf8' })
        chmodSync(logPath, 0o666)
      } catch {
        // ignore
      }

      const authArg = authPath ? ` --auth-user-pass "${authPath}"` : ''
      // chmod after start: elevated OpenVPN recreates the log as root:600 otherwise Magiclens can't read it.
      const cmd = `"${tools.openvpnPath}" --config "${configPath}"${authArg} --daemon --writepid "${pidPath}" --log "${logPath}" --verb 3; chmod 666 "${logPath}" "${pidPath}" 2>/dev/null || true`
      try {
        await this.runElevated(cmd)
        const ready = await this.waitForOpenVpnReady(logPath, 60_000, baselineIfaces)
        if (!ready.ok) {
          try {
            await this.runElevated(`kill $(cat "${pidPath}") 2>/dev/null || true`)
          } catch {
            // ignore
          }
          this.secureCleanupAuth(authPath)
          this.setState('error', ready.error)
          return { ok: false, status: 'error', error: ready.error }
        }
        this.sessions.set(profileId, {
          profileId,
          provider: profile.provider,
          process: null,
          configPath,
          authPath,
          interfaceName: ready.iface,
          connectedAt: new Date().toISOString(),
          method: 'cli'
        })
        this.focusProfileId = profileId
        this.setState(
          'connected',
          ready.iface ? `OpenVPN connected (${ready.iface})` : 'OpenVPN connected'
        )
        this.startStatsPolling()
        return { ok: true, status: 'connected', method: 'cli' }
      } catch (elevatedErr) {
        const args = ['--config', configPath, '--log', logPath, '--verb', '3']
        if (authPath) args.push('--auth-user-pass', authPath)
        const child = spawn(tools.openvpnPath, args, { stdio: 'ignore', detached: false })
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => resolve(), 1500)
          child.once('error', (err) => {
            clearTimeout(timer)
            reject(err)
          })
          child.once('exit', (code) => {
            clearTimeout(timer)
            if (code && code !== 0) {
              const hint = this.readLogTail(logPath, 500)
              reject(
                new Error(
                  `OpenVPN exited early (code ${code}). Check PIN/MFA. ${
                    elevatedErr instanceof Error ? elevatedErr.message : ''
                  } ${hint}`
                )
              )
            } else {
              resolve()
            }
          })
        })

        const ready = await this.waitForOpenVpnReady(logPath, 60_000, baselineIfaces)
        if (!ready.ok) {
          try {
            child.kill('SIGTERM')
          } catch {
            // ignore
          }
          this.secureCleanupAuth(authPath)
          this.setState('error', ready.error)
          return { ok: false, status: 'error', error: ready.error }
        }

        this.sessions.set(profileId, {
          profileId,
          provider: profile.provider,
          process: child,
          configPath,
          authPath,
          interfaceName: ready.iface,
          connectedAt: new Date().toISOString(),
          method: 'cli'
        })
        this.focusProfileId = profileId
        this.setState(
          'connected',
          ready.iface ? `OpenVPN connected (${ready.iface})` : 'OpenVPN connected'
        )
        this.startStatsPolling()
        return { ok: true, status: 'connected', method: 'cli' }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.secureCleanupAuth(authPath)
      this.setState('error', error)
      return { ok: false, status: 'error', error }
    }
  }

  private secureCleanupAuth(authPath?: string): void {
    if (!authPath) return
    try {
      if (existsSync(authPath)) unlinkSync(authPath)
    } catch {
      // ignore
    }
  }

  private startStatsPolling(): void {
    this.stopStatsPolling()
    void this.refreshStats()
    this.statsTimer = setInterval(() => {
      void this.refreshStats()
    }, 1000)
  }

  private stopStatsPolling(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer)
      this.statsTimer = null
    }
  }

  private async refreshStats(): Promise<void> {
    const primary = this.primarySession()
    if (!primary || this.status === 'connecting') return
    try {
      const sample = await this.readInterfaceCounters(primary.interfaceName)
      if (!sample) {
        this.stats = {
          interfaceName: primary.interfaceName ?? null,
          rxBytes: 0,
          txBytes: 0,
          rxRateBps: 0,
          txRateBps: 0,
          updatedAt: new Date().toISOString()
        }
        this.broadcast()
        return
      }

      const now = Date.now()
      let rxRate = 0
      let txRate = 0
      if (this.lastSample && this.lastSample.iface === sample.iface) {
        const dt = Math.max(0.2, (now - this.lastSample.at) / 1000)
        rxRate = Math.max(0, (sample.rx - this.lastSample.rx) / dt)
        txRate = Math.max(0, (sample.tx - this.lastSample.tx) / dt)
      }
      this.lastSample = { rx: sample.rx, tx: sample.tx, at: now, iface: sample.iface }
      if (!primary.interfaceName) {
        primary.interfaceName = sample.iface
      }
      this.stats = {
        interfaceName: sample.iface,
        rxBytes: sample.rx,
        txBytes: sample.tx,
        rxRateBps: rxRate,
        txRateBps: txRate,
        updatedAt: new Date().toISOString()
      }
      this.broadcast()
    } catch {
      // ignore transient stats errors
    }
  }

  private async readInterfaceCounters(
    preferred?: string
  ): Promise<{ iface: string; rx: number; tx: number } | null> {
    if (process.platform === 'linux' && preferred) {
      try {
        const rx = Number(readFileSync(`/sys/class/net/${preferred}/statistics/rx_bytes`, 'utf8'))
        const tx = Number(readFileSync(`/sys/class/net/${preferred}/statistics/tx_bytes`, 'utf8'))
        if (Number.isFinite(rx) && Number.isFinite(tx)) return { iface: preferred, rx, tx }
      } catch {
        // fall through
      }
    }

    try {
      const { stdout } =
        process.platform === 'darwin'
          ? await execFileAsync('netstat', ['-ibn'], { timeout: 3000 })
          : await execFileAsync('cat', ['/proc/net/dev'], { timeout: 3000 })

      if (process.platform === 'darwin') {
        const lines = stdout.split('\n')
        const candidates: Array<{ iface: string; rx: number; tx: number }> = []
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 10) continue
          const iface = parts[0]?.replace(/:$/, '')
          if (!iface) continue
          if (!/^(utun|tun|tap|wg|ml-)/i.test(iface)) continue
          const rx = Number(parts[6])
          const tx = Number(parts[9])
          if (!Number.isFinite(rx) || !Number.isFinite(tx)) continue
          candidates.push({ iface, rx, tx })
        }
        if (preferred) {
          const hit = candidates.find((c) => c.iface === preferred)
          if (hit) return hit
        }
        // Prefer the interface with traffic, else first tunnel
        candidates.sort((a, b) => b.rx + b.tx - (a.rx + a.tx))
        return candidates[0] ?? null
      }

      // Linux /proc/net/dev
      const candidates: Array<{ iface: string; rx: number; tx: number }> = []
      for (const line of stdout.split('\n')) {
        const m = line.match(/^\s*([\w.-]+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/)
        if (!m) continue
        const iface = m[1]!
        if (!/^(tun|tap|wg|ml-|utun)/i.test(iface)) continue
        candidates.push({ iface, rx: Number(m[2]), tx: Number(m[3]) })
      }
      if (preferred) {
        const hit = candidates.find((c) => c.iface === preferred)
        if (hit) return hit
      }
      candidates.sort((a, b) => b.rx + b.tx - (a.rx + a.tx))
      return candidates[0] ?? null
    } catch {
      return null
    }
  }

  private async waitForExternalTunnel(
    timeoutMs: number,
    baselineIfaces: Set<string> = new Set()
  ): Promise<string | null> {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      const ifaces = await this.listTunnelInterfaces()
      const neu = ifaces.find((iface) => !baselineIfaces.has(iface))
      if (neu) return neu
      if (baselineIfaces.size === 0) {
        const any = await this.detectTunnelInterface()
        if (any) return any
      }
      await this.sleep(750)
    }
    const ifaces = await this.listTunnelInterfaces()
    return ifaces.find((iface) => !baselineIfaces.has(iface)) ?? null
  }

  private async openExternal(
    configPath: string,
    provider: VpnProvider,
    tools: VpnRuntimeStatus['tools']
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    if (process.platform === 'darwin') {
      if ((provider === 'openvpn' || provider === 'pritunl') && tools.tunnelblick) {
        await shell.openPath(configPath)
        return { ok: true, message: 'Opened with Tunnelblick / default .ovpn handler' }
      }
      if (provider === 'wireguard' && tools.wireguardApp) {
        await shell.openPath(configPath)
        return { ok: true, message: 'Opened with WireGuard.app' }
      }
    }
    const result = await shell.openPath(configPath)
    if (result) return { ok: false, error: result }
    return { ok: true, message: 'Opened config with system default app' }
  }

  async disconnect(profileId?: string): Promise<{ ok: boolean; error?: string }> {
    await this.recoverOrphanSessions()
    const ids = profileId ? [profileId] : [...this.sessions.keys()]
    if (ids.length === 0) {
      this.focusProfileId = null
      this.setState('disconnected')
      return { ok: true }
    }

    try {
      for (const id of ids) {
        await this.disconnectSession(id)
      }
      const primary = this.primarySession()
      if (primary) {
        this.focusProfileId = primary.profileId
        this.setState('connected', `Still connected · ${this.sessions.size} tunnel(s)`)
        this.startStatsPolling()
      } else {
        this.focusProfileId = null
        this.stopStatsPolling()
        this.stats = null
        this.setState('disconnected', 'Disconnected')
      }
      return { ok: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.setState('error', error)
      return { ok: false, error }
    }
  }

  /** Kill one tunnel by pid — never killall (would drop other profiles). */
  private async disconnectSession(profileId: string): Promise<void> {
    const session = this.sessions.get(profileId)
    const tools = await this.detectTools()

    if (!session) {
      // Orphan tunnel after crash/restart without recovery in map
      const pid = this.readPidFile(profileId)
      if (pid && this.isProcessAlive(pid)) {
        try {
          await this.runElevated(`kill ${pid}`)
        } catch {
          // ignore
        }
      }
      this.clearPidFile(profileId)
      const iface = this.wireguardIface(profileId)
      const wgPath = join(this.vpnDir(), `${iface}.conf`)
      if (tools.wgQuickPath && existsSync(wgPath) && (await this.interfaceExists(iface))) {
        try {
          await this.runElevated(`"${tools.wgQuickPath}" down "${wgPath}"`)
        } catch {
          // ignore
        }
      }
      return
    }

    if (session.method === 'cli') {
      if (session.provider === 'wireguard' || session.interfaceName?.startsWith('ml-')) {
        if (tools.wgQuickPath && session.configPath) {
          await this.runElevated(`"${tools.wgQuickPath}" down "${session.configPath}"`)
        }
      } else if (session.process) {
        try {
          session.process.kill('SIGTERM')
        } catch {
          // ignore
        }
      } else if (tools.openvpnPath) {
        const pidPath = join(this.vpnDir(), `${session.profileId}.pid`)
        if (existsSync(pidPath)) {
          try {
            const pid = Number(readFileSync(pidPath, 'utf8').trim())
            if (pid) await this.runElevated(`kill ${pid}`)
          } catch {
            // ignore — do not killall
          }
        }
      }
      this.clearPidFile(profileId)
    }
    this.secureCleanupAuth(session.authPath)
    this.sessions.delete(profileId)
    if (this.focusProfileId === profileId) {
      this.focusProfileId = this.sessions.keys().next().value ?? null
    }
  }

  async revealConfig(profileId: string): Promise<{ ok: boolean; path?: string; error?: string }> {
    const profile = getVpnProfile(profileId)
    if (!profile) return { ok: false, error: 'Not found' }
    const path = this.writeConfigFile(profile.id, profile.provider, profile.config)
    shell.showItemInFolder(path)
    return { ok: true, path }
  }

  /** UI focus — which VPN profile stats/labels follow (does not disconnect others). */
  setFocus(profileId: string | null): void {
    this.focusProfileId = profileId
    if (profileId && this.sessions.has(profileId)) {
      this.startStatsPolling()
    }
    this.broadcast()
  }
}

export const vpnManager = new VpnManager()
