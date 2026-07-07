import { app, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { AppInfoResponse, DisplaySettings, WelcomeStateResponse } from '@shared/types/app'
import {
  getDisplaySettings,
  getHasSeenWelcome,
  getLastSeenSplashVersion,
  setDisplaySettings,
  setHasSeenWelcome,
  setLastSeenSplashVersion
} from '../persistence/appSettings'
import packageJson from '../../../package.json'

export function registerAppHandlers(): void {
  ipcMain.handle(IPC.APP_GET_INFO, async (): Promise<AppInfoResponse> => ({
    version: app.getVersion(),
    buildNumber: packageJson.buildNumber ?? '-',
    electronVersion: process.versions.electron ?? '-',
    chromeVersion: process.versions.chrome ?? '-',
    nodeVersion: process.versions.node ?? '-'
  }))

  ipcMain.handle(IPC.APP_GET_WELCOME_STATE, async (): Promise<WelcomeStateResponse> => {
    const hasSeenWelcome = getHasSeenWelcome()
    const showSplash = !hasSeenWelcome || getLastSeenSplashVersion() !== app.getVersion()
    return { hasSeenWelcome, showSplash }
  })

  ipcMain.handle(IPC.APP_SET_WELCOME_SEEN, async (): Promise<{ ok: true }> => {
    setHasSeenWelcome(true)
    return { ok: true }
  })

  ipcMain.handle(IPC.APP_SET_SPLASH_SEEN, async (): Promise<{ ok: true }> => {
    setLastSeenSplashVersion(app.getVersion())
    return { ok: true }
  })

  ipcMain.handle(IPC.APP_GET_DISPLAY_SETTINGS, async (): Promise<DisplaySettings> => getDisplaySettings())

  ipcMain.handle(
    IPC.APP_SET_DISPLAY_SETTINGS,
    async (_e, patch: Partial<DisplaySettings>): Promise<DisplaySettings> => setDisplaySettings(patch)
  )
}
