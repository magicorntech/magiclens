import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import {
  getClusterVpnLinks,
  removeClusterVpnLink,
  setClusterVpnLink
} from '../persistence/clusterVpnLinks'

export function registerClusterVpnHandlers(): void {
  ipcMain.handle(IPC.CLUSTER_VPN_LINKS_GET, async () => {
    return { links: getClusterVpnLinks() }
  })

  ipcMain.handle(
    IPC.CLUSTER_VPN_LINKS_SET,
    async (_e, req: { clusterId: string; vpnProfileId: string | null }) => {
      const links = setClusterVpnLink(req.clusterId, req.vpnProfileId)
      return { ok: true as const, links }
    }
  )

  ipcMain.handle(IPC.CLUSTER_VPN_LINKS_REMOVE, async (_e, req: { clusterId: string }) => {
    removeClusterVpnLink(req.clusterId)
    return { ok: true as const, links: getClusterVpnLinks() }
  })
}
