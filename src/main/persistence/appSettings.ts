import Store from 'electron-store'
import type { UpdateSettings } from '@shared/types/update'
import type { PortForwardSettings } from '@shared/types/portForward'
import { defaultDisplaySettings, type DisplaySettings, normalizeUtilityFabSide, normalizeUiTypography } from '@shared/types/app'
import { normalizeKeyboardShortcuts } from '@shared/types/keyboardShortcuts'
import { normalizeAppLocale } from '@shared/types/locale'
import { normalizeNodesDashboardPrefs } from '@shared/types/nodesDashboard'
import { normalizeChromeToolbarPrefs } from '@shared/types/chromeToolbar'
import { normalizeMenuBarWidgetPrefs } from '@shared/types/menuBarWidget'

interface AppSettings {
  hasSeenWelcome: boolean
  updateSettings: UpdateSettings
  portForwardSettings: PortForwardSettings
  skippedVersion: string | null
  lastSeenSplashVersion: string | null
  displaySettings: DisplaySettings
}

const defaultUpdateSettings: UpdateSettings = {
  checkAutomatically: true,
  checkOnStartup: true,
  includePrerelease: false,
  // Downloading in the background is the point of an auto-updater; the user still confirms the
  // restart below, so nothing happens behind their back.
  autoDownload: true,
  askBeforeInstall: true
}

const defaultPortForwardSettings: PortForwardSettings = {
  idleTimeoutMinutes: 30
}

const defaults: AppSettings = {
  hasSeenWelcome: false,
  updateSettings: defaultUpdateSettings,
  portForwardSettings: defaultPortForwardSettings,
  skippedVersion: null,
  lastSeenSplashVersion: null,
  displaySettings: defaultDisplaySettings
}

const store = new Store<AppSettings>({
  name: 'app-settings',
  defaults
})

export function getHasSeenWelcome(): boolean {
  return store.get('hasSeenWelcome')
}

export function setHasSeenWelcome(value: boolean): void {
  store.set('hasSeenWelcome', value)
}

/**
 * macOS builds used to hide the auto-download toggle completely: without a Developer ID
 * certificate the app could not install its own updates, so it was pinned off and the UI only
 * offered a link to the GitHub release. Any `autoDownload: false` stored on a Mac is therefore a
 * leftover of that forced state, not a choice the user could have made — releases are signed and
 * notarized now, so it is cleared once and the new default applies. Windows and Linux always
 * showed the toggle, so their stored value is left alone.
 */
function migrateMacAutoDownload(): void {
  if (process.platform !== 'darwin') return
  if (store.get('autoDownloadUnpinned')) return
  store.set('autoDownloadUnpinned', true)

  const stored = store.get('updateSettings') as Partial<UpdateSettings> | undefined
  if (!stored || stored.autoDownload !== false) return
  store.set('updateSettings', { ...stored, autoDownload: defaultUpdateSettings.autoDownload })
}

migrateMacAutoDownload()

export function getUpdateSettings(): UpdateSettings {
  return { ...defaultUpdateSettings, ...store.get('updateSettings') }
}

export function setUpdateSettings(patch: Partial<UpdateSettings>): UpdateSettings {
  const next = { ...getUpdateSettings(), ...patch }
  store.set('updateSettings', next)
  return next
}

export function getPortForwardSettings(): PortForwardSettings {
  return { ...defaultPortForwardSettings, ...store.get('portForwardSettings') }
}

export function setPortForwardSettings(patch: Partial<PortForwardSettings>): PortForwardSettings {
  const next = { ...getPortForwardSettings(), ...patch }
  store.set('portForwardSettings', next)
  return next
}

export function getSkippedVersion(): string | null {
  return store.get('skippedVersion')
}

export function setSkippedVersion(version: string | null): void {
  store.set('skippedVersion', version)
}

export function getLastSeenSplashVersion(): string | null {
  return store.get('lastSeenSplashVersion')
}

export function setLastSeenSplashVersion(version: string): void {
  store.set('lastSeenSplashVersion', version)
}

export function getDisplaySettings(): DisplaySettings {
  const stored = store.get('displaySettings')
  const rawOffset = stored?.utilityFabOffset
  const utilityFabOffset =
    rawOffset &&
    typeof rawOffset.xPct === 'number' &&
    typeof rawOffset.yPct === 'number' &&
    Number.isFinite(rawOffset.xPct) &&
    Number.isFinite(rawOffset.yPct)
      ? {
          xPct: Math.min(96, Math.max(4, rawOffset.xPct)),
          yPct: Math.min(96, Math.max(4, rawOffset.yPct))
        }
      : null
  return {
    ...defaultDisplaySettings,
    ...stored,
    utilityFabSide: normalizeUtilityFabSide(stored?.utilityFabSide),
    utilityFabOffset,
    uiTypography: normalizeUiTypography(stored?.uiTypography),
    nodesDashboard: normalizeNodesDashboardPrefs(stored?.nodesDashboard),
    menuBarWidget: normalizeMenuBarWidgetPrefs(stored?.menuBarWidget),
    chromeToolbar: normalizeChromeToolbarPrefs(stored?.chromeToolbar),
    keyboardShortcuts: normalizeKeyboardShortcuts(stored?.keyboardShortcuts),
    locale: normalizeAppLocale(stored?.locale),
    kubeconfigScanPath: typeof stored?.kubeconfigScanPath === 'string' ? stored.kubeconfigScanPath : ''
  }
}

export function setDisplaySettings(patch: Partial<DisplaySettings>): DisplaySettings {
  const current = getDisplaySettings()
  const next: DisplaySettings = {
    ...current,
    ...patch,
    utilityFabSide: normalizeUtilityFabSide(patch.utilityFabSide ?? current.utilityFabSide),
    uiTypography: normalizeUiTypography(patch.uiTypography ?? current.uiTypography),
    nodesDashboard: patch.nodesDashboard
      ? normalizeNodesDashboardPrefs({ ...current.nodesDashboard, ...patch.nodesDashboard })
      : current.nodesDashboard,
    menuBarWidget: patch.menuBarWidget
      ? normalizeMenuBarWidgetPrefs({ ...current.menuBarWidget, ...patch.menuBarWidget })
      : current.menuBarWidget,
    chromeToolbar: patch.chromeToolbar
      ? normalizeChromeToolbarPrefs({ ...current.chromeToolbar, ...patch.chromeToolbar })
      : current.chromeToolbar,
    keyboardShortcuts: patch.keyboardShortcuts
      ? normalizeKeyboardShortcuts({ ...current.keyboardShortcuts, ...patch.keyboardShortcuts })
      : current.keyboardShortcuts,
    locale: normalizeAppLocale(patch.locale ?? current.locale),
    kubeconfigScanPath:
      patch.kubeconfigScanPath !== undefined ? patch.kubeconfigScanPath : current.kubeconfigScanPath
  }
  store.set('displaySettings', next)
  return next
}
