import { app, type BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-contract'
import {
  writeDiagnosticsReport,
  type DiagnosticsReason
} from './writeDiagnosticsReport'

const RELOAD_COOLDOWN_MS = 15_000

let wiredApp = false
let lastReloadAt = 0
let lastUnresponsiveAt = 0

function notifyRenderer(win: BrowserWindow | null, payload: {
  reason: DiagnosticsReason
  path: string
  logsDir: string
  crashDumpsDir: string
}): void {
  if (!win || win.isDestroyed()) return
  try {
    win.webContents.send(IPC.APP_DIAGNOSTICS_SAVED, payload)
  } catch {
    // window may be mid-teardown
  }
}

function capture(
  win: BrowserWindow | null,
  reason: DiagnosticsReason,
  extra?: Record<string, unknown>
): void {
  try {
    const result = writeDiagnosticsReport(reason, extra)
    notifyRenderer(win, { reason, ...result })
    console.warn(`[magiclens] diagnostics saved (${reason}): ${result.path}`)
  } catch (err) {
    console.error('[magiclens] failed to write diagnostics:', err)
  }
}

/**
 * Hang / renderer / GPU crash hooks that write local diagnostics and (for renderer
 * crashes) attempt a single reload so the user is not stuck on a dead window.
 */
export function installWindowDiagnostics(win: BrowserWindow): void {
  win.on('unresponsive', () => {
    const now = Date.now()
    // Debounce repeated unresponsive storms while the main thread is wedged.
    if (now - lastUnresponsiveAt < 5_000) return
    lastUnresponsiveAt = now
    capture(win, 'unresponsive')
  })

  win.on('responsive', () => {
    if (Date.now() - lastUnresponsiveAt > 60_000) return
    capture(win, 'responsive')
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    capture(win, 'render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode
    })
    const now = Date.now()
    if (now - lastReloadAt < RELOAD_COOLDOWN_MS) return
    if (win.isDestroyed()) return
    lastReloadAt = now
    try {
      win.webContents.reload()
    } catch (err) {
      console.error('[magiclens] reload after render-process-gone failed:', err)
    }
  })
}

/** App-wide GPU / utility process loss — local dump only, no process kill. */
export function installAppProcessDiagnostics(getMainWindow: () => BrowserWindow | null): void {
  if (wiredApp) return
  wiredApp = true

  app.on('child-process-gone', (_event, details) => {
    const type = String(details.type || '')
    const reason: DiagnosticsReason =
      type.toLowerCase().includes('gpu') ? 'gpu-process-gone' : 'child-process-gone'
    capture(getMainWindow(), reason, {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
      serviceName: (details as { serviceName?: string }).serviceName,
      name: (details as { name?: string }).name
    })
  })
}
