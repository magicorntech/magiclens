import { app, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { AppInfoResponse, WelcomeStateResponse } from '@shared/types/app'
import { getHasSeenWelcome, setHasSeenWelcome } from '../persistence/appSettings'
import packageJson from '../../../package.json'

export function registerAppHandlers(): void {
  ipcMain.handle(IPC.APP_GET_INFO, async (): Promise<AppInfoResponse> => ({
    version: app.getVersion(),
    buildNumber: packageJson.buildNumber ?? '-',
    electronVersion: process.versions.electron ?? '-',
    chromeVersion: process.versions.chrome ?? '-',
    nodeVersion: process.versions.node ?? '-'
  }))

  ipcMain.handle(IPC.APP_GET_WELCOME_STATE, async (): Promise<WelcomeStateResponse> => ({
    hasSeenWelcome: getHasSeenWelcome()
  }))

  ipcMain.handle(IPC.APP_SET_WELCOME_SEEN, async (): Promise<{ ok: true }> => {
    setHasSeenWelcome(true)
    return { ok: true }
  })
}
