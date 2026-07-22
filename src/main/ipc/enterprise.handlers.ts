import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'

export interface EnterpriseHttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string | null
}

export interface EnterpriseHttpResponse {
  ok: boolean
  status: number
  body: string
}

export function registerEnterpriseHandlers(): void {
  ipcMain.handle(
    IPC.ENTERPRISE_HTTP,
    async (_e, req: EnterpriseHttpRequest): Promise<EnterpriseHttpResponse> => {
      try {
        const res = await fetch(req.url, {
          method: req.method ?? 'GET',
          headers: req.headers,
          body: req.body ?? undefined
        })
        const body = await res.text()
        return { ok: res.ok, status: res.status, body }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          ok: false,
          status: 0,
          body: JSON.stringify({
            message: `Cannot reach MagicLens API (${message}). Is the backend running at the configured URL?`
          })
        }
      }
    }
  )
}
