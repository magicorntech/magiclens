import { join } from 'node:path'
import { app, BrowserWindow, Menu, Tray, nativeImage, screen } from 'electron'
import { IPC } from '@shared/ipc-contract'
import { MENU_BAR_CLUSTERS_PER_PAGE } from '@shared/types/menuBarWidget'
import { createAppWebPreferences } from './chromiumPerf'
import { getDisplaySettings } from './persistence/appSettings'

/**
 * macOS menu-bar widget: a Tray icon whose click toggles a small frameless popup window
 * showing live metrics for up to 3 chosen clusters.
 *
 * This is deliberately NOT a WidgetKit widget — those are native Swift App Extensions that
 * need full Xcode plus a signed Apple Developer Team ID with an App Group entitlement, none
 * of which an Electron renderer can produce. A Tray popup is the closest equivalent that
 * ships with the app itself.
 */

const POPUP_WIDTH = 320
const POPUP_MIN_HEIGHT = 140
const POPUP_MAX_HEIGHT = 620
/** Rough per-cluster card height, used to size the popup before it renders. */
const POPUP_CLUSTER_HEIGHT = 132
/** Extra room for the pager strip when more clusters are selected than fit on one page. */
const POPUP_PAGER_HEIGHT = 34

let tray: Tray | null = null
let popup: BrowserWindow | null = null

function trayImage(): Electron.NativeImage {
  // The app icon is a full-colour raster; scaled down it reads fine in the menu bar. A true
  // template image would need a monochrome asset, which this repo doesn't ship.
  const image = nativeImage
    .createFromPath(join(__dirname, '../../resources/icon.png'))
    .resize({ width: 18, height: 18 })
  // An empty image still yields a clickable (invisible) tray slot rather than throwing.
  return image
}

function popupHeightFor(clusterCount: number): number {
  // Only ever sized for one page's worth of cards, plus the pager when there's more than one.
  const onPage = Math.min(Math.max(0, clusterCount), MENU_BAR_CLUSTERS_PER_PAGE)
  const pager = clusterCount > MENU_BAR_CLUSTERS_PER_PAGE ? POPUP_PAGER_HEIGHT : 0
  const estimated = POPUP_MIN_HEIGHT + onPage * POPUP_CLUSTER_HEIGHT + pager
  return Math.min(POPUP_MAX_HEIGHT, Math.max(POPUP_MIN_HEIGHT, estimated))
}

function createPopup(): BrowserWindow {
  const prefs = getDisplaySettings().menuBarWidget
  const win = new BrowserWindow({
    width: POPUP_WIDTH,
    height: popupHeightFor(prefs.clusterIds.length),
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Keeps the popup out of Mission Control / app-switcher like a real menu-bar panel.
    type: process.platform === 'darwin' ? 'panel' : undefined,
    vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
    webPreferences: createAppWebPreferences()
  })

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Menu-bar panels dismiss when they lose focus.
  win.on('blur', () => {
    if (!win.isDestroyed()) win.hide()
  })

  const params = new URLSearchParams({ mlWidget: '1' })
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win
      .loadURL(`${process.env['ELECTRON_RENDERER_URL']}?${params.toString()}`)
      .catch((err) => console.error('[menu-bar-widget] loadURL failed', err))
  } else {
    void win
      .loadFile(join(__dirname, '../renderer/index.html'), { search: params.toString() })
      .catch((err) => console.error('[menu-bar-widget] loadFile failed', err))
  }

  return win
}

/** Centers the popup under the tray icon, clamped inside the icon's display. */
function positionPopup(win: BrowserWindow): void {
  if (!tray) return
  const trayBounds = tray.getBounds()
  const winBounds = win.getBounds()
  const display = screen.getDisplayNearestPoint({
    x: Math.round(trayBounds.x + trayBounds.width / 2),
    y: Math.round(trayBounds.y + trayBounds.height / 2)
  })
  const work = display.workArea

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
  x = Math.min(Math.max(x, work.x + 8), work.x + work.width - winBounds.width - 8)
  const y = Math.round(trayBounds.y + trayBounds.height + 6)

  win.setPosition(x, Math.max(y, work.y + 4), false)
}

function requestRefresh(): void {
  if (popup && !popup.isDestroyed()) popup.webContents.send(IPC.MENU_BAR_WIDGET_REFRESH)
}

function showPopup(): void {
  const isNew = !popup || popup.isDestroyed()
  if (isNew) popup = createPopup()
  const prefs = getDisplaySettings().menuBarWidget
  popup!.setBounds({
    ...popup!.getBounds(),
    width: POPUP_WIDTH,
    height: popupHeightFor(prefs.clusterIds.length)
  })
  positionPopup(popup!)
  popup!.show()
  popup!.focus()
  // The popup is reused across opens and its timers are throttled while hidden, so whatever
  // it last rendered can be stale. Refetch on every open (a fresh window loads on its own).
  if (!isNew) requestRefresh()
}

function togglePopup(): void {
  if (popup && !popup.isDestroyed() && popup.isVisible()) {
    popup.hide()
    return
  }
  showPopup()
}

function openMainWindow(): void {
  const [existing] = BrowserWindow.getAllWindows().filter(
    (w) => w !== popup && !w.isDestroyed() && !w.getParentWindow()
  )
  if (existing) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    return
  }
  app.emit('activate')
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open MagicLens', click: openMainWindow },
    { type: 'separator' },
    { label: 'Refresh', click: requestRefresh },
    { type: 'separator' },
    { label: 'Quit MagicLens', click: () => app.quit() }
  ])
}

function applyTrayLabel(): void {
  if (!tray || process.platform !== 'darwin') return
  // Live metric text in the menu bar is pushed from the popup renderer via
  // setMenuBarWidgetTrayTitle; until then, show nothing next to the icon.
  const prefs = getDisplaySettings().menuBarWidget
  if (prefs.trayLabel === 'none') tray.setTitle('')
}

function destroyTray(): void {
  if (popup && !popup.isDestroyed()) {
    popup.destroy()
  }
  popup = null
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
  }
  tray = null
}

function createTray(): void {
  if (tray && !tray.isDestroyed()) return
  tray = new Tray(trayImage())
  tray.setToolTip('MagicLens — cluster metrics')
  tray.on('click', togglePopup)
  // Right-click opens the menu instead of the popup, matching macOS conventions.
  tray.on('right-click', () => tray?.popUpContextMenu(buildTrayMenu()))
  applyTrayLabel()
}

/**
 * Creates or tears down the tray to match the persisted preference. Safe to call repeatedly —
 * the Settings UI calls it after every change.
 */
export function syncMenuBarWidget(): void {
  const prefs = getDisplaySettings().menuBarWidget
  if (prefs.enabled) {
    createTray()
    applyTrayLabel()
    // Pushes new cluster/metric/interval choices into an already-open popup right away.
    requestRefresh()
  } else {
    destroyTray()
  }
}

/** Renderer-pushed live text shown next to the tray icon (macOS only). */
export function setMenuBarWidgetTrayTitle(title: string): void {
  if (!tray || tray.isDestroyed() || process.platform !== 'darwin') return
  const prefs = getDisplaySettings().menuBarWidget
  tray.setTitle(prefs.trayLabel === 'none' ? '' : title)
}

export function hideMenuBarWidgetPopup(): void {
  if (popup && !popup.isDestroyed()) popup.hide()
}
