import { BrowserWindow, app, ipcMain, screen } from 'electron'
import { cpus, freemem, hostname, release, totalmem, type as osType } from 'node:os'
import { IPC } from '@shared/ipc-contract'
import type {
  AppHostInfoResponse,
  AppInfoResponse,
  AppProcessMetricRow,
  AppProcessMetricsResponse,
  DisplaySettings,
  WelcomeStateResponse
} from '@shared/types/app'
import {
  getDisplaySettings,
  getHasSeenWelcome,
  getLastSeenSplashVersion,
  setDisplaySettings,
  setHasSeenWelcome,
  setLastSeenSplashVersion
} from '../persistence/appSettings'
import packageJson from '../../../package.json'

function windowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function emitFullscreenChanged(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  win.webContents.send(IPC.APP_FULLSCREEN_CHANGED, { fullscreen: win.isFullScreen() })
}

function wireFullscreenEvents(win: BrowserWindow): void {
  win.on('enter-full-screen', () => emitFullscreenChanged(win))
  win.on('leave-full-screen', () => emitFullscreenChanged(win))
}

function collectHostInfo(): AppHostInfoResponse {
  const cpuList = cpus()
  const primary = screen.getPrimaryDisplay()
  let systemVersion: string | undefined
  try {
    systemVersion = process.getSystemVersion?.()
  } catch {
    // optional
  }

  return {
    hostname: hostname(),
    platform: process.platform,
    osType: osType(),
    osRelease: release(),
    arch: process.arch,
    cpuModel: cpuList[0]?.model?.trim() || 'Unknown CPU',
    cpuCores: cpuList.length,
    cpuSpeedMhz: cpuList[0]?.speed ?? 0,
    totalMemoryBytes: totalmem(),
    freeMemoryBytes: freemem(),
    primaryDisplayWidth: primary.size.width,
    primaryDisplayHeight: primary.size.height,
    primaryDisplayScaleFactor: primary.scaleFactor,
    electronVersion: process.versions.electron ?? '-',
    chromeVersion: process.versions.chrome ?? '-',
    nodeVersion: process.versions.node ?? '-',
    systemVersion
  }
}

function collectProcessMetrics(): AppProcessMetricsResponse {
  // First call primes Electron's CPU sampler; subsequent polls report deltas.
  const metrics = app.getAppMetrics()
  const processes: AppProcessMetricRow[] = metrics.map((m) => {
    const anyM = m as Electron.ProcessMetric & { name?: string; serviceName?: string }
    return {
      pid: m.pid,
      type: m.type,
      name: anyM.name || anyM.serviceName || m.type,
      cpuPercent: Math.round((m.cpu?.percentCPUUsage ?? 0) * 10) / 10,
      memoryBytes: (m.memory?.workingSetSize ?? 0) * 1024
    }
  })

  const totalMemoryBytes = processes.reduce((sum, p) => sum + p.memoryBytes, 0)
  const totalCpuPercent = Math.round(processes.reduce((sum, p) => sum + p.cpuPercent, 0) * 10) / 10
  const heap = process.memoryUsage()

  let systemFreeMemoryBytes: number | undefined
  let systemTotalMemoryBytes: number | undefined
  try {
    const sys = process.getSystemMemoryInfo()
    // Values are in KB.
    systemFreeMemoryBytes = sys.free * 1024
    systemTotalMemoryBytes = sys.total * 1024
  } catch {
    // unavailable on some platforms
  }

  return {
    sampledAt: Date.now(),
    processCount: processes.length,
    totalMemoryBytes,
    totalCpuPercent,
    mainHeapUsedBytes: heap.heapUsed,
    mainHeapTotalBytes: heap.heapTotal,
    systemFreeMemoryBytes,
    systemTotalMemoryBytes,
    processes: processes.sort((a, b) => b.memoryBytes - a.memoryBytes)
  }
}

export function registerAppHandlers(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    wireFullscreenEvents(win)
  }
  app.on('browser-window-created', (_event, win) => {
    wireFullscreenEvents(win)
  })

  // Prime CPU sampler so the first UI poll is meaningful.
  void app.getAppMetrics()

  ipcMain.handle(IPC.APP_GET_INFO, async (): Promise<AppInfoResponse> => ({
    version: app.getVersion(),
    buildNumber: packageJson.buildNumber ?? '-',
    electronVersion: process.versions.electron ?? '-',
    chromeVersion: process.versions.chrome ?? '-',
    nodeVersion: process.versions.node ?? '-',
    platform: process.platform
  }))

  ipcMain.handle(IPC.APP_GET_WELCOME_STATE, async (): Promise<WelcomeStateResponse> => {
    const hasSeenWelcome = getHasSeenWelcome()
    const showSplash = !hasSeenWelcome || getLastSeenSplashVersion() !== app.getVersion()
    return { hasSeenWelcome, showSplash }
  })

  ipcMain.handle(IPC.APP_SET_WELCOME_SEEN, async (): Promise<{ ok: true }> => {
    setHasSeenWelcome(true)
    return { ok: true }
  })

  ipcMain.handle(IPC.APP_SET_SPLASH_SEEN, async (): Promise<{ ok: true }> => {
    setLastSeenSplashVersion(app.getVersion())
    return { ok: true }
  })

  ipcMain.handle(IPC.APP_GET_DISPLAY_SETTINGS, async (): Promise<DisplaySettings> => getDisplaySettings())

  ipcMain.handle(
    IPC.APP_SET_DISPLAY_SETTINGS,
    async (_e, patch: Partial<DisplaySettings>): Promise<DisplaySettings> => setDisplaySettings(patch)
  )

  ipcMain.handle(IPC.APP_GET_FULLSCREEN, (event): { fullscreen: boolean } => {
    const win = windowFromEvent(event)
    return { fullscreen: win?.isFullScreen() ?? false }
  })

  ipcMain.handle(IPC.APP_TOGGLE_FULLSCREEN, (event): { fullscreen: boolean } => {
    const win = windowFromEvent(event)
    if (!win) return { fullscreen: false }
    const next = !win.isFullScreen()
    win.setFullScreen(next)
    return { fullscreen: next }
  })

  ipcMain.handle(IPC.APP_GET_PROCESS_METRICS, async (): Promise<AppProcessMetricsResponse> => {
    return collectProcessMetrics()
  })

  ipcMain.handle(IPC.APP_GET_HOST_INFO, async (): Promise<AppHostInfoResponse> => {
    return collectHostInfo()
  })

  ipcMain.handle(IPC.APP_CLEAR_CACHE, async (event): Promise<{ ok: true }> => {
    const win = windowFromEvent(event)
    const session = win?.webContents.session ?? BrowserWindow.getAllWindows()[0]?.webContents.session
    if (session) {
      await session.clearCache()
      await session.clearStorageData({
        storages: ['shadercache', 'serviceworkers', 'cachestorage']
      })
    }
    if (global.gc) {
      try {
        global.gc()
      } catch {
        // optional --expose-gc only
      }
    }
    return { ok: true }
  })

  ipcMain.handle(IPC.APP_OPEN_DEVTOOLS, (event): { ok: true } => {
    const win = windowFromEvent(event)
    win?.webContents.openDevTools({ mode: 'detach' })
    return { ok: true }
  })
}
