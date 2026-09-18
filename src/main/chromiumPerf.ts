import { app, type WebPreferences } from 'electron'
import { join } from 'node:path'

/**
 * Chromium / Electron process flags that must be set before `app.ready`.
 * Tuned for MagicLens (single trusted desktop UI) on Apple Silicon and other platforms.
 */
export function applyChromiumPerformanceFlags(): void {
  // GPU raster path — Metal is preferred on macOS; OOP-R keeps canvas off the main thread.
  app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,Metal')
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('enable-zero-copy')

  // Drop Chromium background services MagicLens never uses (saves RAM / wakeups).
  const disableFeatures = [
    'AutofillServerCommunication',
    'MediaRouter',
    'DialMediaRouteProvider',
    'InterestFeedContentSuggestions',
    // Idle spare renderer (~tens of MB) is wasteful for a single-window app.
    'SpareRendererForSitePerProcess',
    // Win-only occlusion calc; harmless elsewhere, avoids accidental work.
    'CalculateNativeWinOcclusion'
  ]
  app.commandLine.appendSwitch('disable-features', disableFeatures.join(','))

  // Deliberately NOT disabling breakpad/Crashpad: with it off, GPU/renderer process crashes
  // (the class of bug behind macOS's "force quit while reopening windows" prompt on some
  // Apple Silicon Macs) leave zero trace anywhere. Leaving it enabled writes local dumps to
  // app.getPath('crashDumps') that can be inspected without a remote crash-reporting service.
  app.commandLine.appendSwitch('disable-component-update')
  app.commandLine.appendSwitch('disable-domain-reliability')
  app.commandLine.appendSwitch('disable-speech-api')
  // Cap Chromium HTTP/disk cache growth (bytes).
  app.commandLine.appendSwitch('disk-cache-size', String(64 * 1024 * 1024))

  if (process.platform === 'win32') {
    // Prefer discrete GPU when present (no-op on most Apple Silicon machines).
    app.commandLine.appendSwitch('force_high_performance_gpu')
  }
}

/** Shared BrowserWindow webPreferences for main + pop-out windows. */
export function createAppWebPreferences(): WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false,
    backgroundThrottling: true,
    v8CacheOptions: 'code',
    // Needed so Grafana / Prometheus / Argo CD web UIs can open in-app.
    webviewTag: true,
    enablePreferredSizeMode: false
  }
}
