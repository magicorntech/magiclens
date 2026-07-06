export interface AppInfoResponse {
  version: string
  buildNumber: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
}

export interface WelcomeStateResponse {
  hasSeenWelcome: boolean
}
