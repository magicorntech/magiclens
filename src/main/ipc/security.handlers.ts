import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { SecurityReport, SecurityScanRequest } from '@shared/types/security'
import { demoSecurityReport, hasDemoCatalog, isDemoCluster } from '../k8s/demoMode'
import { scanSecurity, summarizeSecurityFindings } from '../k8s/securityService'

export function registerSecurityHandlers(): void {
  ipcMain.handle(
    IPC.SECURITY_SCAN,
    async (_e, req: SecurityScanRequest): Promise<SecurityReport | { error: string }> => {
      try {
        if (!req?.clusterId) return { error: 'clusterId is required' }
        if (isDemoCluster(req.clusterId)) {
          if (!hasDemoCatalog(req.clusterId)) {
            return {
              clusterId: req.clusterId,
              scannedAt: new Date().toISOString(),
              ...summarizeSecurityFindings([]),
              vulnerabilities: [],
              entryPoints: [],
              vectors: []
            }
          }
          return demoSecurityReport(req.clusterId)
        }
        return await scanSecurity(req)
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
