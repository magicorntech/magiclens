import { dialog, ipcMain } from 'electron'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { IPC } from '@shared/ipc-contract'
import { detectVpnProvider, parseVpnConfigMeta, vpnRequiresAuth, type VpnAuthCredentials, type VpnProfileEntry } from '@shared/types/vpn'
import {
  getVpnProfile,
  listVpnProfiles,
  removeOrgVpnMissing,
  removeVpnProfile,
  updateVpnProfileMeta,
  upsertVpnProfile
} from '../persistence/vpnStore'
import { vpnManager } from '../vpn/vpnManager'

export function registerVpnHandlers(): void {
  ipcMain.handle(IPC.VPN_LIST, async () => ({
    profiles: listVpnProfiles(),
    status: await vpnManager.getStatus()
  }))

  ipcMain.handle(IPC.VPN_GET_STATUS, async () => vpnManager.getStatus())

  ipcMain.handle(
    IPC.VPN_ADD,
    async (
      _e,
      input: {
        name: string
        config: string
        provider?: string
        description?: string
        username?: string
        organization?: string
        serverHost?: string
        serverName?: string
        protocol?: string
      }
    ) => {
      const provider = detectVpnProvider(input.config, input.provider, input.name)
      const entry = upsertVpnProfile({
        name: input.name,
        config: input.config,
        provider,
        origin: 'local',
        description: input.description,
        username: input.username,
        organization: input.organization,
        serverHost: input.serverHost,
        serverName: input.serverName,
        protocol: input.protocol
      })
      return { ok: true as const, profile: summarize(entry) }
    }
  )

  ipcMain.handle(
    IPC.VPN_UPDATE,
    async (
      _e,
      input: {
        id: string
        name?: string
        username?: string
        organization?: string
        serverHost?: string
        serverName?: string
        protocol?: string
        description?: string
      }
    ) => {
      const entry = updateVpnProfileMeta(input.id, input)
      if (!entry) return { ok: false as const, error: 'Profile not found' }
      return { ok: true as const, profile: summarize(entry) }
    }
  )

  ipcMain.handle(IPC.VPN_REMOVE, async (_e, req: { id: string }) => {
    const status = await vpnManager.getStatus()
    if (status.connectedProfileIds.includes(req.id) || status.activeProfileId === req.id) {
      await vpnManager.disconnect(req.id)
    }
    return { ok: removeVpnProfile(req.id) }
  })

  ipcMain.handle(IPC.VPN_PICK_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select VPN config',
      properties: ['openFile'],
      filters: [
        { name: 'VPN configs', extensions: ['ovpn', 'conf'] },
        { name: 'OpenVPN / Pritunl', extensions: ['ovpn'] },
        { name: 'WireGuard', extensions: ['conf'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true as const }
    }
    const filePath = result.filePaths[0]!
    const config = readFileSync(filePath, 'utf8')
    const name = basename(filePath).replace(/\.(ovpn|conf)$/i, '')
    const provider = detectVpnProvider(config, undefined, filePath)
    const meta = parseVpnConfigMeta(config, basename(filePath))
    return {
      ok: true as const,
      name: meta.suggestedName || name,
      config,
      provider,
      filePath,
      username: meta.username,
      organization: meta.organization,
      serverHost: meta.serverHost,
      serverName: meta.serverName,
      protocol: meta.protocol
    }
  })

  ipcMain.handle(
    IPC.VPN_CONNECT,
    async (
      _e,
      req: { id: string; preferExternal?: boolean; credentials?: VpnAuthCredentials }
    ) => {
      return vpnManager.connect(req.id, !!req.preferExternal, req.credentials)
    }
  )

  ipcMain.handle(IPC.VPN_DISCONNECT, async (_e, req?: { id?: string }) =>
    vpnManager.disconnect(req?.id)
  )

  ipcMain.handle(IPC.VPN_SET_FOCUS, async (_e, req: { profileId: string | null }) => {
    vpnManager.setFocus(req.profileId)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.VPN_REVEAL, async (_e, req: { id: string }) => vpnManager.revealConfig(req.id))

  ipcMain.handle(
    IPC.VPN_UPSERT_ORG,
    async (
      _e,
      input: {
        remoteId: string
        name: string
        config: string
        provider?: string
        description?: string
        username?: string
        organization?: string
        serverHost?: string
        serverName?: string
        protocol?: string
      }
    ) => {
      const provider = detectVpnProvider(input.config, input.provider, input.name)
      const entry = upsertVpnProfile({
        name: input.name,
        config: input.config,
        provider,
        origin: 'org',
        remoteId: input.remoteId,
        description: input.description,
        username: input.username,
        organization: input.organization,
        serverHost: input.serverHost,
        serverName: input.serverName,
        protocol: input.protocol
      })
      return { ok: true as const, profile: summarize(entry) }
    }
  )

  ipcMain.handle(IPC.VPN_SYNC_ORG_IDS, async (_e, req: { remoteIds: string[] }) => {
    const removed = removeOrgVpnMissing(new Set(req.remoteIds))
    return { ok: true as const, removed }
  })

  ipcMain.handle(IPC.VPN_GET_CONFIG, async (_e, req: { id: string }) => {
    const profile = getVpnProfile(req.id)
    if (!profile) return { ok: false as const, error: 'Not found' }
    return { ok: true as const, config: profile.config, provider: profile.provider }
  })
}

function summarize(entry: VpnProfileEntry) {
  const { config, ...rest } = entry
  return {
    ...rest,
    hasConfig: entry.config.trim().length > 0,
    requiresAuth: vpnRequiresAuth(entry.provider, entry.config)
  }
}
