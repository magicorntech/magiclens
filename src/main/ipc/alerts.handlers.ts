import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { AlertsNotifyRequest, AlertsNotifyResponse } from '@shared/localAlerts'
import { showOsNotification } from '../notes/reminderScheduler'

export function registerAlertsHandlers(): void {
  ipcMain.handle(
    IPC.ALERTS_NOTIFY,
    async (_e, req: AlertsNotifyRequest): Promise<AlertsNotifyResponse> =>
      showOsNotification(req.title, req.body, req.target, req.silent === true)
  )

  ipcMain.handle(IPC.ALERTS_REQUEST_PERMISSION, async (): Promise<AlertsNotifyResponse> =>
    showOsNotification(
      'MagicLens',
      'Allow notifications so cluster alerts and Spark reminders can reach you.'
    )
  )

  ipcMain.handle(IPC.ALERTS_OPEN_SETTINGS, async (): Promise<{ ok: boolean }> => {
    if (process.platform === 'darwin') {
      await shell.openExternal('x-apple.systempreferences:com.apple.Notifications-Settings.extension')
      return { ok: true }
    }
    if (process.platform === 'win32') {
      await shell.openExternal('ms-settings:notifications')
      return { ok: true }
    }
    return { ok: false }
  })
}
