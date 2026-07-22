import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ClusterGroup, ClusterGroupsState } from '@shared/types/clusterGroup'
import {
  createClusterGroup,
  listClusterGroups,
  removeClusterGroup,
  saveClusterGroups,
  updateClusterGroup
} from '../persistence/clusterGroups'

export function registerClusterGroupsHandlers(): void {
  ipcMain.handle(IPC.CLUSTER_GROUPS_LIST, async (): Promise<ClusterGroupsState> => listClusterGroups())

  ipcMain.handle(IPC.CLUSTER_GROUPS_SAVE, async (_e, groups: ClusterGroupsState): Promise<ClusterGroupsState> =>
    saveClusterGroups(groups)
  )

  ipcMain.handle(IPC.CLUSTER_GROUPS_CREATE, async (_e, req: { name: string }): Promise<ClusterGroupsState> =>
    createClusterGroup(req.name)
  )

  ipcMain.handle(
    IPC.CLUSTER_GROUPS_UPDATE,
    async (
      _e,
      req: {
        id: string
        patch: Partial<Pick<ClusterGroup, 'name' | 'clusterIds' | 'collapsed' | 'shortcut'>>
      }
    ): Promise<ClusterGroupsState> => updateClusterGroup(req.id, req.patch)
  )

  ipcMain.handle(IPC.CLUSTER_GROUPS_REMOVE, async (_e, req: { id: string }): Promise<ClusterGroupsState> =>
    removeClusterGroup(req.id)
  )
}
