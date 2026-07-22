import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { setSessionScope } from '../persistence/sessionScope'

export function registerSessionHandlers(): void {
  ipcMain.handle(IPC.SESSION_SET_SCOPE, async (_e, req: { scope: string }) => {
    setSessionScope(req.scope)
    return { ok: true as const, scope: req.scope }
  })
}
