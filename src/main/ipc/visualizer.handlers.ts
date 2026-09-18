import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { VisualizerGraphRequest, VisualizerGraphResponse } from '@shared/types/visualizer'
import { buildVisualizerGraph } from '../k8s/visualizerService'

export function registerVisualizerHandlers(): void {
  ipcMain.handle(
    IPC.VISUALIZER_GET_GRAPH,
    async (_e, req: VisualizerGraphRequest): Promise<VisualizerGraphResponse | { error: string }> => {
      try {
        if (!req?.clusterId) return { error: 'clusterId is required' }
        return await buildVisualizerGraph(req)
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
