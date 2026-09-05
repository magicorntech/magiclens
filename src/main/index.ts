import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { applyChromiumPerformanceFlags } from './chromiumPerf'
import { registerIpcHandlers } from './ipc/register'
import { installSparksMediaProtocol, registerSparksMediaScheme } from './notes/mediaProtocol'
import { startNotesReminderScheduler } from './notes/reminderScheduler'
import { installApplicationMenu, installReloadConfirm } from './reloadConfirm'
import { initAutoUpdater } from './update/autoUpdateService'
import { fixShellPath } from './util/fixShellPath'
import { createMainWindow } from './window'
import { syncMenuBarWidget } from './menuBarWidget'
import { vpnManager } from './vpn/vpnManager'

// Must run before ready — Chromium ignores most switches after initialization.
applyChromiumPerformanceFlags()
registerSparksMediaScheme()

// In dev, Electron doesn't reliably pick up package.json's `name`, so the app menu, Dock,
// and system notifications fall back to "Electron" until this is set explicitly. Packaged
// builds get the right name from electron-builder's productName regardless, but setting it
// here too keeps dev and packaged behavior identical instead of relying on that distinction.
app.setName('MagicLens')

let isQuitting = false

app.whenReady().then(() => {
  fixShellPath()
  installSparksMediaProtocol()
  installApplicationMenu()

  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  registerIpcHandlers()
  const window = createMainWindow()
  installReloadConfirm(window)
  initAutoUpdater(window)
  startNotesReminderScheduler()
  syncMenuBarWidget()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createMainWindow()
      installReloadConfirm(next)
    }
  })
})

app.on('before-quit', (event) => {
  if (isQuitting) return
  isQuitting = true
  event.preventDefault()
  void vpnManager
    .disconnectAllForQuit()
    .catch(() => undefined)
    .finally(() => {
      app.exit(0)
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
