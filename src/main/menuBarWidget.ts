import { join } from 'node:path'
import { app, BrowserWindow, Menu, Tray, nativeImage, screen } from 'electron'
import { IPC } from '@shared/ipc-contract'
import {
  MENU_BAR_GRID_COLUMNS,
  menuBarClustersPerPage,
  type MenuBarWidgetPrefs
} from '@shared/types/menuBarWidget'
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

/** Stands in for the icon in the menu bar when it can't be loaded — see trayIconMissing. */
const TRAY_FALLBACK_TITLE = 'MagicLens'

const POPUP_WIDTH = 320
const POPUP_MIN_HEIGHT = 120
const POPUP_MAX_HEIGHT = 760

/*
 * Height is derived from what a card actually renders rather than one fixed guess, because the
 * card grows with each enabled metric (up to 7 rows: health, cpu, memory, pods, pending,
 * failed, nodes). A single constant was tuned for ~4 rows and left the last cards clipped
 * behind a scrollbar once more metrics were switched on.
 */
/*
 * These mirror the widget's CSS (see .ml-mbw* rules in global.css). Measured rather than
 * estimated — earlier guesses ran a few px over per row, which compounded into a large empty
 * strip once several metrics were enabled.
 *
 * .ml-mbw: 8px top + 10px bottom padding, 8px gap between header/list/pager
 * .ml-mbw__head: 20px tall (its buttons)
 */
const POPUP_CHROME_HEIGHT = 48
/** .ml-mbw-card: 1px borders + 8px padding, top and bottom. */
const POPUP_CARD_BASE = 18
/** .ml-mbw-card__head line box + the card's 6px gap before the metrics. */
const POPUP_CARD_NAME_ROW = 23
/** One .ml-mbw-metric row (11px text / 5px bar, vertically centred). */
const POPUP_METRIC_ROW = 15
/** .ml-mbw-card__metrics gap. */
const POPUP_METRIC_GAP = 5
/** Gap between cards, and between grid columns. */
const POPUP_CARD_GAP = 8
/** .ml-mbw__pager (22px buttons + 2px padding) plus the gap above it. */
const POPUP_PAGER_HEIGHT = 32

let tray: Tray | null = null
let popup: BrowserWindow | null = null
/**
 * True when the tray icon failed to load. The status item then has nothing to draw, so a text
 * label stands in for it — and the label can't be cleared the way it normally is, or the tray
 * would vanish from the menu bar entirely.
 */
let trayIconMissing = false

function trayImage(): Electron.NativeImage {
  // The app icon is a full-colour raster; scaled down it reads fine in the menu bar. A true
  // template image would need a monochrome asset, which this repo doesn't ship.
  const source = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
  if (source.isEmpty()) {
    // createFromPath doesn't throw on a missing/unreadable file — it hands back an empty image,
    // and macOS renders an empty tray image as a zero-width status item. The widget then looks
    // like it never started. Say so loudly; createTray falls back to a text label so the tray
    // is still reachable.
    console.error(
      '[menu-bar-widget] tray icon missing at',
      join(__dirname, '../../resources/icon.png'),
      '— check that resources/** is included in electron-builder.yml `files`.'
    )
    return source
  }
  return source.resize({ width: 18, height: 18 })
}

/** Popup size for one page of cards in the chosen layout, plus the pager when it's shown. */
function popupSizeFor(prefs: MenuBarWidgetPrefs): { width: number; height: number } {
  const count = prefs.clusterIds.length
  const perPage = menuBarClustersPerPage(prefs.layout)
  const onPage = Math.min(Math.max(0, count), perPage)
  const columns = prefs.layout === 'grid' ? MENU_BAR_GRID_COLUMNS : 1
  const rows = Math.ceil(onPage / columns)

  const metricRows = Object.values(prefs.metrics).filter(Boolean).length
  const cardHeight =
    POPUP_CARD_BASE +
    (prefs.showClusterName ? POPUP_CARD_NAME_ROW : 0) +
    metricRows * POPUP_METRIC_ROW +
    Math.max(0, metricRows - 1) * POPUP_METRIC_GAP

  const pager = count > perPage ? POPUP_PAGER_HEIGHT : 0
  const content =
    POPUP_CHROME_HEIGHT + rows * cardHeight + Math.max(0, rows - 1) * POPUP_CARD_GAP + pager

  const height = Math.min(POPUP_MAX_HEIGHT, Math.max(POPUP_MIN_HEIGHT, content))
  // Side-by-side needs the extra column plus the gap between cards.
  const width = columns > 1 ? POPUP_WIDTH * columns + POPUP_CARD_GAP : POPUP_WIDTH
  return { width, height }
}

