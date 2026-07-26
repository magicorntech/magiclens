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
import type { PersistedClusterEntry } from '@shared/types/cluster'
import { exportScopedKubeconfigYaml } from '../k8s/kubeconfigExport'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parse, stringify } from 'yaml'

/**
 * Points the shell at a kubeconfig whose `current-context` is the cluster the terminal
 * was opened from, so bare `kubectl` commands can't silently target another cluster.
 */
function kubeconfigEnvForCluster(
  entry: PersistedClusterEntry,
  clusterId: string,
  sessionId: string
): { kubeconfigPath: string; tempPaths?: string[] } {
  const tempPath = (): string => join(tmpdir(), `magiclens-kubeconfig-${clusterId}-${sessionId}.yaml`)

  if (entry.localKubeconfigPath && existsSync(entry.localKubeconfigPath)) {
    const raw = readFileSync(entry.localKubeconfigPath, 'utf-8')
    const parsed = parse(raw) as { 'current-context'?: string } | null
    if (parsed && parsed['current-context'] === entry.contextName) {
      return { kubeconfigPath: entry.localKubeconfigPath }
    }
    // Same credentials, but re-pointed at this cluster's context.
    const filePath = tempPath()
    writeFileSync(filePath, stringify({ ...parsed, 'current-context': entry.contextName }), 'utf-8')
    return { kubeconfigPath: filePath, tempPaths: [filePath] }
  }

  const filePath = tempPath()
  writeFileSync(filePath, exportScopedKubeconfigYaml(entry.source, entry.contextName), 'utf-8')
  return { kubeconfigPath: filePath, tempPaths: [filePath] }
}

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
          const resolved = kubeconfigEnvForCluster(entry, req.clusterId, req.sessionId)
          env = {
            ...(env ?? {}),
            KUBECONFIG: resolved.kubeconfigPath,
            // Surfaced for prompts/scripts (kubectl itself has no context env var).
            MAGICLENS_KUBE_CONTEXT: entry.contextName
          }
          tempPaths = resolved.tempPaths
        } catch (err) {
          console.warn(
            `[magiclens] Could not scope terminal kubeconfig to context "${entry.contextName}":`,
            err instanceof Error ? err.message : err
          )
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
