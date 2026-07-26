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
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'All namespaces',
    selectNamespaces: 'Select namespaces',
    namespacesSelected: '{{count}} namespaces',
    total: 'total',
    clusters: 'Clusters',
    vpn: 'VPN',
    favorites: 'Favorites',
    cancel: 'Cancel'
  },
  chrome: {
    searchPlaceholder: 'Search clusters, resources, namespaces…',
    manageClusters: 'Manage clusters',
    clustersMeta: '{{total}} total · {{connected}} connected',
    vpnTooltip: 'VPN profiles (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Connected · {{name}}',
    vpnConnecting: 'Connecting · {{name}}',
    searchFavorites: 'Search favorites',
    favoritesHint: 'Pinned clusters',
    searchWorkspaces: 'Search workspaces…',
    noFavoriteClusters: 'No favorite clusters',
    noWorkspaceMatch: 'No workspaces match',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Preferences for MagicLens',
    navGroups: {
      preferences: 'Preferences',
      system: 'System'
    },
    sections: {
      general: 'General',
      updates: 'Updates',
      display: 'Display',
      vpnExtensions: 'VPN Extensions',
      keyboard: 'Keyboard',
      appearance: 'Appearance',
      developer: 'Developer',
      about: 'About'
    },
    sectionHints: {
      general: 'Language, refresh cadence, kubeconfig scan path, and cluster housekeeping.',
      updates: 'Control how MagicLens checks for and installs updates.',
      display: 'Where details open, where Terminal/YAML docks, and what the sidebar shows.',
      vpnExtensions: 'Install or repair OpenVPN and WireGuard helpers used by VPN profiles.',
      keyboard: 'Customize global shortcuts. Conflicting bindings swap automatically.',
      appearance: 'Light/dark mode and color themes for the whole app.',
      developer: 'Host specs and live process usage for debugging.',
      about: 'Version and runtime information for this MagicLens build.'
    },
    language: {
      title: 'Language',
      hint: 'Choose the app language. Ant Design controls and dates follow this setting.'
    },
    general: {
      refreshTitle: 'Resource refresh interval',
      refreshHint:
        'How often resource lists and metrics refresh automatically. Applies to every open cluster tab; pausing live refresh is still available per resource view.',
      kubeconfigPathTitle: 'Local kubeconfig path',
      kubeconfigPathHint:
        'MagicLens auto-scans only this file or folder when you open Add Cluster. Leave empty to use ~/.kube.',
      kubeconfigPathPlaceholder: '~/.kube (default)',
      kubeconfigPickFile: 'Pick file',
      kubeconfigPickFolder: 'Pick folder',
      kubeconfigReset: 'Use ~/.kube',
      dedupeTitle: 'Duplicate clusters',
      dedupeHint:
        'Collapse clusters that share the same name/context, API server, and credentials into one entry. Favorites and settings from the best match are kept.',
      dedupe: 'Merge duplicates',
      dedupeConfirmTitle: 'Merge duplicate clusters?',
      dedupeConfirmBody:
        'Clusters with the same name/context, API server, and credentials will be collapsed into one entry. Favorites and settings from the best match are kept.',
      dedupeConfirmOk: 'Merge duplicates',
      dedupeNone: 'No duplicate clusters found.',
      dedupeDone: 'Merged {{groups}} group(s), removed {{removed}} duplicate(s). {{kept}} cluster(s) remain.'
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
      detailMaskBlur: 'Blur background behind details',
      detailMaskBlurHint:
        'When a resource detail drawer is open, blur the list behind it. Off by default so the table stays sharp.',
      panelTitle: 'Terminal & YAML panel',
      panelHint:
        'Dock the Terminal and Edit YAML panel to the bottom, right, or left of the workspace. You can also switch from the panel toolbar icons.',
      panelPlacementBottom: 'Bottom',
      panelPlacementRight: 'Right',
      panelPlacementLeft: 'Left',
      nodesTitle: 'Nodes page layout',
      nodesHint:
        'Toggle sections on or off and drag to reorder. The table section stays flexible and fills remaining space when visible.',
      nodesChooser: 'Choose which sections appear on the Nodes page and drag to reorder them.',
      sidebarTitle: 'Sidebar',
      showFavorites: 'Show Favorites section',
      showFavoritesHint:
        'When enabled, Favorites appear above Workspaces in the left sidebar. Click the Favorites header to collapse or expand it.',
      showWorkspaces: 'Show Workspaces section',
      showWorkspacesHint:
        'When enabled, Workspaces appear in the left sidebar for grouping clusters. Collapsed sidebar shows a W marker above workspace clusters.',
      showClusterNamespace: 'Show connected namespace',
      showClusterNamespaceHint:
        'When enabled, the selected namespace is shown as a chip on connected clusters in the left sidebar.',
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
      globalTitle: 'App shortcuts',
      reset: 'Reset defaults',
      pressKeys: 'Press keys…',
      recordError: 'Use a shortcut with ⌘/Ctrl (or Alt), or press Esc to cancel',
      changeAria: 'Change shortcut for {{label}}',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        'Assign a shortcut to open a workspace (expands it and opens its clusters). You can also set this when editing a workspace.',
      workspacesEmpty: 'Create a workspace in the sidebar to assign a shortcut.',
      workspaceOpenDesc: 'Open workspace · {{count}} clusters',
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
        'Pick a preset or choose your own accent color. Sidebar, resource menu, and panels all follow the active theme.',
      modeTitle: 'Color mode',
      modeHint: 'Switch between light, dark, or follow the system appearance.',
      groupClassic: 'Classic',
      groupWorlds: 'Worlds — anime & heroes',
      customAccent: 'Custom accent',
      customAccentHint: 'Applies to sidebars, buttons, highlights, and chart accents.',
      customSwatch: 'Your own accent color'
    },
    developer: {
      hostTitle: 'Computer specs',
      hostHint: 'Hardware and OS details for this machine (loaded once when you open this section).',
      hostHostname: 'Hostname',
      hostOs: 'Operating system',
      hostCpu: 'CPU',
      hostCores: '{{count}} cores',
      hostCpuSpeed: '{{mhz}} MHz',
      hostMemory: 'Memory',
      hostMemoryValue: '{{free}} free / {{total}}',
      hostDisplay: 'Primary display',
      hostDisplayValue: '{{width}}×{{height}} @ {{scale}}×',
      hostRuntime: 'Runtime',
      hostApiMissing:
        'Host info API is unavailable. Restart MagicLens to load the new developer tools.',
      liveTitle: 'Live app usage',
      liveHint:
        'Continuously reads MagicLens CPU and memory (main, GPU, renderer, utilities). Values refresh on the interval below.',
      pollLabel: 'Refresh every',
      cpuTotal: 'CPU (all processes)',
      memTotal: 'Memory (working set)',
      mainHeap: 'Main V8 heap',
      heapOf: 'of {{total}} allocated',
      systemMem: 'System memory',
      systemMemValue: '{{free}} free / {{total}}',
      processes: '{{count}} processes',
      noSamples: 'Waiting for first sample…',
      sampleFailed: 'Could not read process metrics.',
      apiMissing: 'Process metrics API is unavailable. Restart MagicLens to load the new developer tools.',
      colType: 'Type',
      colName: 'Name',
      colCpu: 'CPU',
      colMem: 'Memory',
      controlsTitle: 'Performance controls',
      controlsHint: 'Tune live resource refresh and reclaim renderer caches when memory climbs.',
      liveRefresh: 'Live resource refresh',
      pauseRefresh: 'Pause refresh',
      resumeRefresh: 'Resume refresh',
      clearCache: 'Clear renderer cache',
      cacheCleared: 'Renderer cache cleared',
      openDevTools: 'Open DevTools'
    },
    about: {
      platform: 'Platform',
      appTitle: 'MagicLens',
      appHint: 'Desktop Kubernetes client — version and runtime details for this install.'
    },
    vpnExtensions: {
      intro:
        'Install and verify the VPN CLI tools MagicLens needs for PIN + MFA tunnels. OpenVPN Connect is not supported.',
      platformLabel: 'Detected platform: {{platform}}',
      platformHint: {
        darwin:
          'macOS uses Homebrew for OpenVPN / WireGuard CLI. Tunnelblick and WireGuard.app are optional fallbacks.',
        win32:
          'Windows installs the OpenVPN Community CLI and WireGuard via winget (Chocolatey/Scoop as fallback). Do not use OpenVPN Connect.',
        linux:
          'Linux prefers distro packages (apt/dnf/pacman/zypper). If those fail, MagicLens falls back to Homebrew.',
        other: 'Automatic install may be limited on this platform. Use the manual commands below.'
      },
      statusTitle: 'Detected tools',
      ready: 'ready',
      missing: 'missing',
      rescan: 'Rescan tools',
      installTitle: 'Install with MagicLens',
      installHint:
        'You may be asked for your password / UAC approval. Installation can take several minutes.',
      installOpenVpn: 'Install OpenVPN CLI',
      installWireGuard: 'Install WireGuard',
      installSuccess: '{{tool}} installed successfully',
      installFailed: 'Install failed',
      packagesTitle: 'Packages / commands',
      packagesHint: 'Copy these commands to install manually in a terminal.',
      copyCmd: 'Copy',
      copied: 'Copied to clipboard',
      copyFailed: 'Copy failed',
      manualTitle: 'Manual setup steps',
      manual: {
        darwin: [
          'Install Homebrew from https://brew.sh if you do not already have it.',
          'Run: brew install openvpn',
          'Optional: brew install wireguard-tools',
          'Optional GUI: brew install --cask tunnelblick (OpenVPN) or WireGuard.app',
          'Quit and reopen MagicLens, then connect again with PIN + MFA.'
        ],
        win32: [
          'Open PowerShell or Terminal.',
          'Install Community OpenVPN (not Connect): winget install -e --id OpenVPNTechnologies.OpenVPN',
          'Install WireGuard: winget install -e --id WireGuard.WireGuard',
          'Alternatives: choco install openvpn -y  /  choco install wireguard -y',
          'Restart MagicLens so it can find openvpn.exe under Program Files\\OpenVPN\\bin.'
        ],
        linux: [
          'Debian/Ubuntu: sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL: sudo dnf install -y openvpn wireguard-tools',
          'Arch: sudo pacman -Sy openvpn wireguard-tools',
          'Or install Homebrew and run: brew install openvpn wireguard-tools',
          'Restart MagicLens, then connect with PIN + MFA.'
        ],
        other: [
          'Install the OpenVPN community CLI for your OS.',
          'Install WireGuard tools (wg-quick) if you use WireGuard profiles.',
          'Restart MagicLens and retry the connection.'
        ]
      },
      connectNote:
        'After tools are ready, return to the VPN page and connect. MagicLens can also auto-install on connect when tools are missing.'
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
      'MagicLens needs the OpenVPN Community CLI (or WireGuard tools) for PIN + MFA. Open Settings → VPN Extensions to install packages, or follow the manual steps. OpenVPN Connect is not supported.',
    openVpnExtensions: 'VPN Extensions',
    connectHelpTitle: 'Could not connect',
    connectHelpDesc:
      'If tools are missing or install failed, open VPN Extensions to install OpenVPN / WireGuard and see manual steps for your OS.',
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
  },
  tour: {
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    getStarted: 'Get started',
    continue: 'Continue',
    chooseLanguage: 'Choose your language',
    languageHint: 'You can change this anytime in Settings. Feature tips will follow your selection.',
    slidesAria: 'Feature slides',
    slides: {
      welcome: {
        eyebrow: 'Welcome',
        title: 'MagicLens for Kubernetes',
        body: 'A fast desktop client to manage clusters, resources, VPN tunnels, logs, and terminals in one place — offline-first on your machine.'
      },
      clusters: {
        eyebrow: 'Clusters',
        title: 'Multi-cluster, one workspace',
        body: 'Import kubeconfigs, pin favorites, and switch tabs instantly across every cluster you work with.'
      },
      split: {
        eyebrow: 'Split view',
        title: 'Compare two clusters at once',
        body: 'Open split view to keep two cluster tabs side by side — perfect for staging vs production or checking the same resource across environments.'
      },
      search: {
        eyebrow: 'Search',
        title: 'Find anything fast',
        body: 'Global search jumps to clusters, namespaces, and resources in one shortcut (⌘K / Ctrl+K by default — change it anytime in Settings → Keyboard).'
      },
      resources: {
        eyebrow: 'Explorer',
        title: 'Browse every resource',
        body: 'Workloads, Config, Network, Storage, and more — live watch, YAML edit, batch actions, and a focused detail panel.'
      },
      topology: {
        eyebrow: 'Topology',
        title: 'See how apps connect',
        body: 'Map Deployments, Services, and Ingress in one graph — spot unhealthy pods, open details, and jump from applications to the live dependency map.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Private clusters, your tunnels',
        body: 'Upload OpenVPN / Pritunl / WireGuard profiles, link them to clusters, and keep multiple tunnels up while you switch tabs.'
      },
      ops: {
        eyebrow: 'Day-to-day',
        title: 'Logs, exec & terminals',
        body: 'Tail and download pod logs, exec into containers, open local terminals, and keep everything handy in the bottom panel.'
      },
      forward: {
        eyebrow: 'Access',
        title: 'Port forwarding made simple',
        body: 'Forward a Pod or Service to a local port in a couple of clicks — MagicLens keeps the session visible while you work.'
      }
    }
  },

  workspaces: {
    title: 'Workspaces',
    sectionHint: 'Grouped clusters',
    compactMark: 'W',
    compactTooltip: 'Workspaces',
    new: 'New workspace',
    newTooltip: 'New workspace',
    edit: 'Edit workspace',
    delete: 'Delete workspace',
    empty: 'Group clusters into workspaces',
    noClusters: 'No clusters yet — edit workspace to add some.',
    defaultName: 'Workspace',
    name: 'Name',
    logo: 'Logo',
    changeLogo: 'Change logo',
    removeLogo: 'Remove',
    clusters: 'Clusters',
    selectClusters: 'Select clusters for this workspace',
    shortcut: 'Keyboard shortcut',
    shortcutHint: 'Opens this workspace and its clusters. Use ⌘/Ctrl (or Alt) with a key.',
    shortcutAssign: 'Assign shortcut',
    shortcutListening: 'Press keys…',
    shortcutClear: 'Clear',
    shortcutNone: 'None',
    shortcutRecordError: 'Use a shortcut with ⌘/Ctrl (or Alt), or press Esc to cancel',
    save: 'Save',
    created: 'Workspace created',
    updated: 'Workspace updated'
  },
  resourceNav: {
    search: 'Search resources',
    favorites: 'Favorites',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    pin: 'Pin to tabs',
    unpin: 'Unpin from tabs',
    pinned: 'Pinned to tabs',
    emptyFavorites: 'Right-click a resource to add favorites.',
    aria: 'Resources',
    sections: {
      overview: 'Overview',
      workloads: 'Workloads',
      config: 'Config',
      network: 'Network',
      storage: 'Storage',
      helm: 'Helm',
      'access-control': 'Access Control',
      'custom-resources': 'Custom Resources'
    },
    virtual: {
      clusterOverview: 'Cluster',
      applications: 'Applications',
      workloadsOverview: 'Overview',
      configOverview: 'Overview',
      topology: 'Topology',
      portForwarding: 'Port Forwarding',
      helmCharts: 'Charts',
      helmReleases: 'Releases',
      operatorResources: 'Installed CRDs',
      dynamicCustomResources: 'Dynamic Resources',
      definitions: 'Definitions'
    }
  },
  nodesOverview: {
    tableTitle: 'Nodes',
    tableCount: '{{count}} total',
    emptyTitle: 'No nodes found',
    emptyHint: 'This cluster has no registered nodes, or your search filter excluded all results.',
    hiddenTitle: 'Nodes dashboard hidden',
    hiddenHint: 'Enable sections in Settings → Display → Nodes page layout.',
    hotspots: 'Hotspots',
    hotspotsCount: '{{count}} insights',
    topConsumers: 'Top consumers'
  },
  metricsCharts: {
    networkReceive: 'Network receive',
    networkTransmit: 'Network transmit',
    containerDisk: 'Container disk usage',
    restarts: 'Restart count',
    nodeDisks: 'Node disks',
    nodeDisksUnavailable:
      'No node filesystem metrics (needs Prometheus + node-exporter with node_filesystem_*).',
    podVolumes: 'Persistent volumes',
    podVolumesUnavailable:
      'No PVC usage metrics (needs Prometheus kubelet volume stats + kube-state-metrics).',
    filesystemPercent: 'Disk fullness over time',
    filesystemUsed: 'Disk used over time',
    volumePercent: 'Volume fullness over time',
    volumeUsed: 'Volume used over time'
  },
  clusterOverview: {
    title: 'Cluster overview',
    subtitle: 'Health, capacity, and recent activity across the cluster.',
    metricsUnavailable: 'metrics-server unavailable — usage data may be incomplete',
    nodes: 'Nodes',
    nodesHint: '{{ready}} ready · {{notReady}} not ready',
    pods: 'Pods',
    podsHint: '{{running}} running · {{pending}} pending · {{failed}} failed',
    namespaces: 'Namespaces',
    deployments: 'Deployments',
    services: 'Services',
    problemPods: 'Problem pods',
    resources: 'Resource usage',
    cpuCapacity: 'CPU capacity',
    memCapacity: 'Memory capacity',
    cpuAlloc: 'CPU allocatable',
    memAlloc: 'Memory allocatable',
    recentEvents: 'Recent events'
  },
  workloadsOverview: {
    title: 'Workloads overview',
    subtitle: 'Counts, health, and problem workloads across namespaces.',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    byNamespace: 'By namespace',
    empty: 'No workloads found',
    problems: 'Problem workloads',
    noProblems: 'No unhealthy workloads detected',
    highRestarts: 'High restart pods',
    noRestarts: 'No pods with high restart counts',
    restarts: '{{count}} restarts'
  },
  applicationsOverview: {
    title: 'Applications',
    subtitle: 'Apps grouped from workload labels in the selected namespace.',
    pickNamespace: 'Namespace',
    search: 'Search apps…',
    needNamespace: 'Pick a namespace',
    needNamespaceHint: 'Application grouping needs a namespace context.',
    error: 'Failed to load applications',
    total: 'Apps',
    apps: 'Applications',
    empty: 'No applications in this namespace',
    replicas: 'Replicas',
    errors: 'Errors',
    resources: 'Resources'
  },
  configOverview: {
    title: 'Config overview',
    subtitle: 'ConfigMaps, Secrets, quotas, autoscaling, and admission webhooks.',
    highlights: 'Highlights',
    configMaps: 'ConfigMaps',
    secrets: 'Secrets',
    tlsSecrets: 'TLS secrets',
    hpas: 'HPAs',
    pdbs: 'PDBs',
    webhooks: 'Webhooks',
    quotas: 'Resource quotas',
    noQuotas: 'No resource quotas',
    quotaWarnings: '{{count}} quotas look constrained',
    hpaList: 'Horizontal Pod Autoscalers',
    noHpas: 'No HPAs defined'
  },
  topology: {
    title: 'Topology & Applications',
    subtitle: 'Live map of workloads, services, and dependencies in this namespace.',
    modes: {
      graph: 'Topology',
      apps: 'Applications',
      resources: 'Resources'
    },
    refresh: 'Refresh',
    empty: 'No resources to map in this namespace.',
    loading: 'Building topology…',
    error: 'Failed to load topology',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitView: 'Fit to view',
    openWindow: 'Open in window',
    openWindowMissingCluster: 'No cluster selected for topology window',
    pickNamespace: 'Select a namespace to build the topology map',
    pickNamespaceHint: 'Topology needs a single namespace. Choose one from the namespace selector above.',
    graphCrash: 'The graph failed to render. Try refreshing or picking another namespace.',
    live: 'Live',
    updating: 'Updating…',
    search: 'Search resources…',
    filterNamespace: 'Namespace',
    filterKind: 'Kind',
    filterHealth: 'Health',
    filterAll: 'All',
    sortName: 'Name',
    sortKind: 'Kind',
    sortHealth: 'Health',
    insights: 'Insights',
    noInsights: 'No issues detected.',
    health: {
      healthy: 'Healthy',
      degraded: 'Degraded',
      error: 'Error',
      unknown: 'Unknown'
    },
    relation: {
      owns: 'owns',
      selects: 'selects',
      routes: 'routes',
      mounts: 'mounts',
      dependsOn: 'depends on'
    },
    apps: {
      replicas: 'Replicas',
      uptime: 'Age',
      errors: 'Errors',
      search: 'Search applications…',
      noMatch: 'No applications match your search.',
      empty: 'No applications found. Label workloads with app.kubernetes.io/name.'
    },
    drawer: {
      overview: 'Overview',
      yaml: 'YAML',
      events: 'Events',
      logs: 'Logs',
      metrics: 'Metrics',
      actions: 'Actions',
      restart: 'Restart',
      scale: 'Scale',
      delete: 'Delete',
      editYaml: 'Edit YAML',
      close: 'Close'
    },
    edge: {
      ports: 'Ports',
      protocol: 'Protocol',
      rate: '{{rate}} req/s'
    },
    insightItems: {
      crashloopTitle: 'CrashLoopBackOff: {{name}}',
      crashloopDetail: 'Pod is crash looping',
      serviceEmptyTitle: 'Service has no endpoints: {{name}}',
      serviceEmptyDetail: 'Selector does not match any pods in this namespace.',
      ingressOrphanTitle: 'Ingress has no backends: {{name}}',
      ingressOrphanDetail: 'No HTTP paths or default backend configured.',
      brokenRouteTitle: 'Broken Ingress dependency',
      brokenRouteDetail: 'Route points to missing service ({{target}}).',
      zeroReadyTitle: 'No ready replicas: {{name}}',
      zeroReadyDetail: '{{ready}}/{{desired}} ready'
    }
  },
  clustersHub: {
    title: 'Clusters',
    subtitle: 'Add, connect, and manage all Kubernetes clusters from one place.',
    add: 'Add cluster',
    addFirst: 'Add your first cluster',
    statTotal: 'Total',
    statConnected: 'Connected',
    statFavorites: 'Favorites',
    statIssues: 'Needs attention',
    searchPlaceholder: 'Search by name, context, endpoint, namespace, version…',
    empty: 'No clusters yet. Add your first cluster to get started.',
    noMatch: 'No clusters match your search or filter.',
    filters: {
      all: 'All',
      favorites: 'Favorites',
      connected: 'Connected',
      disconnected: 'Disconnected',
      error: 'Error',
      recent: 'Recently opened'
    }
  },
  addCluster: {
    title: 'Add Cluster',
    detected: 'Detected on this machine',
    rescan: 'Rescan',
    scanPath: 'Scanning: {{path}}',
    mergeExisting: 'Merge duplicates in list',
    mergeNone: 'No duplicates in your cluster list.',
    mergeDone: 'Merged {{groups}} group(s), removed {{removed}}.',
    modeFile: 'Pick kubeconfig file',
    modePaste: 'Paste kubeconfig YAML',
    modeFolder: 'Scan a folder',
    chooseFile: 'Choose file...',
    chooseFolder: 'Choose folder to scan...',
    pastePlaceholder: 'Paste kubeconfig YAML here',
    parse: 'Parse',
    uniqueContexts: '{{count}} unique context(s)',
    mergedHint: '({{count}} merged from duplicate configs)',
    alreadyInList: '{{count}} already in your cluster list',
    selectAllNew: 'Select all new',
    tagMerged: 'Merged',
    tagAlready: 'Already added',
    matches: 'matches "{{name}}"',
    dupSkip: 'Skip (already exists)',
    dupRename: 'Add with new name',
    newNamePlaceholder: 'New display name',
    noneToAdd: 'Nothing to add — duplicates are set to skip, or nothing is selected.',
    skipped: '{{count}} cluster(s) skipped — already in your list.',
    added: 'Added {{count}} cluster(s).',
    addCount: 'Add {{count}} cluster(s)',
    allAlready: 'All detected contexts are already in your cluster list. Choose “Add with new name” to keep a second copy.'
  },
  clusterActions: {
    open: 'Open',
    disconnect: 'Disconnect',
    removeFavorite: 'Remove from favorites',
    addFavorite: 'Add to favorites',
    removeCluster: 'Remove cluster',
    edit: 'Edit',
    testConnection: 'Test connection',
    openDashboard: 'Open dashboard',
    removeConfirm: 'Remove this cluster?',
    namespacesCount: '{{count}} namespaces',
    lastOpened: 'Last opened',
    splitScreen: 'Split screen',
    exitSplit: 'Exit split view'
  },
  clusterSettings: {
    nav: {
      appearance: 'Appearance',
      general: 'General',
      proxy: 'Proxy',
      terminal: 'Terminal',
      namespaces: 'Namespaces',
      metrics: 'Metrics',
      lensMetrics: 'Lens Metrics',
      nodeShell: 'Node Shell',
      security: 'Security',
      network: 'Network',
      storage: 'Storage',
      integrations: 'Integrations',
      performance: 'Performance',
      ui: 'UI / UX',
      debug: 'Debug / Advanced'
    },
    general: {
      infoTitle: 'Cluster identity',
      infoHint: 'Read-only connection details from the active kubeconfig context.',
      context: 'Kubeconfig context',
      endpoint: 'API server',
      version: 'Kubernetes version',
      clusterId: 'Cluster ID',
      status: 'Connection status',
      lastOpened: 'Last opened',
      metaTitle: 'Tags & environment',
      environment: 'Environment',
      environmentHint: 'dev / staging / prod label for this cluster.',
      tags: 'Tags',
      tagsHint: 'Press Enter to add tags.',
      tagsPlaceholder: 'prod, eu-west…',
      notes: 'Notes'
    },
    proxy: {
      title: 'HTTP / HTTPS proxy',
      hint: 'Optional outbound proxy for API traffic. VPN profile linking is below.',
      noProxyHint: 'Comma-separated hosts that bypass the proxy.',
      username: 'Username',
      password: 'Password',
      failover: 'Failover support',
      failoverHint: 'Try alternate endpoints when the primary proxy fails.'
    },
    terminal: {
      title: 'Terminal defaults',
      hint: 'Applied when opening a local terminal for this cluster.',
      shell: 'Default shell',
      cwd: 'Working directory',
      cwdCustom: 'Custom path',
      cwdPath: 'Custom directory',
      defaultNs: 'Default namespace',
      syncContext: 'Sync kubectl context',
      syncContextHint: 'Set KUBECONFIG / context when the terminal opens.',
      history: 'Keep command history',
      autoComplete: 'Auto-complete',
      rbac: 'RBAC validation hints',
      multiTab: 'Multi-tab support',
      env: 'Extra environment variables',
      envHint: 'One KEY=value per line.'
    },
    namespaces: {
      title: 'Namespaces',
      hint: 'Defaults and filters for the namespace selector.',
      accessible: 'Accessible namespaces',
      default: 'Default namespace',
      pinned: 'Pinned namespaces',
      pinnedHint: 'Always shown near the top of the selector.',
      rbacFilter: 'RBAC-based filtering',
      labelGrouping: 'Label-based grouping'
    },
    metrics: {
      title: 'Metrics source',
      hint: 'Prometheus endpoint and scrape behavior for this cluster.',
      source: 'Source',
      sourceAuto: 'Auto-detect',
      sourceCustom: 'Custom',
      endpoint: 'Endpoint URL',
      scrape: 'Scrape interval (s)',
      timeout: 'Query timeout (s)',
      auth: 'Authentication',
      authNone: 'None',
      pathPrefix: 'Path prefix',
      hideUnused: 'Hide unused metrics',
      testQuery: 'Test / rediscover'
    },
    lensMetrics: {
      title: 'Lens Metrics stack',
      hint: 'Optional in-cluster Prometheus / exporters (install support coming).',
      enabled: 'Enable Lens Metrics',
      autoInstall: 'Auto-install on connect',
      autoUpgrade: 'Auto-upgrade'
    },
    nodeShell: {
      title: 'Node shell debug pod',
      hint: 'Privileged pod used for host shell on a node (nsenter).',
      image: 'Shell image',
      imageHint: 'Default is {{default}}. Change if your nodes need a private or custom image.',
      resetDefault: 'Default',
      pullPolicy: 'Image pull policy',
      pullSecret: 'Image pull secret',
      cpuLimit: 'CPU limit',
      memoryLimit: 'Memory limit',
      privileged: 'Privileged',
      runAsRoot: 'Run as root',
      nodeSelector: 'Node selector',
      nodeSelectorHint: 'key=value pairs or JSON object.',
      tolerations: 'Tolerations (JSON)',
      tolerationsHint: 'JSON array of tolerations. Default Exists matches all taints.',
      cleanupTtl: 'Cleanup TTL (seconds)'
    },
    security: {
      title: 'Security',
      hint: 'Access and kubeconfig handling preferences.',
      rbacViewer: 'Show RBAC roles / permissions',
      encrypt: 'Encrypt kubeconfig at rest',
      encryptHint: 'Uses OS keychain / safeStorage when available.',
      audit: 'Client-side audit log'
    },
    network: {
      title: 'Network',
      hint: 'Informational cluster networking fields.',
      domain: 'Cluster domain',
      serviceCidr: 'Service CIDR',
      podCidr: 'Pod CIDR',
      dnsNotes: 'DNS notes'
    },
    storage: {
      title: 'Storage',
      hint: 'Defaults related to persistent volumes.',
      defaultClass: 'Default storage class',
      snapshots: 'Volume snapshot support',
      csi: 'Show CSI drivers'
    },
    integrations: {
      title: 'Integrations',
      hint: 'External observability endpoints for this cluster.'
    },
    performance: {
      title: 'Performance',
      hint: 'Client-side rate limits and refresh behavior.',
      rateLimit: 'API request rate limit',
      cache: 'Enable response cache',
      refresh: 'UI refresh interval (s)',
      concurrency: 'Concurrency limit'
    },
    ui: {
      title: 'UI / UX',
      hint: 'Per-cluster display preferences.',
      density: 'Table density',
      comfortable: 'Comfortable',
      compact: 'Compact',
      defaultView: 'Default resource view',
      favoritesFirst: 'Favorites first'
    },
    debug: {
      title: 'Debug / Advanced',
      hint: 'Diagnostics and experimental flags.',
      kubectlProxy: 'kubectl proxy toggle',
      apiInspector: 'API request inspector',
      clientLogs: 'Verbose client logs',
      experimental: 'Experimental settings',
      featureFlags: 'Feature flags'
    }
  },
  clusterEdit: {
    title: 'Edit Cluster',
    displayName: 'Display name',
    displayNamePlaceholder: 'My cluster',
    changeLogo: 'Change logo',
    removeLogo: 'Remove logo',
    prometheus: 'Prometheus URL',
    prometheusHint: 'Optional. Used for metrics when auto-discovery is unavailable.',
    prometheusPlaceholder: 'https://prometheus.example.com',
    prometheusUnknown: 'Unknown',
    prometheusConnected: 'Connected ({{method}})',
    prometheusNotFound: 'Not found',
    prometheusConnectHint: 'Connect to this cluster to test Prometheus discovery.',
    kubeconfig: 'Kubeconfig',
    kubeconfigHint: 'View, copy, or edit the kubeconfig used for this cluster.',
    kubeconfigCopied: 'Kubeconfig copied to clipboard',
    kubeconfigScopedFile: 'Scoped (from file)',
    kubeconfigScopedInline: 'Scoped (inline)',
    view: 'View',
    copy: 'Copy',
    editYaml: 'Edit',
    saveKubeconfig: 'Save kubeconfig',
    noKubeconfigChanges: 'No changes to save',
    kubeconfigSaved: 'Kubeconfig saved for this cluster',
    reconnectHint: 'Reconnect the cluster to apply kubeconfig changes',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close'
  },
  clusterBg: {
    title: 'Workspace background',
    hint: 'Shown when this cluster tab is open. Pick a default landscape or upload PNG / JPG.',
    remove: 'Remove',
    upload: 'Upload PNG / JPG',
    panelTransparency: 'Panel transparency',
    solidPct: '{{opacity}}% solid',
    clear: 'Clear',
    default: 'Default',
    solid: 'Solid',
    panelHint: 'Controls how see-through resource menus, tables (Pods, Deployments, …), and headers are over the wallpaper.'
  },
  clusterView: {
    disconnectedTitle: 'Cluster disconnected',
    disconnectedBody: 'Connect to load namespaces and resources for this cluster.',
    connect: 'Connect',
    connectingVpn: 'Connecting VPN…',
    connecting: 'Connecting…'
  },
  clusterAdd: {
    title: 'Add Cluster',
    pickFile: 'Pick kubeconfig file',
    pasteYaml: 'Paste YAML',
    scan: 'Scan',
    rescan: 'Rescan',
    selectAllNew: 'Select all new',
    alreadyAdded: 'Already added',
    addN: 'Add {{count}} cluster',
    addN_plural: 'Add {{count}} clusters',
    noContexts: 'No contexts found in this kubeconfig.',
    duplicate: 'Already in your list'
  },
  auth: {
    signInTitle: 'Sign in to MagicLens',
    signInBody: 'Use your organization email and password. Admins open Admin Console; members open their profile. You can also continue offline with local kubeconfigs only.',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    passwordPlaceholder: 'Password',
    apiBase: 'API base URL',
    apiBasePlaceholder: 'http://localhost:3000',
    signIn: 'Sign in',
    apiSettings: 'API settings',
    hideApiSettings: 'Hide API settings',
    continueOffline: 'Continue offline',
    syncedToast: 'Synced {{kubeconfigs}} cluster context(s) and {{vpn}} VPN profile(s)',
    syncFailedToast: 'Signed in, but sync failed: {{error}}'
  },
  search: {
    placeholder: 'Search clusters, pods…',
    searching: 'Searching…',
    noResults: 'No results',
    connectHint: 'Connect a cluster to search resources across namespaces.',
    typeHint:
      'Type to search. Use keywords like pod:nginx, @deploy api, or click a type filter above.',
    searchingIn: 'Searching resources in: {{cluster}}',
    recent: 'Recent',
    clusters: 'Clusters',
    resources: 'Resources',
    hint: '↑↓ navigate · Enter open · Esc close'
  },
  onboarding: {
    title: 'Resources assigned to you',
    body: 'Choose which org kubeconfigs and VPN profiles to sync to this device.',
    syncSelected: 'Sync selected to this device',
    notNow: 'Not now',
    kubeconfigs: 'Kubeconfigs',
    vpnProfiles: 'VPN profiles',
    empty: 'No assignments yet'
  },
  profile: {
    title: 'Profile',
    assignedClusters: 'Assigned clusters',
    assignedVpn: 'Assigned VPN profiles',
    syncAssignments: 'Sync assignments',
    adminConsole: 'Admin Console',
    updatePassword: 'Update password',
    notifications: 'Notifications',
    markAllRead: 'Mark all read',
    fullAccess: 'Full access',
    readOnly: 'Read only',
    noClusters: 'No clusters assigned yet',
    noVpn: 'No VPN profiles assigned',
    noNotifications: 'No notifications',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password'
  },
  admin: {
    title: 'Admin Console',
    signInRequired: 'Sign in required',
    accessRequired: 'Admin access required',
    nav: {
      dashboard: 'Dashboard',
      users: 'Users',
      teams: 'Teams',
      kubeconfigs: 'Kubeconfigs',
      vpn: 'VPN',
      permissions: 'Permissions',
      invitations: 'Invitations',
      audit: 'Audit'
    },
    dashboard: {
      pendingInvitations: 'Pending invitations',
      recentActions: 'Recent administrative actions',
      users: 'Users',
      teams: 'Teams'
    }
  },
  chromeExtra: {
    splitScreen: 'Split screen',
    exitSplit: 'Exit split view',
    terminal: 'Terminal',
    closePanel: 'Close panel'
  },
  resourceDetail: {
    tabs: {
      overview: 'Overview',
      events: 'Events',
      yaml: 'YAML',
      portForward: 'Port Forward',
      replicaHistory: 'Replica history',
      exec: 'Exec',
      metrics: 'Metrics',
      pressure: 'Pressure'
    },
    overview: {
      title: 'Overview',
      status: 'Status',
      age: 'Age',
      namespace: 'Namespace'
    },
    metadata: {
      title: 'Ownership & metadata',
      controlledBy: 'Controlled by',
      labels: 'Labels',
      annotations: 'Annotations',
      selector: 'Selector',
      apiVersion: 'API version'
    },
    conditions: {
      title: 'Conditions'
    },
    data: {
      secretTitle: 'Secret data',
      configMapTitle: 'ConfigMap data',
      empty: 'No data keys'
    },
    actions: {
      kubectl: 'Copy kubectl',
      copyGet: 'kubectl get',
      copyDescribe: 'kubectl describe',
      copyDelete: 'kubectl delete',
      copyYaml: 'kubectl get -o yaml',
      copied: 'Command copied to clipboard',
      copyFailed: 'Copy failed',
      editYaml: 'Edit YAML',
      delete: 'Delete',
      deleteTitle: 'Delete "{{name}}"?',
      deleteBody: 'This action cannot be undone.',
      deleted: 'Deleted "{{name}}"',
      deleteFailed: 'Delete failed: {{error}}'
    }
  },
  podDetail: {
    loadError: 'Failed to load pod details',
    tabs: {
      overview: 'Overview',
      containers: 'Containers',
      metrics: 'Metrics',
      network: 'Network',
      logs: 'Logs',
      exec: 'Exec',
      events: 'Events',
      yaml: 'YAML'
    },
    overview: {
      title: 'Overview',
      status: 'Status',
      ready: 'Ready',
      restarts: 'Restarts',
      age: 'Age',
      node: 'Node',
      podIP: 'Pod IP',
      hostIP: 'Host IP',
      qos: 'QoS class',
      serviceAccount: 'Service account',
      priorityClass: 'Priority class',
      restartPolicy: 'Restart policy'
    },
    metadata: {
      title: 'Ownership & metadata',
      controlledBy: 'Controlled by',
      labels: 'Labels',
      annotations: 'Annotations'
    },
    conditions: {
      title: 'Conditions'
    },
    scheduling: {
      title: 'Scheduling',
      node: 'Node',
      nodeSelector: 'Node selector',
      tolerations: 'Tolerations',
      affinity: 'Affinity',
      none: 'None'
    },
    security: {
      title: 'Security',
      pod: 'Pod security context',
      container: 'Container security context',
      none: 'Not set'
    },
    storage: {
      title: 'Storage',
      volume: 'Volume',
      type: 'Type',
      source: 'Source',
      mounts: 'Volume mounts',
      none: 'No volumes',
      usage: 'Usage',
      capacity: 'Capacity'
    },
    health: {
      title: 'Health checks',
      liveness: 'Liveness',
      readiness: 'Readiness',
      startup: 'Startup'
    },
    containers: {
      title: 'Containers',
      initTitle: 'Init containers',
      init: 'init',
      ready: 'Ready',
      notReady: 'Not ready',
      restarts: '{{count}} restarts',
      image: 'Image',
      pullPolicy: 'Pull policy',
      requests: 'Requests',
      limits: 'Limits',
      message: 'Message',
      lastState: 'Last state',
      ports: 'Ports',
      env: 'Environment',
      containers: 'Containers'
    },
    actions: {
      kubectl: 'Copy kubectl',
      copyGet: 'kubectl get -o yaml',
      copyDescribe: 'kubectl describe',
      copyLogs: 'kubectl logs',
      copyExec: 'kubectl exec',
      copyDelete: 'kubectl delete',
      copied: 'Command copied to clipboard',
      copyFailed: 'Copy failed',
      restart: 'Restart',
      restartTitle: 'Restart "{{name}}"?',
      restartBody: 'The pod will be deleted and its controller will recreate it.',
      restartBodyOrphan: 'This pod has no controller — deleting it will NOT recreate it. Continue?',
      delete: 'Delete',
      deleteTitle: 'Delete "{{name}}"?',
      deleteBody: 'This action cannot be undone.',
      deleted: 'Deleted "{{name}}"',
      deleteFailed: 'Delete failed: {{error}}'
    },
    insights: {
      crashLoop: '{{container}} is crashing ({{reason}}).',
      oomKilled: '{{container}} was OOMKilled — consider raising its memory limit.',
      highRestarts: 'High restart count ({{count}}) — the pod is unstable.',
      notReady: 'Only {{ready}} of {{total}} containers are ready.',
      unschedulable: 'Pod cannot be scheduled: {{reason}}.',
      noLiveness: '{{container}} has no liveness probe.',
      noReadiness: '{{container}} has no readiness probe.',
      noLimits: '{{container}} has no CPU/memory limits set.',
      floatingTag: '{{container}} uses a floating image tag (:latest) — pin a version for reproducible deploys.',
      privileged: '{{container}} runs in privileged mode — a security risk.',
      privilegeEscalation: '{{container}} allows privilege escalation.',
      bestEffort: 'QoS is BestEffort — this pod is first to be evicted under pressure.',
      healthy: 'No issues detected. The pod looks healthy.'
    }
  }

} as const

/** Same shape as English, with string leaves (any language). */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type TranslationResources = DeepStringify<typeof en>

/** Other locales may omit keys; missing ones fall back to English via deepMerge. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>
}

export type TranslationOverrides = DeepPartial<TranslationResources>