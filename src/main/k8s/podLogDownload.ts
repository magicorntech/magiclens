import { writeFile } from 'node:fs/promises'
import { dialog, type BrowserWindow } from 'electron'
import type {
  PodLogsDownloadMergedRequest,
  PodLogsDownloadMergedResponse,
  PodLogsDownloadRequest,
  PodLogsDownloadResponse
} from '@shared/types/pod'
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

/**
 * Fetches each pod/container's current log tail independently (no live follow — this is a
 * point-in-time snapshot for a save-to-disk action) and concatenates them into one file, each
 * section clearly headed by its source so the combined file is still greppable per-pod.
 */
export async function downloadMergedPodLogs(
  window: BrowserWindow | null,
  clients: ClusterClients,
  req: PodLogsDownloadMergedRequest
): Promise<PodLogsDownloadMergedResponse> {
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
    const sections = await Promise.all(
      req.pods.map(async ({ podName, containerName }) => {
        const header = `==> ${podName}/${containerName} <==`
        try {
          const content = await clients.core.readNamespacedPodLog({
            name: podName,
            namespace: req.namespace,
            container: containerName,
            timestamps: req.timestamps ?? false
          })
          const body = typeof content === 'string' ? content : String(content)
          return `${header}\n${body.endsWith('\n') ? body : `${body}\n`}`
        } catch (err) {
          return `${header}\n[error fetching logs: ${err instanceof Error ? err.message : String(err)}]\n`
        }
      })
    )
    await writeFile(result.filePath, sections.join('\n'), 'utf-8')
    return { ok: true, filePath: result.filePath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
