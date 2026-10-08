import { join } from 'node:path'
import { app, BrowserWindow, screen } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { createAppWebPreferences } from './chromiumPerf'

/**
 * Always-on-top Molly voice HUD — Electron port of the floating Python overlay
 * pattern (frameless, stays visible while you work in other apps / MagicLens tabs).
 */

const HUD_WIDTH = 300
const HUD_HEIGHT = 390

let hudWindow: BrowserWindow | null = null

function loadHud(win: BrowserWindow): void {
  const params = new URLSearchParams({ mlMollyHud: '1' })
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win
      .loadURL(`${process.env['ELECTRON_RENDERER_URL']}?${params.toString()}`)
      .catch((err) => console.error('[molly-hud] loadURL failed', err))
  } else {
    void win
      .loadFile(join(__dirname, '../renderer/index.html'), { search: params.toString() })
      .catch((err) => console.error('[molly-hud] loadFile failed', err))
  }
}

function positionNearCorner(win: BrowserWindow): void {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const work = display.workArea
  const margin = 20
  win.setPosition(
    Math.round(work.x + work.width - HUD_WIDTH - margin),
    Math.round(work.y + work.height - HUD_HEIGHT - margin)
  )
}

function createHudWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    focusable: true,
    title: 'Molly',
    // Panel-style on macOS so it floats over fullscreen / Mission Control like a HUD.
    type: process.platform === 'darwin' ? 'panel' : undefined,
    webPreferences: {
      ...createAppWebPreferences(),
      // Keep voice / canvas alive while the HUD is in the background.
      backgroundThrottling: false
    }
  })

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'floating')
  positionNearCorner(win)
  loadHud(win)

  win.on('closed', () => {
    if (hudWindow === win) hudWindow = null
  })

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.showInactive()
  })

  return win
}

export function isMollyHudOpen(): boolean {
  return Boolean(hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible())
}

export function openMollyHud(): { ok: true; windowId: number } {
  if (hudWindow && !hudWindow.isDestroyed()) {
    if (!hudWindow.isVisible()) hudWindow.showInactive()
    hudWindow.setAlwaysOnTop(true, 'floating')
    return { ok: true, windowId: hudWindow.id }
  }
  hudWindow = createHudWindow()
  return { ok: true, windowId: hudWindow.id }
}

export function closeMollyHud(): { ok: true } {
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.close()
  }
  hudWindow = null
  return { ok: true }
}

export function toggleMollyHud(): { ok: true; open: boolean; windowId?: number } {
  if (isMollyHudOpen()) {
    closeMollyHud()
    return { ok: true, open: false }
  }
  const res = openMollyHud()
  return { ok: true, open: true, windowId: res.windowId }
}

export function focusMainFromMollyHud(): void {
  const mains = BrowserWindow.getAllWindows().filter((w) => {
    if (w.isDestroyed() || w === hudWindow) return false
    try {
      return !w.webContents.getURL().includes('mlMollyHud=1')
    } catch {
      return true
    }
  })
  const main = mains[0]
  if (!main) return
  if (main.isMinimized()) main.restore()
  main.show()
  main.focus()
  try {
    main.webContents.send(IPC.MOLLY_SHOW_HUB)
  } catch {
    /* ignore */
  }
}
