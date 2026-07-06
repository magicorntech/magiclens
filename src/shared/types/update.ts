export type UpdatePhase = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdateState {
  phase: UpdatePhase
  currentVersion: string
  latestVersion: string | null
  releaseNotes: string | null
  releaseDate: string | null
  progress: UpdateProgress | null
  error: string | null
  skippedVersion: string | null
  /** True once the user dismisses the floating banner with "Remind me later" for the current
   * latestVersion; automatically cleared after a delay so the banner reappears. */
  notificationDismissed: boolean
}

export interface UpdateSettings {
  checkAutomatically: boolean
  checkOnStartup: boolean
  includePrerelease: boolean
  autoDownload: boolean
  askBeforeInstall: boolean
}

export interface SkipVersionRequest {
  version: string
}
