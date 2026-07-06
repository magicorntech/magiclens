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
  /**
   * True on platforms where in-app automatic download/install is not offered (currently macOS:
   * without a paid Apple Developer ID certificate, Squirrel.Mac cannot validate updates signed
   * across different builds, so the update UI instead links out to the GitHub release for a
   * manual download).
   */
  manualDownloadOnly: boolean
  /** GitHub release page for the latest version, used for manual download links. */
  releaseUrl: string | null
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
