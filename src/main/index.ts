import { isDemoMode } from './demoUserData'
import { join } from 'node:path'
import { app, BrowserWindow, crashReporter } from 'electron'
import { applyChromiumPerformanceFlags } from './chromiumPerf'
import { registerIpcHandlers } from './ipc/register'
import { seedDemoWorkspace } from './k8s/demoMode'
import { installSparksMediaProtocol, registerSparksMediaScheme } from './notes/mediaProtocol'
import { startNotesReminderScheduler } from './notes/reminderScheduler'
import { installApplicationMenu, installReloadConfirm } from './reloadConfirm'
import { initAutoUpdater } from './update/autoUpdateService'
import { installCrashLogging } from './util/crashLog'
import { fixShellPath } from './util/fixShellPath'
import { createMainWindow } from './window'
import { syncMenuBarWidget } from './menuBarWidget'
import { vpnManager } from './vpn/vpnManager'

// As early as possible — before any other module has a chance to throw.
installCrashLogging()

// Local-only crash dumps (never uploaded — no submitURL) so GPU/renderer crashes that used to
// leave zero trace can actually be inspected (see app.getPath('crashDumps')).
crashReporter.start({ uploadToServer: false, compress: true })

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
  seedDemoWorkspace()
  installSparksMediaProtocol()
  installApplicationMenu()

  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  registerIpcHandlers()
  const window = createMainWindow()
  installReloadConfirm(window)
  if (!isDemoMode()) initAutoUpdater(window)
  startNotesReminderScheduler()
  syncMenuBarWidget()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createMainWindow()
      installReloadConfirm(next)
    }
  })
})

/**
 * VPN teardown can shell out to `osascript ... with administrator privileges` for elevated
 * tunnel cleanup. If that prompt is left unanswered (or the user just wants to quit *now*), the
 * app should never hang indefinitely on quit — that's exactly the kind of stuck-then-force-killed
 * sequence macOS flags as "force quit while reopening windows" on the next launch. Race the
 * teardown against a hard cap instead.
 */
function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    const settle = (): void => {
      clearTimeout(timer)
      resolve()
    }
    promise.then(settle, settle)
  })
}

app.on('before-quit', (event) => {
  if (isQuitting) return
  isQuitting = true
  event.preventDefault()
  void withTimeout(vpnManager.disconnectAllForQuit(), 6_000).finally(() => {
    // app.quit() (not app.exit()) lets Electron/macOS run their normal, "clean" shutdown
    // sequence — the isQuitting guard above stops this handler from looping.
    app.quit()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
