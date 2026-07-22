export const en = {
  common: {
    settings: 'Settings',
    custom: 'Custom',
    version: 'Version',
    build: 'Build',
    manual: 'Manual',
    connected: 'Connected',
    connecting: 'Connecting…',
    disconnected: 'Disconnected',
    error: 'Error',
    total: 'total',
    clusters: 'Clusters',
    vpn: 'VPN',
    favorites: 'Favorites'
  },
  chrome: {
    searchPlaceholder: 'Search clusters, resources, namespaces…',
    manageClusters: 'Manage clusters',
    clustersMeta: '{{total}} total · {{connected}} connected',
    vpnTooltip: 'VPN profiles (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Connected · {{name}}',
    vpnConnecting: 'Connecting · {{name}}',
    searchFavorites: 'Search favorites',
    searchWorkspaces: 'Search workspaces…',
    noFavoriteClusters: 'No favorite clusters',
    noWorkspaceMatch: 'No workspaces match',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar'
  },
  settings: {
    title: 'Settings',
    sections: {
      general: 'General',
      updates: 'Updates',
      display: 'Display',
      keyboard: 'Keyboard',
      appearance: 'Appearance',
      about: 'About'
    },
    language: {
      title: 'Language',
      hint: 'Choose the app language. Ant Design controls and dates follow this setting.'
    },
    general: {
      refreshTitle: 'Resource refresh interval',
      refreshHint:
        'How often resource lists and metrics refresh automatically. Applies to every open cluster tab; pausing live refresh is still available per resource view.'
    },
    updates: {
      available: 'v{{version}} available',
      checkAutomatically: 'Check for updates automatically',
      checkOnStartup: 'Check on startup',
      includePrerelease: 'Include pre-release versions',
      macosManual:
        "Automatic download/install isn't available on macOS without a paid Apple Developer ID certificate. When an update is found, MagicLens links out to the GitHub release for a manual DMG download instead.",
      autoDownload: 'Auto-download updates',
      askBeforeInstall: 'Ask before install',
      checkNow: 'Check for updates now',
      openCenter: 'Open Update Center'
    },
    display: {
      detailsTitle: 'Resource details',
      detailsHint:
        'Choose whether clicking a resource opens its detail view in a right-side panel or as a tab in the bottom dock (alongside Terminal and YAML editor).',
      placementDrawer: 'Right drawer (recommended)',
      placementRight: 'Right panel (split view)',
      placementBottom: 'Bottom tab',
      nodesTitle: 'Nodes page layout',
      nodesHint:
        'Toggle sections on or off and drag to reorder. The table section stays flexible and fills remaining space when visible.',
      nodesChooser: 'Choose which sections appear on the Nodes page and drag to reorder them.',
      sidebarTitle: 'Sidebar',
      showFavorites: 'Show Favorites section',
      showFavoritesHint:
        'When enabled, Favorites appear above Workspaces in the left sidebar. Click the Favorites header to collapse or expand it.',
      tabIconsTitle: 'Tab icons',
      showClusterLogos: 'Show logos on cluster tabs',
      showResourceIcons: 'Show icons on resource tabs',
      tabIconsHint:
        'Cluster tabs use the cluster logo you set when adding a cluster. Resource tabs use the same icons as the left menu.'
    },
    nodesSections: {
      health: 'Cluster Health',
      resources: 'Resource Usage',
      quickInsights: 'Quick Insights',
      topConsumers: 'Top Consumers',
      table: 'Nodes Table',
      events: 'Events Panel'
    },
    keyboard: {
      hint: 'Click a shortcut to record a new key combo. Conflicting bindings swap automatically. Esc cancels.',
      reset: 'Reset defaults',
      pressKeys: 'Press keys…',
      recordError: 'Use a shortcut with ⌘/Ctrl (or Alt), or press Esc to cancel',
      changeAria: 'Change shortcut for {{label}}',
      actions: {
        globalSearch: {
          label: 'Global search',
          description: 'Open or close the cluster / resource search palette'
        },
        toggleSplitView: {
          label: 'Toggle split view',
          description: 'Compare two cluster tabs side by side'
        },
        goToClusters: {
          label: 'Go to clusters',
          description: 'Open the clusters list'
        },
        goToVpn: {
          label: 'Go to VPN',
          description: 'Open the VPN profiles page'
        },
        toggleSidebar: {
          label: 'Toggle sidebar',
          description: 'Collapse or expand the left sidebar'
        },
        openSettings: {
          label: 'Open settings',
          description: 'Open the settings window'
        }
      }
    },
    appearance: {
      intro:
        'Pick a preset or choose your own accent color. Sidebar, resource menu, and panels all follow the active theme. Use the header toggle for light / dark mode.',
      customAccent: 'Custom accent',
      customAccentHint: 'Applies to sidebars, buttons, highlights, and chart accents.',
      customSwatch: 'Your own accent color'
    }
  },
  vpn: {
    heroEyebrow: 'Secure tunnel',
    title: 'VPN',
    status: {
      connected: 'Connected',
      connecting: 'Connecting',
      error: 'Error',
      disconnected: 'Disconnected'
    },
    tunnelsUp: '{{count}} tunnels up',
    noActiveProfile: 'No active profile',
    disconnect: 'Disconnect',
    connect: 'Connect',
    edit: 'Edit',
    disconnectedToast: 'Disconnected',
    connectedToast: 'Connected',
    openedExternalToast: 'Opened in system VPN app',
    connectFailed: 'Connect failed',
    removedToast: 'Removed',
    noToolsTitle: 'No VPN tools detected',
    noToolsDesc:
      'Install OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app, or wireguard-tools.',
    profilesTitle: 'VPN profiles',
    addToStart: 'Add a config to get started',
    filteredCount: '{{filtered}} of {{total}}',
    searchPlaceholder: 'Search profiles…',
    addFile: 'Add file',
    paste: 'Paste',
    refresh: 'Refresh',
    emptyDesc: 'Drop in an .ovpn or WireGuard .conf',
    chooseFile: 'Choose file',
    noMatch: 'No profiles match “{{query}}”',
    live: 'Live',
    usernameNotSet: 'Username not set',
    noServerSet: 'No server set',
    moreActions: 'More actions',
    menu: {
      editProfile: 'Edit profile',
      revealFile: 'Reveal file',
      openExternally: 'Open externally',
      delete: 'Delete'
    },
    draft: {
      editTitle: 'Edit VPN profile',
      reviewTitle: 'Review VPN profile',
      correctFields: 'Correct auto-detected fields',
      correctFieldsDesc:
        'Username / organization / server are parsed from the .ovpn and are often wrong — edit them before saving.',
      name: 'Name',
      provider: 'Provider',
      username: 'Username',
      usernameRequired: 'Enter VPN username',
      organization: 'Organization',
      organizationPlaceholder: 'Organization name',
      serverName: 'Server name',
      serverHost: 'Server host',
      protocol: 'Protocol',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: 'Save changes',
      saveProfile: 'Save profile',
      updated: 'Profile updated',
      updateFailed: 'Update failed',
      missingConfig: 'Missing config',
      added: 'VPN profile added',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: 'Auto-detect'
      }
    },
    auth: {
      title: 'Connect · {{name}}',
      pinMfaOnly: 'PIN + MFA only',
      pinMfaDesc: 'Username / server / organization come from the profile. Use Edit if they are wrong.',
      user: 'User:',
      server: 'Server:',
      organization: 'Organization:',
      notSetEdit: 'not set — edit profile',
      setUsernameFirst: 'Set username via Edit first, or enter it below',
      pin: 'PIN',
      pinRequired: 'Enter your PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP code',
      mfaRequired: 'Enter your MFA/OTP code',
      mfaPlaceholder: '6-digit code',
      editFields: 'Edit profile fields'
    },
    pasteModal: {
      title: 'Paste VPN config',
      namePlaceholder: 'Office VPN',
      config: 'Config',
      configPlaceholder: 'Paste .ovpn or WireGuard config',
      continue: 'Continue — review fields'
    },
    panel: {
      connectionStatus: 'Connection status',
      healthyTunnel: 'Healthy tunnel',
      verifying: 'Connected — verifying',
      connecting: 'Connecting…',
      error: 'Error',
      disconnected: 'Disconnected',
      tunnel: 'VPN tunnel',
      opening: 'opening…',
      server: 'VPN server',
      privateNetwork: 'Private network',
      clusterEndpoints: 'cluster endpoints',
      local: 'local',
      download: 'Download',
      upload: 'Upload',
      total: 'Total {{size}}',
      checkProcess: 'VPN process running',
      checkInterface: 'Tunnel interface with IP',
      checkTraffic: 'Traffic flowing',
      falsePositive:
        'Marked connected but no tunnel IP yet — private clusters will time out until the route is up.',
      providerLine: 'Provider: {{provider}}',
      connectedAgo: 'Connected {{uptime}} ago',
      connectionFailed: 'Connection failed'
    },
    session: {
      titleForCluster: 'VPN for {{cluster}}',
      titleConnect: 'Connect VPN · {{name}}',
      alertTitle: 'VPN session',
      pinKnownDesc:
        'PIN is remembered for ~5 hours. Enter a fresh MFA code to bring this tunnel up. Once connected, switching clusters will not ask again while the tunnel stays up.',
      pinUnknownDesc:
        'Authenticate once per VPN. Magiclens keeps both tunnels up (like Pritunl), so cluster switching needs no re-login for ~5 hours.',
      profile: 'Profile:',
      user: 'User:',
      pin: 'PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6-digit code',
      connectContinue: 'Connect & continue'
    },
    badge: {
      missing: 'VPN missing',
      missingTooltip: 'Linked VPN profile not found — reassign in Edit Cluster',
      connected: 'VPN connected · {{name}}',
      connecting: 'VPN connecting · {{name}}',
      autoConnect: 'Auto-connect · {{name}}'
    },
    clusterLink: {
      title: 'VPN profile (auto-connect)',
      placeholder: 'No VPN — connect manually',
      empty: 'Add a VPN profile in the VPN page first',
      hint: 'When you switch to this cluster tab, MagicLens connects this VPN automatically. PIN and MFA are remembered per VPN profile for the day after the first successful connect.'
    }
  }
} as const

/** Same shape as English, with string leaves (any language). */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type TranslationResources = DeepStringify<typeof en>