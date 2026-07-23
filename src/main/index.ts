import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { applyChromiumPerformanceFlags } from './chromiumPerf'
import { registerIpcHandlers } from './ipc/register'
import { installApplicationMenu, installReloadConfirm } from './reloadConfirm'
import { initAutoUpdater } from './update/autoUpdateService'
import { fixShellPath } from './util/fixShellPath'
import { createMainWindow } from './window'

// Must run before ready — Chromium ignores most switches after initialization.
applyChromiumPerformanceFlags()

app.whenReady().then(() => {
  fixShellPath()
  installApplicationMenu()

  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  registerIpcHandlers()
  const window = createMainWindow()
  installReloadConfirm(window)
  initAutoUpdater(window)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createMainWindow()
      installReloadConfirm(next)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
