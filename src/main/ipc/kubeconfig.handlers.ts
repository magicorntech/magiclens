import { dialog, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { IPC } from '@shared/ipc-contract'
import type {
  ExportKubeconfigContextRequest,
  ExportKubeconfigContextResponse,
  PickDirectoryResult,
  PickFileResult,
  ReadKubeconfigSourceRequest,
  ReadKubeconfigSourceResponse,
  ScanDirectoryResponse,
  WriteKubeconfigFileRequest,
  WriteKubeconfigFileResponse
} from '@shared/types/kubeconfig'
import { exportScopedKubeconfigYaml } from '../k8s/kubeconfigExport'
import { parseKubeconfigFile, parseKubeconfigString, scanDirectoryForKubeconfigs } from '../k8s/kubeconfigParser'

function scanDirectorySafely(directoryPath: string): ScanDirectoryResponse {
  const exists = existsSync(directoryPath)
  const files = exists ? scanDirectoryForKubeconfigs(directoryPath) : []
  return { directoryPath, exists, files }
}

export function registerKubeconfigHandlers(): void {
  ipcMain.handle(IPC.KUBECONFIG_PICK_FILE, async (): Promise<PickFileResult> => {
    const result = await dialog.showOpenDialog({
      title: 'Select kubeconfig file',
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }
    const filePath = result.filePaths[0]
    const contents = readFileSync(filePath, 'utf-8')
    return { canceled: false, filePath, contents }
  })

  ipcMain.handle(IPC.KUBECONFIG_PARSE_FILE, async (_e, req: { filePath: string }) => {
    return parseKubeconfigFile(req.filePath)
  })

  ipcMain.handle(IPC.KUBECONFIG_PARSE_STRING, async (_e, req: { yaml: string }) => {
    return parseKubeconfigString(req.yaml)
  })

  ipcMain.handle(IPC.KUBECONFIG_PICK_DIRECTORY, async (): Promise<PickDirectoryResult> => {
    const result = await dialog.showOpenDialog({
      title: 'Select folder to scan for kubeconfig files',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }
    return { canceled: false, directoryPath: result.filePaths[0] }
  })

  ipcMain.handle(IPC.KUBECONFIG_SCAN_DIRECTORY, async (_e, req: { directoryPath: string }) => {
    return scanDirectorySafely(req.directoryPath)
  })

  ipcMain.handle(IPC.KUBECONFIG_SCAN_DEFAULT, async () => {
    return scanDirectorySafely(join(homedir(), '.kube'))
  })

  ipcMain.handle(
    IPC.KUBECONFIG_READ_SOURCE,
    async (_e, req: ReadKubeconfigSourceRequest): Promise<ReadKubeconfigSourceResponse> => {
      if (req.source.type === 'raw') return { ok: true, yaml: req.source.yaml }
      const yaml = readFileSync(req.source.filePath, 'utf-8')
      return { ok: true, yaml }
    }
  )

  ipcMain.handle(
    IPC.KUBECONFIG_WRITE_FILE,
    async (_e, req: WriteKubeconfigFileRequest): Promise<WriteKubeconfigFileResponse> => {
      try {
        writeFileSync(req.filePath, req.yaml, 'utf-8')
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.KUBECONFIG_EXPORT_CONTEXT,
    async (_e, req: ExportKubeconfigContextRequest): Promise<ExportKubeconfigContextResponse> => {
      try {
        return { ok: true, yaml: exportScopedKubeconfigYaml(req.source, req.contextName) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
