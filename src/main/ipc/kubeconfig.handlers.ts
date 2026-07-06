import { dialog, ipcMain } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { IPC } from '@shared/ipc-contract'
import type { PickDirectoryResult, PickFileResult, ScanDirectoryResponse } from '@shared/types/kubeconfig'
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
}
