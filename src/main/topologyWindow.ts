import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'

const openWindows = new Map<string, BrowserWindow>()

function windowKey(clusterId: string, namespace: string): string {
  return `${clusterId}::${namespace}`
}

function showWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  if (win.isFullScreen()) win.setFullScreen(false)
  win.show()
  win.focus()
}

export function openTopologyWindow(input: {
  clusterId: string
  namespace: string
}): { ok: true; windowId: number } {
  const key = windowKey(input.clusterId, input.namespace)
  const existing = openWindows.get(key)
  if (existing && !existing.isDestroyed()) {
    showWindow(existing)
    return { ok: true, windowId: existing.id }
  }

  const params = new URLSearchParams({
    mlTopology: '1',
    clusterId: input.clusterId,
    namespace: input.namespace
  })

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    fullscreenable: true,
    title: 'MagicLens — Topology',
    icon: join(__dirname, '../../resources/icon.png'),
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 18 } }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  openWindows.set(key, win)
  win.on('closed', () => {
    if (openWindows.get(key) === win) openWindows.delete(key)
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[topology-window] failed to load', { code, desc, url })
  })

  const finish = (): void => showWindow(win)

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    const url = `${process.env['ELECTRON_RENDERER_URL']}?${params.toString()}`
    void win.loadURL(url).then(finish).catch((err) => {
      console.error('[topology-window] loadURL failed', err)
      finish()
    })
  } else {
    void win
      .loadFile(join(__dirname, '../renderer/index.html'), {
        search: params.toString()
      })
      .then(finish)
      .catch((err) => {
        console.error('[topology-window] loadFile failed', err)
        finish()
      })
  }

  return { ok: true, windowId: win.id }
}
