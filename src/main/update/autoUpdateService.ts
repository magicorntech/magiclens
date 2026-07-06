import { app, shell, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '@shared/ipc-contract'
import type { UpdateSettings, UpdateState } from '@shared/types/update'
import {
  getSkippedVersion,
  getUpdateSettings,
  setSkippedVersion,
  setUpdateSettings
} from '../persistence/appSettings'

const AUTO_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
const REMIND_LATER_DELAY_MS = 60 * 60 * 1000 // 1 hour
const RELEASES_BASE_URL = 'https://github.com/magicorntech/magiclens/releases'

/**
 * Squirrel.Mac (the macOS engine behind electron-updater's in-app download/install flow)
 * requires every update to be signed with the exact same code-signing identity as the
 * currently-installed build. Without a paid Apple Developer ID certificate we can only produce
 * ad-hoc signatures, which are unique per-build and will always fail that check ("Code signature
 * ... did not pass validation"). Rather than let users hit that dead end, macOS builds skip the
 * in-app download/install entirely and just link out to the GitHub release for a manual DMG
 * download. Windows/Linux are unaffected and keep the full automatic flow.
 */
const MANUAL_DOWNLOAD_ONLY = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null
let autoCheckTimer: ReturnType<typeof setInterval> | null = null
let remindLaterTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

let state: UpdateState = {
  phase: 'idle',
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null,
  releaseDate: null,
  progress: null,
  error: null,
  skippedVersion: getSkippedVersion(),
  notificationDismissed: false,
  manualDownloadOnly: MANUAL_DOWNLOAD_ONLY,
  releaseUrl: null
}

function normalizeReleaseNotes(notes: string | { version: string; note?: string | null }[] | null | undefined): string | null {
  if (!notes) return null
  if (typeof notes === 'string') return notes
  return notes.map((entry) => `## ${entry.version}\n${entry.note ?? ''}`).join('\n\n')
}

function broadcastState(): void {
  mainWindow?.webContents.send(IPC.UPDATE_STATE_CHANGED, state)
}

function setState(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch }
  broadcastState()
}

/**
 * `electron-updater`'s GitHub provider always resolves release asset URLs over HTTPS and, for
 * every platform, verifies the downloaded file's sha512 checksum against the value published in
 * the provider metadata (latest.yml / latest-mac.yml / latest-linux.yml) before it will install
 * it - a corrupted or tampered artifact is rejected automatically. On Windows/macOS, if the
 * packaged app and the update artifact are code-signed, the OS-level signature is also validated
 * during install. We never disable these checks.
 */
function registerUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    setState({ phase: 'checking', error: null })
  })

  autoUpdater.on('update-available', (info) => {
    const skipped = getSkippedVersion()
    setState({
      phase: 'available',
      latestVersion: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate ?? null,
      releaseUrl: `${RELEASES_BASE_URL}/tag/v${info.version}`,
      skippedVersion: skipped,
      notificationDismissed: false,
      error: null
    })
    if (!MANUAL_DOWNLOAD_ONLY && skipped !== info.version && getUpdateSettings().autoDownload) {
      void autoUpdater.downloadUpdate().catch((err) => {
        setState({ phase: 'error', error: err instanceof Error ? err.message : String(err) })
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    setState({ phase: 'not-available', latestVersion: null, releaseNotes: null, releaseDate: null, error: null })
  })

  autoUpdater.on('error', (err) => {
    setState({ phase: 'error', error: err instanceof Error ? err.message : String(err) })
  })

  autoUpdater.on('download-progress', (progress) => {
    setState({
      phase: 'downloading',
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      }
    })
  })

  autoUpdater.on('update-downloaded', () => {
    setState({ phase: 'downloaded', progress: null, error: null })
    if (!getUpdateSettings().askBeforeInstall) {
      // "Ask before install" is disabled - proceed straight to install/restart.
      setTimeout(() => autoUpdater.quitAndInstall(), 1000)
    }
  })
}

function applySettingsToUpdater(settings: UpdateSettings): void {
  autoUpdater.allowPrerelease = settings.includePrerelease
  autoUpdater.autoDownload = false // we always trigger downloads explicitly (respecting autoDownload/askBeforeInstall)
  autoUpdater.autoInstallOnAppQuit = false
}

function scheduleAutoCheck(settings: UpdateSettings): void {
  if (autoCheckTimer) {
    clearInterval(autoCheckTimer)
    autoCheckTimer = null
  }
  if (settings.checkAutomatically && app.isPackaged) {
    autoCheckTimer = setInterval(() => {
      void checkForUpdates()
    }, AUTO_CHECK_INTERVAL_MS)
  }
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window
  if (initialized) return
  initialized = true

  autoUpdater.forceDevUpdateConfig = false
  autoUpdater.disableWebInstaller = true

  registerUpdaterEvents()

  const settings = getUpdateSettings()
  applySettingsToUpdater(settings)
  scheduleAutoCheck(settings)

  if (!app.isPackaged) {
    console.log('[update] Running in development - skipping startup update check (no app-update.yml).')
    return
  }

  if (settings.checkOnStartup) {
    setTimeout(() => void checkForUpdates(), 3000)
  }
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) {
    setState({ phase: 'error', error: 'Updates can only be checked in a packaged build of MagicLens.' })
    return
  }
  try {
    applySettingsToUpdater(getUpdateSettings())
    await autoUpdater.checkForUpdates()
  } catch (err) {
    setState({ phase: 'error', error: err instanceof Error ? err.message : String(err) })
  }
}

export async function downloadUpdate(): Promise<void> {
  if (MANUAL_DOWNLOAD_ONLY) {
    openReleasePage()
    return
  }
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    setState({ phase: 'error', error: err instanceof Error ? err.message : String(err) })
  }
}

export function installUpdate(): void {
  if (MANUAL_DOWNLOAD_ONLY) return
  autoUpdater.quitAndInstall()
}

export function openReleasePage(): void {
  const url = state.releaseUrl ?? RELEASES_BASE_URL
  void shell.openExternal(url)
}

export function skipVersion(version: string): void {
  setSkippedVersion(version)
  setState({ skippedVersion: version })
}

export function remindLater(): void {
  setState({ notificationDismissed: true })
  if (remindLaterTimer) clearTimeout(remindLaterTimer)
  remindLaterTimer = setTimeout(() => {
    setState({ notificationDismissed: false })
  }, REMIND_LATER_DELAY_MS)
}

export function getUpdateState(): UpdateState {
  return state
}

export function getUpdateSettingsSnapshot(): UpdateSettings {
  return getUpdateSettings()
}

export function updateUpdateSettings(patch: Partial<UpdateSettings>): UpdateSettings {
  const next = setUpdateSettings(patch)
  applySettingsToUpdater(next)
  scheduleAutoCheck(next)
  return next
}