function createPopup(): BrowserWindow {
  const size = popupSizeFor(getDisplaySettings().menuBarWidget)
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
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

/**
 * Centers the popup under the tray icon and, since a tall metric set can outgrow the screen,
 * trims the height to what actually fits below the menu bar before positioning.
 */
function positionPopup(win: BrowserWindow): void {
  if (!tray) return
  const trayBounds = tray.getBounds()
  const display = screen.getDisplayNearestPoint({
    x: Math.round(trayBounds.x + trayBounds.width / 2),
    y: Math.round(trayBounds.y + trayBounds.height / 2)
  })
  const work = display.workArea
  const y = Math.max(Math.round(trayBounds.y + trayBounds.height + 6), work.y + 4)

  const bounds = win.getBounds()
  const available = work.y + work.height - y - 8
  const height = Math.max(POPUP_MIN_HEIGHT, Math.min(bounds.height, available))
  if (height !== bounds.height) win.setBounds({ ...bounds, height })

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - bounds.width / 2)
  x = Math.min(Math.max(x, work.x + 8), work.x + work.width - bounds.width - 8)

  win.setPosition(x, y, false)
}

function requestRefresh(): void {
  if (popup && !popup.isDestroyed()) popup.webContents.send(IPC.MENU_BAR_WIDGET_REFRESH)
}

function showPopup(): void {
  const isNew = !popup || popup.isDestroyed()
  if (isNew) popup = createPopup()
  const size = popupSizeFor(getDisplaySettings().menuBarWidget)
  popup!.setBounds({ ...popup!.getBounds(), width: size.width, height: size.height })
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

function mainWindow(): BrowserWindow | null {
  const [existing] = BrowserWindow.getAllWindows().filter(
    (w) => w !== popup && !w.isDestroyed() && !w.getParentWindow()
  )
  return existing ?? null
}

function openMainWindow(): BrowserWindow | null {
  const existing = mainWindow()
  if (existing) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    return existing
  }
  app.emit('activate')
  return mainWindow()
}

/**
 * Brings up the main window on Settings > Widget. The popup is dismissed first so the panel
 * isn't left floating over the window the user was just sent to.
 */
export function openMenuBarWidgetSettings(): void {
  hideMenuBarWidgetPopup()
  const win = openMainWindow()
  if (!win) return
  const send = (): void =>
    win.webContents.send(IPC.APP_OPEN_SETTINGS_SECTION, { section: 'widget' })
  // A window created by this call is still loading; wait for the renderer to mount its listener.
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open MagicLens', click: () => openMainWindow() },
    { label: 'Widget settings…', click: openMenuBarWidgetSettings },
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
  if (prefs.trayLabel === 'none') tray.setTitle(trayIconMissing ? TRAY_FALLBACK_TITLE : '')
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
  trayIconMissing = false
}

function createTray(): void {
  if (tray && !tray.isDestroyed()) return
  const image = trayImage()
  try {
    tray = new Tray(image)
  } catch (err) {
    // Some Electron versions reject an empty image outright rather than showing nothing.
    // Either way the widget is the only thing affected — never take the app down with it.
    console.error('[menu-bar-widget] could not create tray', err)
    tray = null
    return
  }
  trayIconMissing = image.isEmpty()
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
  if (prefs.trayLabel !== 'none') {
    tray.setTitle(title)
    return
  }
  // Blanking the title is only safe while there's an icon left to click.
  tray.setTitle(trayIconMissing ? TRAY_FALLBACK_TITLE : '')
}

export function hideMenuBarWidgetPopup(): void {
  if (popup && !popup.isDestroyed()) popup.hide()
}

/**
 * The constants above can only ever approximate what the panel renders — line heights, the
 * active UI font and the locale all shift row heights slightly, and being a few px short
 * means the last card sits behind a scrollbar. So the renderer measures its own overflow and
 * asks for exactly that many extra px; this grows the popup (never past the screen) and
 * re-anchors it under the tray icon.
 */
export function growMenuBarWidgetPopup(overflowPx: number): void {
  if (!popup || popup.isDestroyed() || !popup.isVisible()) return
  const extra = Math.ceil(overflowPx)
  if (extra <= 0) return
  const bounds = popup.getBounds()
  popup.setBounds({ ...bounds, height: Math.min(POPUP_MAX_HEIGHT, bounds.height + extra) })
  // positionPopup also clamps to the work area, so an over-tall panel still fits the screen.
  positionPopup(popup)
}
