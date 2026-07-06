import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { SkipVersionRequest, UpdateSettings, UpdateState } from '@shared/types/update'
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateSettingsSnapshot,
  getUpdateState,
  installUpdate,
  remindLater,
  skipVersion,
  updateUpdateSettings
} from '../update/autoUpdateService'

export function registerUpdateHandlers(): void {
  ipcMain.handle(IPC.UPDATE_CHECK, async (): Promise<{ ok: true }> => {
    await checkForUpdates()
    return { ok: true }
  })

  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async (): Promise<{ ok: true }> => {
    await downloadUpdate()
    return { ok: true }
  })

  ipcMain.handle(IPC.UPDATE_INSTALL, async (): Promise<{ ok: true }> => {
    installUpdate()
    return { ok: true }
  })

  ipcMain.handle(IPC.UPDATE_SKIP_VERSION, async (_e, req: SkipVersionRequest): Promise<{ ok: true }> => {
    skipVersion(req.version)
    return { ok: true }
  })

  ipcMain.handle(IPC.UPDATE_REMIND_LATER, async (): Promise<{ ok: true }> => {
    remindLater()
    return { ok: true }
  })

  ipcMain.handle(IPC.UPDATE_GET_STATE, async (): Promise<UpdateState> => getUpdateState())

  ipcMain.handle(IPC.UPDATE_GET_SETTINGS, async (): Promise<UpdateSettings> => getUpdateSettingsSnapshot())

  ipcMain.handle(IPC.UPDATE_SET_SETTINGS, async (_e, patch: Partial<UpdateSettings>): Promise<UpdateSettings> =>
    updateUpdateSettings(patch)
  )
}
