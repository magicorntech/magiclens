import { powerMonitor, type BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-contract'

let wired = false

/**
 * Notify the renderer after sleep / lid-open / screen unlock so it can rebuild
 * cluster sockets and VPN state. Independent of the auto-updater.
 */
export function installPowerResumeNotifier(getWindow: () => BrowserWindow | null): void {
  if (wired) return
  wired = true

  const emit = (delayMs: number): void => {
    setTimeout(() => {
      const win = getWindow()
      if (!win || win.isDestroyed()) return
      win.webContents.send(IPC.APP_POWER_RESUME)
    }, delayMs)
  }

  powerMonitor.on('resume', () => emit(1_500))
  powerMonitor.on('unlock-screen', () => emit(1_000))
}
