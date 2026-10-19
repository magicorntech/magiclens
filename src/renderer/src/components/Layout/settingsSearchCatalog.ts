import type { SettingsSection } from '../../stores/settingsUiStore'

/** i18n keys whose translated text is searchable. A hit opens `section`. */
export const SETTINGS_SEARCH: Array<{ section: SettingsSection; keys: string[] }> = [
  {
    section: 'general',
    keys: [
      'settings.sections.general',
      'settings.sectionHints.general',
      'settings.language.title',
      'settings.general.refreshTitle',
      'settings.general.pageSizeTitle',
      'settings.general.kubeconfigPathTitle',
      'settings.general.dedupeTitle'
    ]
  },
  {
    section: 'alerts',
    keys: [
      'settings.sections.alerts',
      'settings.alerts.watchTitle',
      'settings.alerts.soundTitle',
      'settings.alerts.typesTitle',
      'settings.alerts.os',
      'settings.alerts.sound'
    ]
  },
  {
    section: 'appearance',
    keys: [
      'settings.sections.appearance',
      'settings.appearance.modeTitle',
      'settings.appearance.colorTitle',
      'settings.appearance.typographyTitle',
      'settings.appearance.font',
      'settings.appearance.weight',
      'settings.appearance.contrast'
    ]
  },
  {
    section: 'sparks',
    keys: ['settings.sections.sparks', 'settings.sparks.themesTitle', 'settings.sparks.pluginsTitle']
  },
  {
    section: 'aiAgent',
    keys: [
      'settings.sections.aiAgent',
      'settings.aiAgent.title',
      'settings.aiAgent.optionsTitle',
      'settings.aiAgent.mollyTitle',
      'settings.aiAgent.mollyGeminiLive',
      'settings.aiAgent.mollyLiveModel',
      'settings.aiAgent.mollyWakeWord',
      'settings.aiAgent.hideAssistant'
    ]
  },
  {
    section: 'display',
    keys: [
      'settings.sections.display',
      'settings.sectionHints.display',
      'settings.display.detailsTitle',
      'settings.display.panelTitle',
      'settings.display.fabTitle',
      'settings.display.sidebarTitle',
      'settings.display.workspaceOrderTitle',
      'settings.display.tabIconsTitle',
      'settings.display.chromeToolbarTitle',
      'settings.display.resourceNavOrderTitle',
      'settings.display.nodesTitle',
      'settings.display.showWorkspaces',
      'settings.display.showSidebarLogos'
    ]
  },
  {
    section: 'widget',
    keys: [
      'settings.sections.widget',
      'settings.widget.title',
      'settings.widget.enable',
      'settings.widget.contentTitle',
      'settings.widget.designTitle'
    ]
  },
  {
    section: 'search',
    keys: [
      'settings.sections.search',
      'settings.sectionHints.search',
      'settings.search.behaviorTitle',
      'settings.search.limitTitle',
      'settings.search.allClusters',
      'settings.search.recentTitle',
      'settings.search.typesTitle'
    ]
  },
  {
    section: 'keyboard',
    keys: [
      'settings.sections.keyboard',
      'settings.keyboard.globalTitle',
      'settings.keyboard.workspacesTitle',
      'settings.keyboard.chords.title',
      'settings.keyboard.chords.generate'
    ]
  },
  {
    section: 'updates',
    keys: [
      'settings.sections.updates',
      'settings.updates.preferencesTitle',
      'settings.updates.checkAutomatically',
      'settings.updates.autoDownload'
    ]
  },
  {
    section: 'vpnExtensions',
    keys: [
      'settings.sections.vpnExtensions',
      'settings.vpnExtensions.statusTitle',
      'settings.vpnExtensions.installTitle'
    ]
  },
  {
    section: 'portForwarding',
    keys: [
      'settings.sections.portForwarding',
      'settings.portForwarding.title',
      'settings.portForwarding.idleTimeout',
      'settings.portForwarding.activeTitle'
    ]
  },
  {
    section: 'developer',
    keys: [
      'settings.sections.developer',
      'settings.developer.hostTitle',
      'settings.developer.liveTitle',
      'settings.developer.diagnosticsTitle'
    ]
  },
  {
    section: 'about',
    keys: ['settings.sections.about', 'settings.about.appTitle', 'settings.about.developedBy']
  }
]
