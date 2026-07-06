import { writeFile } from 'node:fs/promises'
import { dialog, type BrowserWindow } from 'electron'
import type { PodLogsDownloadRequest, PodLogsDownloadResponse } from '@shared/types/pod'
import type { ClusterClients } from './clusterManager'

export async function downloadPodLogs(
  window: BrowserWindow | null,
  clients: ClusterClients,
  req: PodLogsDownloadRequest
): Promise<PodLogsDownloadResponse> {
  const fileName = req.defaultFileName.toLowerCase().endsWith('.log')
    ? req.defaultFileName
    : `${req.defaultFileName}.log`

  const result = window
    ? await dialog.showSaveDialog(window, {
        defaultPath: fileName,
        filters: [
          { name: 'Log files', extensions: ['log'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })
    : await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [
          { name: 'Log files', extensions: ['log'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true }
  }

  try {
    const content = await clients.core.readNamespacedPodLog({
      name: req.podName,
      namespace: req.namespace,
      container: req.containerName,
      timestamps: false
    })
    await writeFile(result.filePath, content, 'utf-8')
    return { ok: true, filePath: result.filePath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
