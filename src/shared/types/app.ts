export interface AppInfoResponse {
  version: string
  buildNumber: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
}

export interface WelcomeStateResponse {
  hasSeenWelcome: boolean
  /** True when the animated intro splash should be shown: either this is the very first
   * launch ever, or the app was just updated to a version the user hasn't launched yet. */
  showSplash: boolean
}
