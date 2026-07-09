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

export type ResourceDetailPlacement = 'drawer' | 'right' | 'bottom'

import type { NodesDashboardPrefs } from './nodesDashboard'
import { defaultNodesDashboardPrefs } from './nodesDashboard'

export interface DisplaySettings {
  showClusterTabLogos: boolean
  showResourceTabIcons: boolean
  resourceDetailPlacement: ResourceDetailPlacement
  showNodesPageEvents: boolean
  nodesDashboard: NodesDashboardPrefs
}

export const defaultDisplaySettings: DisplaySettings = {
  showClusterTabLogos: true,
  showResourceTabIcons: true,
  resourceDetailPlacement: 'drawer',
  showNodesPageEvents: true,
  nodesDashboard: defaultNodesDashboardPrefs
}
