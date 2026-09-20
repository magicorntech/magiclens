import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  SecurityHistoryDeleteRequest,
  SecurityHistoryGetRequest,
  SecurityHistoryListRequest,
  SecurityHistoryRenameRequest,
  SecurityReport,
  SecurityScanProgress,
  SecurityScanRequest
} from '@shared/types/security'
import { hasDemoCatalog, isDemoCluster } from '../k8s/demoMode'
import { buildDemoSecurityInventory } from '../k8s/demoSecurityInventory'
import {
  buildSecurityReport,
  scanSecurity,
  summarizeSecurityFindings,
  type SecurityProgressFn
} from '../k8s/securityService'
import {
  clearSecurityHistory,
  deleteSecurityHistory,
  getSecurityHistory,
  listSecurityHistory,
  renameSecurityHistory,
  saveSecurityScan
} from '../persistence/securityHistoryStore'

function progressSender(
  event: IpcMainInvokeEvent,
  clusterId: string
): SecurityProgressFn {
  return (partial) => {
    const payload: SecurityScanProgress = { clusterId, ...partial }
    if (!event.sender.isDestroyed()) {
      event.sender.send(IPC.SECURITY_SCAN_PROGRESS, payload)
    }
  }
}

async function scanDemoCluster(
  clusterId: string,
  onProgress: SecurityProgressFn
): Promise<SecurityReport> {
  if (!hasDemoCatalog(clusterId)) {
    return {
      clusterId,
      scannedAt: new Date().toISOString(),
      ...summarizeSecurityFindings([]),
      vulnerabilities: [],
      entryPoints: [],
      vectors: []
    }
  }
  const inventory = buildDemoSecurityInventory()
  return buildSecurityReport(clusterId, inventory, onProgress)
}

export function registerSecurityHandlers(): void {
  ipcMain.handle(
    IPC.SECURITY_SCAN,
    async (
      event,
      req: SecurityScanRequest
    ): Promise<SecurityReport | { error: string }> => {
      try {
        if (!req?.clusterId) return { error: 'clusterId is required' }
        const onProgress = progressSender(event, req.clusterId)
        let report: SecurityReport
        if (isDemoCluster(req.clusterId)) {
          report = await scanDemoCluster(req.clusterId, onProgress)
        } else {
          report = await scanSecurity(req, onProgress)
        }
        saveSecurityScan(report)
        return report
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC.SECURITY_HISTORY_LIST, async (_e, req: SecurityHistoryListRequest) => {
    if (!req?.clusterId) return { error: 'clusterId is required' }
    return { items: listSecurityHistory(req.clusterId) }
  })

  ipcMain.handle(IPC.SECURITY_HISTORY_GET, async (_e, req: SecurityHistoryGetRequest) => {
    if (!req?.clusterId || !req?.id) return { error: 'clusterId and id are required' }
    const item = getSecurityHistory(req.clusterId, req.id)
    if (!item) return { error: 'History record not found' }
    return item
  })

  ipcMain.handle(IPC.SECURITY_HISTORY_DELETE, async (_e, req: SecurityHistoryDeleteRequest) => {
    if (!req?.clusterId || !req?.id) return { error: 'clusterId and id are required' }
    return { ok: deleteSecurityHistory(req.clusterId, req.id) }
  })

  ipcMain.handle(IPC.SECURITY_HISTORY_CLEAR, async (_e, req: SecurityHistoryListRequest) => {
    if (!req?.clusterId) return { error: 'clusterId is required' }
    clearSecurityHistory(req.clusterId)
    return { ok: true }
  })

  ipcMain.handle(IPC.SECURITY_HISTORY_RENAME, async (_e, req: SecurityHistoryRenameRequest) => {
    if (!req?.clusterId || !req?.id) return { error: 'clusterId and id are required' }
    if (!req.name?.trim()) return { error: 'name is required' }
    const item = renameSecurityHistory(req.clusterId, req.id, req.name)
    if (!item) return { error: 'History record not found' }
    return item
  })
}
