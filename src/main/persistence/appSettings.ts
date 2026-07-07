import Store from 'electron-store'
import type { UpdateSettings } from '@shared/types/update'
import { defaultDisplaySettings, type DisplaySettings } from '@shared/types/app'

interface AppSettings {
  hasSeenWelcome: boolean
  updateSettings: UpdateSettings
  skippedVersion: string | null
  lastSeenSplashVersion: string | null
  displaySettings: DisplaySettings
}

const defaultUpdateSettings: UpdateSettings = {
  checkAutomatically: true,
  checkOnStartup: true,
  includePrerelease: false,
  autoDownload: false,
  askBeforeInstall: true
}

const defaults: AppSettings = {
  hasSeenWelcome: false,
  updateSettings: defaultUpdateSettings,
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

export function getUpdateSettings(): UpdateSettings {
  return { ...defaultUpdateSettings, ...store.get('updateSettings') }
}

export function setUpdateSettings(patch: Partial<UpdateSettings>): UpdateSettings {
  const next = { ...getUpdateSettings(), ...patch }
  store.set('updateSettings', next)
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
  return { ...defaultDisplaySettings, ...store.get('displaySettings') }
}

export function setDisplaySettings(patch: Partial<DisplaySettings>): DisplaySettings {
  const next = { ...getDisplaySettings(), ...patch }
  store.set('displaySettings', next)
  return next
}
