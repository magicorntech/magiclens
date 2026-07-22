import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalStartRequest,
  TerminalStartResponse,
  TerminalStopRequest
} from '@shared/types/terminal'
import { localTerminalManager } from '../terminal/localTerminalManager'
import { listClusters } from '../persistence/clusterStore'
import { exportScopedKubeconfigYaml } from '../k8s/kubeconfigExport'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'

export function registerTerminalHandlers(): void {
  ipcMain.handle(IPC.TERMINAL_START, (event, req: TerminalStartRequest): TerminalStartResponse => {
    const sender = event.sender
    sender.once('destroyed', () => localTerminalManager.stopAllForSender(sender.id))
    let env = req.env
    let tempPaths: string[] | undefined

    if (req.clusterId) {
      const entry = listClusters().find((c) => c.id === req.clusterId)
      if (entry) {
        try {
          if (entry.localKubeconfigPath && existsSync(entry.localKubeconfigPath)) {
            env = { ...(env ?? {}), KUBECONFIG: entry.localKubeconfigPath }
          } else {
            const yaml = exportScopedKubeconfigYaml(entry.source, entry.contextName)
            const filePath = join(tmpdir(), `magiclens-kubeconfig-${req.clusterId}-${req.sessionId}.yaml`)
            writeFileSync(filePath, yaml, 'utf-8')
            env = { ...(env ?? {}), KUBECONFIG: filePath }
            tempPaths = [filePath]
          }
        } catch {
          // best-effort; fall back to default env
        }
      }
    }

    return localTerminalManager.start(req.sessionId, req.cols, req.rows, sender, req.cwd, env, tempPaths)
  })

  ipcMain.handle(IPC.TERMINAL_INPUT, (_e, req: TerminalInputRequest) => {
    localTerminalManager.input(req.sessionId, req.data)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.TERMINAL_RESIZE, (_e, req: TerminalResizeRequest) => {
    localTerminalManager.resize(req.sessionId, req.cols, req.rows)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.TERMINAL_STOP, (_e, req: TerminalStopRequest) => {
    localTerminalManager.stop(req.sessionId)
    return { ok: true as const }
  })
}
