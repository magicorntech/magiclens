export type UpdatePhase = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

/** Where an update failure came from — check failures must never look like "an update failed to install". */
export type UpdateErrorKind = 'check' | 'download'

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
  /** Present only when `phase === 'error'`. Check failures stay soft (settings only); download
   * failures may show the install banner. */
  errorKind: UpdateErrorKind | null
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
