import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { createAppWebPreferences } from './chromiumPerf'

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    // Only affects the Windows/Linux window and taskbar icon — macOS reads the dock icon
    // from app.dock.setIcon (dev) or the packaged .app bundle's Info.plist (prod) instead.
    icon: join(__dirname, '../../resources/icon.png'),
    // Merge the native window chrome into our own left sidebar instead of a separate OS
    // title bar strip sitting on top of the app. macOS only — Windows/Linux keep the
    // standard frame since replacing it there means building custom min/max/close buttons.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 20 } }
      : {}),
    webPreferences: createAppWebPreferences()
  })

  window.on('ready-to-show', () => window.show())

  // When the window is hidden/minimized, nudge Chromium to drop unused GPU/renderer caches.
  let reclaimTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleReclaim = (): void => {
    if (reclaimTimer) clearTimeout(reclaimTimer)
    reclaimTimer = setTimeout(() => {
      reclaimTimer = null
      if (window.isDestroyed() || window.isVisible()) return
      void window.webContents.session.clearCache().catch(() => {})
    }, 60_000)
  }
  window.on('hide', scheduleReclaim)
  window.on('minimize', scheduleReclaim)
  window.on('show', () => {
    if (reclaimTimer) {
      clearTimeout(reclaimTimer)
      reclaimTimer = null
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
