import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { TopologyGraphRequest, TopologyGraphResponse } from '@shared/types/topology'
import { buildTopologyGraph } from '../k8s/topologyService'
import { openTopologyWindow } from '../topologyWindow'

export function registerTopologyHandlers(): void {
  ipcMain.handle(
    IPC.TOPOLOGY_GET_GRAPH,
    async (_e, req: TopologyGraphRequest): Promise<TopologyGraphResponse | { error: string }> => {
      try {
        return await buildTopologyGraph(req)
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.TOPOLOGY_OPEN_WINDOW,
    async (
      _e,
      req: { clusterId: string; namespace: string }
    ): Promise<{ ok: true; windowId: number } | { error: string }> => {
      try {
        if (!req?.clusterId) return { error: 'clusterId is required' }
        return openTopologyWindow({
          clusterId: req.clusterId,
          namespace: req.namespace || 'default'
        })
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
