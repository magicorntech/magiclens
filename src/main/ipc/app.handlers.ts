import { BrowserWindow, app, ipcMain } from 'electron'
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

function windowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function emitFullscreenChanged(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  win.webContents.send(IPC.APP_FULLSCREEN_CHANGED, { fullscreen: win.isFullScreen() })
}

function wireFullscreenEvents(win: BrowserWindow): void {
  win.on('enter-full-screen', () => emitFullscreenChanged(win))
  win.on('leave-full-screen', () => emitFullscreenChanged(win))
}

export function registerAppHandlers(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    wireFullscreenEvents(win)
  }
  app.on('browser-window-created', (_event, win) => {
    wireFullscreenEvents(win)
  })

  ipcMain.handle(IPC.APP_GET_INFO, async (): Promise<AppInfoResponse> => ({
    version: app.getVersion(),
    buildNumber: packageJson.buildNumber ?? '-',
    electronVersion: process.versions.electron ?? '-',
    chromeVersion: process.versions.chrome ?? '-',
    nodeVersion: process.versions.node ?? '-',
    platform: process.platform
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

  ipcMain.handle(IPC.APP_GET_FULLSCREEN, (event): { fullscreen: boolean } => {
    const win = windowFromEvent(event)
    return { fullscreen: win?.isFullScreen() ?? false }
  })

  ipcMain.handle(IPC.APP_TOGGLE_FULLSCREEN, (event): { fullscreen: boolean } => {
    const win = windowFromEvent(event)
    if (!win) return { fullscreen: false }
    const next = !win.isFullScreen()
    win.setFullScreen(next)
    return { fullscreen: next }
  })
}
