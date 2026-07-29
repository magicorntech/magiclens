import type { TranslationOverrides } from './en'

export const de: TranslationOverrides = {
  common: {
    settings: 'Einstellungen',
    custom: 'Benutzerdefiniert',
    version: 'Version',
    build: 'Build',
    manual: 'Manuell',
    connected: 'Verbunden',
    connecting: 'Verbinden…',
    disconnected: 'Getrennt',
    error: 'Fehler',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'Alle Namespaces',
    selectNamespaces: 'Namespaces auswählen',
    namespacesSelected: '{{count}} Namespaces',
    total: 'gesamt',
    clusters: 'Cluster',
    vpn: 'VPN',
    favorites: 'Favoriten',
    cancel: 'Stornieren',
    close: 'Schließen'
  },
  chrome: {
    searchPlaceholder: 'Cluster, Ressourcen, Namespaces suchen…',
    manageClusters: 'Cluster verwalten',
    clustersMeta: '{{total}} gesamt · {{connected}} verbunden',
    vpnTooltip: 'VPN-Profile (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Verbunden · {{name}}',
    vpnConnecting: 'Verbinden · {{name}}',
    searchFavorites: 'Favoriten suchen',
    searchWorkspaces: 'Workspaces suchen…',
    noWorkspaceMatch: 'Keine passenden Workspaces',
    noFavoriteClusters: 'Keine Lieblingscluster',
    collapseSidebar: 'Seitenleiste einklappen',
    expandSidebar: 'Seitenleiste ausklappen',
    favoritesHint: 'Angepinnte Cluster',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Beenden Sie den Vollbildmodus'
  },
  settings: {
    title: 'Einstellungen',
    sections: {
      general: 'Allgemein',
      updates: 'Updates',
      display: 'Anzeige',
      vpnExtensions: 'VPN-Erweiterungen',
      keyboard: 'Tastatur',
      appearance: 'Erscheinungsbild',
      about: 'Info',
      developer: 'Entwickler'
    },
    language: {
      title: 'Sprache',
      hint:
        'Wählen Sie die App-Sprache. Ant-Design-Steuerelemente und Datumsangaben folgen dieser Einstellung.'
    },
    general: {
      refreshTitle: 'Aktualisierungsintervall für Ressourcen',
      refreshHint:
        'Wie oft Ressourcenlisten und Metriken automatisch aktualisiert werden. Gilt für jeden offenen Cluster-Tab; die Live-Aktualisierung kann pro Ressourcenansicht pausiert werden.',
      kubeconfigPathTitle: 'Lokaler kubeconfig-Pfad',
      kubeconfigPathHint:
        'MagicLens scannt automatisch nur diese Datei oder diesen Ordner, wenn Sie „Cluster hinzufügen“ öffnen. Lassen Sie das Feld leer, um ~/.kube zu verwenden.',
      kubeconfigPathPlaceholder: '~/.kube (Standard)',
      kubeconfigPickFile: 'Datei auswählen',
      kubeconfigPickFolder: 'Ordner auswählen',
      kubeconfigReset: 'Verwenden Sie ~/.kube',
      dedupeTitle: 'Doppelte Cluster',
      dedupeHint:
        'Reduzieren Sie Cluster, die denselben Namen/Kontext, denselben API-Server und dieselben Anmeldeinformationen haben, in einem Eintrag. Favoriten und Einstellungen der besten Übereinstimmung bleiben erhalten.',
      dedupe: 'Duplikate zusammenführen',
      dedupeConfirmTitle: 'Doppelte Cluster zusammenführen?',
      dedupeConfirmBody:
        'Cluster mit demselben Namen/Kontext, demselben API-Server und denselben Anmeldeinformationen werden in einem Eintrag zusammengefasst. Favoriten und Einstellungen der besten Übereinstimmung bleiben erhalten.',
      dedupeConfirmOk: 'Duplikate zusammenführen',
      dedupeNone: 'Keine doppelten Cluster gefunden.',
      dedupeDone:
        '{{groups}} Gruppe(n) zusammengeführt, {{removed}} Duplikat(e) entfernt. {{kept}} Cluster bleiben übrig.'
    },
    updates: {
      available: 'v{{version}} verfügbar',
      checkAutomatically: 'Automatisch nach Updates suchen',
      checkOnStartup: 'Beim Start prüfen',
      includePrerelease: 'Vorabversionen einbeziehen',
      macosManual:
        'Automatisches Herunterladen/Installieren ist unter macOS ohne bezahltes Apple-Developer-ID-Zertifikat nicht verfügbar. Bei einem Update verweist MagicLens auf die GitHub-Release-Seite zum manuellen DMG-Download.',
      autoDownload: 'Updates automatisch herunterladen',
      askBeforeInstall: 'Vor der Installation fragen',
      checkNow: 'Jetzt nach Updates suchen',
      openCenter: 'Update-Center öffnen'
    },
    display: {
      detailsTitle: 'Ressourcendetails',
      detailsHint:
        'Wählen Sie, ob ein Klick auf eine Ressource die Detailansicht in einem rechten Panel oder als Tab im unteren Dock öffnet (neben Terminal und YAML-Editor).',
      placementDrawer: 'Rechte Schublade (empfohlen)',
      placementRight: 'Rechtes Panel (geteilte Ansicht)',
      placementBottom: 'Unterer Tab',
      nodesTitle: 'Layout der Nodes-Seite',
      nodesHint:
        'Abschnitte ein- oder ausblenden und per Drag & Drop neu ordnen. Der Tabellenabschnitt bleibt flexibel und füllt den Restplatz.',
      nodesChooser:
        'Wählen Sie, welche Abschnitte auf der Nodes-Seite erscheinen, und ordnen Sie sie per Drag & Drop.',
      sidebarTitle: 'Seitenleiste',
      showFavorites: 'Favoriten-Bereich anzeigen',
      showFavoritesHint:
        'Wenn aktiv, erscheinen Favoriten oberhalb der Workspaces in der linken Seitenleiste. Klicken Sie auf die Überschrift zum Ein- und Ausklappen.',
      showWorkspaces: 'Workspaces-Bereich anzeigen',
      showWorkspacesHint:
        'Wenn aktiv, erscheinen Workspaces in der linken Seitenleiste. In der eingeklappten Leiste markiert ein W die Workspace-Cluster.',
      showWorkspaceClusterCounts: 'Workspace-Clusteranzahl anzeigen',
      showWorkspaceClusterCountsHint:
        'Wenn aktiv, zeigt jeder Workspace-Header an, wie viele Cluster er enthält.',
      tabIconsTitle: 'Tab-Symbole',
      showClusterLogos: 'Logos auf Cluster-Tabs anzeigen',
      showResourceIcons: 'Symbole auf Ressourcen-Tabs anzeigen',
      tabIconsHint:
        'Cluster-Tabs verwenden das Logo, das Sie beim Hinzufügen eines Clusters festlegen. Ressourcen-Tabs nutzen dieselben Symbole wie das linke Menü.',
      chromeToolbarTitle: 'Symbolleistensymbole',
      chromeToolbarHint:
        'Obere Leistensymbole ein-/ausblenden und neu ordnen. Einstellungen bleibt rechts fixiert und kann nicht verschoben oder ausgeblendet werden.',
      chromeToolbarChooser:
        'Ziehen zum Neuordnen. Sichtbarkeit umschalten. Einstellungen bleibt gesperrt.',
      chromeToolbarFixed: 'Fixiert',
      detailMaskBlur: 'Verwischen Sie den Hintergrund hinter Details',
      detailMaskBlurHint:
        'Wenn eine Schublade mit Ressourcendetails geöffnet ist, verwischen Sie die Liste dahinter. Standardmäßig deaktiviert, damit der Tisch scharf bleibt.',
      panelTitle: 'Terminal- und YAML-Panel',
      panelHint:
        'Docken Sie das Bedienfeld „Terminal“ und „YAML bearbeiten“ unten, rechts oder links im Arbeitsbereich an. Sie können auch über die Symbolleistensymbole des Panels wechseln.',
      panelPlacementBottom: 'Unten',
      panelPlacementRight: 'Rechts',
      panelPlacementLeft: 'Links',
      showClusterNamespace: 'Verbundenen Namespace anzeigen',
      showClusterNamespaceHint:
        'Wenn diese Option aktiviert ist, wird der ausgewählte Namespace als Chip auf verbundenen Clustern in der linken Seitenleiste angezeigt.'
    },
    chromeToolbar: {
      search: 'Suche',
      terminal: 'Terminal',
      theme: 'Design',
      fullscreen: 'Vollbild',
      split: 'Cluster teilen',
      settings: 'Einstellungen'
    },
    nodesSections: {
      health: 'Cluster-Gesundheit',
      resources: 'Ressourcennutzung',
      quickInsights: 'Schnelle Einblicke',
      topConsumers: 'Top-Verbraucher',
      table: 'Nodes-Tabelle',
      events: 'Ereignisbereich'
    },
    keyboard: {
      hint:
        'Klicken Sie auf eine Tastenkombination, um eine neue aufzuzeichnen. Konflikte tauschen automatisch. Esc bricht ab.',
      reset: 'Standard wiederherstellen',
      pressKeys: 'Tasten drücken…',
      recordError: 'Verwenden Sie eine Kombination mit ⌘/Strg (oder Alt), oder Esc zum Abbrechen',
      changeAria: 'Tastenkombination für {{label}} ändern',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        'Weisen Sie einem Workspace eine Verknüpfung zu (öffnet ihn und seine Cluster). Auch beim Bearbeiten eines Workspace möglich.',
      workspacesEmpty: 'Erstellen Sie in der Seitenleiste einen Workspace, um eine Verknüpfung zuzuweisen.',
      workspaceOpenDesc: 'Workspace öffnen · {{count}} Cluster',
      actions: {
        globalSearch: {
          label: 'Globale Suche',
          description: 'Cluster-/Ressourcensuche öffnen oder schließen'
        },
        toggleSplitView: {
          label: 'Geteilte Ansicht umschalten',
          description: 'Zwei Cluster-Tabs nebeneinander vergleichen'
        },
        goToClusters: {
          label: 'Zu Clustern',
          description: 'Clusterliste öffnen'
        },
        goToVpn: {
          label: 'Zu VPN',
          description: 'VPN-Profilseite öffnen'
        },
        toggleSidebar: {
          label: 'Seitenleiste umschalten',
          description: 'Linke Seitenleiste ein- oder ausklappen'
        },
        openSettings: {
          label: 'Einstellungen öffnen',
          description: 'Einstellungsfenster öffnen'
        }
      },
      globalTitle: 'App-Verknüpfungen'
    },
    appearance: {
      intro:
        'Wählen Sie eine Vorgabe oder Ihre eigene Akzentfarbe. Seitenleiste, Ressourcenmenü und Panels folgen dem aktiven Theme. Hell-/Dunkelmodus über den Schalter in der Kopfzeile.',
      groupClassic: 'Klassisch',
      groupWorlds: 'Welten — Anime & Helden',
      customAccent: 'Benutzerdefinierter Akzent',
      customAccentHint: 'Gilt für Seitenleisten, Schaltflächen, Hervorhebungen und Diagrammakzente.',
      customSwatch: 'Eigene Akzentfarbe',
      modeTitle: 'Farbmodus',
      modeHint: 'Wechseln Sie zwischen hell und dunkel oder folgen Sie dem Erscheinungsbild des Systems.'
    },
    about: {
      platform: 'Plattform',
      appTitle: 'MagicLens',
      appHint: 'Desktop-Kubernetes-Client – ​​Versions- und Laufzeitdetails für diese Installation.'
    },
    vpnExtensions: {
      intro:
        'Installieren und prüfen Sie die VPN-CLI-Tools, die MagicLens für PIN+MFA-Tunnel benötigt. OpenVPN Connect wird nicht unterstützt.',
      platformLabel: 'Erkannte Plattform: {{platform}}',
      platformHint: {
        darwin:
          'Unter macOS nutzt MagicLens Homebrew für OpenVPN-/WireGuard-CLI. Tunnelblick und WireGuard.app sind optionale Alternativen.',
        win32:
          'Unter Windows werden OpenVPN Community CLI und WireGuard per winget installiert (Fallback: Chocolatey/Scoop). Nicht OpenVPN Connect verwenden.',
        linux:
          'Unter Linux werden zuerst Distributionspakete (apt/dnf/pacman/zypper) bevorzugt. Sonst Fallback auf Homebrew.',
        other:
          'Die automatische Installation kann auf dieser Plattform eingeschränkt sein. Nutzen Sie die manuellen Befehle.'
      },
      statusTitle: 'Erkannte Tools',
      ready: 'bereit',
      missing: 'fehlt',
      rescan: 'Tools erneut scannen',
      installTitle: 'Mit MagicLens installieren',
      installHint:
        'Möglicherweise wird nach Passwort / UAC gefragt. Die Installation kann einige Minuten dauern.',
      installOpenVpn: 'OpenVPN-CLI installieren',
      installWireGuard: 'WireGuard installieren',
      installSuccess: '{{tool}} erfolgreich installiert',
      installFailed: 'Installation fehlgeschlagen',
      packagesTitle: 'Pakete / Befehle',
      packagesHint: 'Zum manuellen Installieren diese Befehle ins Terminal kopieren.',
      manualTitle: 'Manuelle Einrichtung',
      manual: {
        darwin: [
          'Installieren Sie ggf. Homebrew von https://brew.sh.',
          'Ausführen: brew install openvpn',
          'Optional: brew install wireguard-tools',
          'Optional GUI: brew install --cask tunnelblick oder WireGuard.app',
          'MagicLens neu starten, dann erneut mit PIN + MFA verbinden.'
        ],
        win32: [
          'PowerShell oder Terminal öffnen.',
          'Community-OpenVPN installieren (nicht Connect): winget install -e --id OpenVPNTechnologies.OpenVPN',
          'WireGuard installieren: winget install -e --id WireGuard.WireGuard',
          'Alternativen: choco install openvpn -y  /  choco install wireguard -y',
          'MagicLens neu starten, damit openvpn.exe unter Program Files\\OpenVPN\\bin gefunden wird.'
        ],
        linux: [
          'Debian/Ubuntu: sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL: sudo dnf install -y openvpn wireguard-tools',
          'Arch: sudo pacman -Sy openvpn wireguard-tools',
          'Oder Homebrew: brew install openvpn wireguard-tools',
          'MagicLens neu starten, dann mit PIN + MFA verbinden.'
        ],
        other: [
          'OpenVPN Community-CLI für Ihr OS installieren.',
          'Bei WireGuard-Profilen wg-quick-Tools installieren.',
          'MagicLens neu starten und erneut verbinden.'
        ]
      },
      connectNote:
        'Wenn die Tools bereit sind, zur VPN-Seite zurückkehren und verbinden. Fehlen Tools, versucht MagicLens beim Verbinden auch die Auto-Installation.',
      copyCmd: 'Kopie',
      copied: 'In die Zwischenablage kopiert',
      copyFailed: 'Der Kopiervorgang ist fehlgeschlagen'
    },
    subtitle: 'Einstellungen für MagicLens',
    navGroups: {
      preferences: 'Präferenzen',
      system: 'System'
    },
    sectionHints: {
      general: 'Sprache, Aktualisierungsrhythmus, kubeconfig-Scanpfad und Clusterverwaltung.',
      updates: 'Steuern Sie, wie MagicLens nach Updates sucht und diese installiert.',
      display:
        'Wo Details geöffnet werden, wo Terminal/YAML andockt und was in der Seitenleiste angezeigt wird.',
      vpnExtensions:
        'Installieren oder reparieren Sie OpenVPN- und WireGuard-Hilfsprogramme, die von VPN-Profilen verwendet werden.',
      keyboard:
        'Passen Sie globale Verknüpfungen an. Widersprüchliche Bindungen werden automatisch ausgetauscht.',
      appearance: 'Hell-/Dunkelmodus und Farbthemen für die gesamte App.',
      developer: 'Host-Spezifikationen und Live-Prozessnutzung zum Debuggen.',
      about: 'Versions- und Laufzeitinformationen für diesen MagicLens-Build.'
    },
    developer: {
      hostTitle: 'Computerspezifikationen',
      hostHint:
        'Hardware- und Betriebssystemdetails für diesen Computer (werden einmal geladen, wenn Sie diesen Abschnitt öffnen).',
      hostHostname: 'Hostname',
      hostOs: 'Betriebssystem',
      hostCpu: 'CPU',
      hostCores: '{{count}} Kerne',
      hostCpuSpeed: '{{mhz}} MHz',
      hostMemory: 'Erinnerung',
      hostMemoryValue: '{{free}} kostenlos / {{total}}',
      hostDisplay: 'Primäre Anzeige',
      hostDisplayValue: '{{width}}×{{height}} @ {{scale}}×',
      hostRuntime: 'Laufzeit',
      hostApiMissing:
        'Die Host-Info-API ist nicht verfügbar. Starten Sie MagicLens neu, um die neuen Entwicklertools zu laden.',
      liveTitle: 'Live-App-Nutzung',
      liveHint:
        'Liest kontinuierlich MagicLens-CPU und -Speicher (Haupt, GPU, Renderer, Dienstprogramme). Die Werte werden im folgenden Intervall aktualisiert.',
      pollLabel: 'Alle aktualisieren',
      cpuTotal: 'CPU (alle Prozesse)',
      memTotal: 'Speicher (Arbeitssatz)',
      mainHeap: 'Haupt-V8-Haufen',
      heapOf: 'von {{total}} zugewiesen',
      systemMem: 'Systemspeicher',
      systemMemValue: '{{free}} kostenlos / {{total}}',
      processes: '{{count}} Prozesse',
      noSamples: 'Warten auf die erste Probe…',
      sampleFailed: 'Prozessmetriken konnten nicht gelesen werden.',
      apiMissing:
        'Die Prozessmetrik-API ist nicht verfügbar. Starten Sie MagicLens neu, um die neuen Entwicklertools zu laden.',
      colType: 'Typ',
      colName: 'Name',
      colCpu: 'CPU',
      colMem: 'Erinnerung',
      controlsTitle: 'Leistungskontrollen',
      controlsHint:
        'Optimieren Sie die Live-Ressourcenaktualisierung und fordern Sie Renderer-Caches zurück, wenn der Speicher steigt.',
      liveRefresh: 'Live-Ressourcenaktualisierung',
      pauseRefresh: 'Aktualisierung anhalten',
      resumeRefresh: 'Aktualisierung fortsetzen',
      clearCache: 'Renderer-Cache leeren',
      cacheCleared: 'Renderer-Cache geleert',
      openDevTools: 'Öffnen Sie DevTools'
    }
  },
  vpn: {
    brandEyebrow: 'MagicLens',
    title: 'VPN',
    heroSubtitle: 'Sicherer Tunnel für private Cluster und Remote-Zugriff.',
    heroEyebrow: 'Sicherer Tunnel',
    status: {
      connected: 'Verbunden',
      connecting: 'Verbinden',
      error: 'Fehler',
      disconnected: 'Getrennt'
    },
    tunnelsUp: '{{count}} Tunnel aktiv',
    noActiveProfile: 'Kein aktives Profil',
    disconnect: 'Trennen',
    connect: 'Verbinden',
    edit: 'Bearbeiten',
    disconnectedToast: 'Getrennt',
    connectedToast: 'Verbunden',
    openedExternalToast: 'In System-VPN-App geöffnet',
    connectFailed: 'Verbindung fehlgeschlagen',
    removedToast: 'Entfernt',
    noToolsTitle: 'Keine VPN-Tools erkannt',
    noToolsDesc:
      'Für PIN + MFA wird die OpenVPN Community-CLI (oder WireGuard-Tools) benötigt. Öffnen Sie Einstellungen → VPN-Erweiterungen zum Installieren oder folgen Sie den manuellen Schritten. OpenVPN Connect wird nicht unterstützt.',
    openVpnExtensions: 'VPN-Erweiterungen',
    connectHelpTitle: 'Verbindung fehlgeschlagen',
    connectHelpDesc:
      'Wenn Tools fehlen oder die Installation scheiterte, öffnen Sie VPN-Erweiterungen, um OpenVPN/WireGuard zu installieren und OS-spezifische Schritte zu sehen.',
    profilesTitle: 'VPN-Profile',
    addToStart: 'Fügen Sie eine Konfiguration hinzu',
    filteredCount: '{{filtered}} von {{total}}',
    searchPlaceholder: 'Profile suchen…',
    addFile: 'Datei hinzufügen',
    paste: 'Einfügen',
    refresh: 'Aktualisieren',
    emptyDesc: '.ovpn oder WireGuard-.conf hinzufügen',
    chooseFile: 'Datei wählen',
    noMatch: 'Keine Profile für „{{query}}“',
    live: 'Aktiv',
    usernameNotSet: 'Benutzername nicht gesetzt',
    noServerSet: 'Kein Server gesetzt',
    moreActions: 'Weitere Aktionen',
    menu: {
      editProfile: 'Profil bearbeiten',
      revealFile: 'Datei anzeigen',
      openExternally: 'Extern öffnen',
      delete: 'Löschen'
    },
    draft: {
      editTitle: 'VPN-Profil bearbeiten',
      reviewTitle: 'VPN-Profil prüfen',
      correctFields: 'Automatisch erkannte Felder korrigieren',
      correctFieldsDesc:
        'Benutzername / Organisation / Server werden aus der .ovpn gelesen und sind oft falsch — vor dem Speichern bearbeiten.',
      name: 'Name',
      provider: 'Anbieter',
      username: 'Benutzername',
      usernameRequired: 'VPN-Benutzernamen eingeben',
      organization: 'Organisation',
      organizationPlaceholder: 'Organisationsname',
      serverName: 'Servername',
      serverHost: 'Server-Host',
      protocol: 'Protokoll',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: 'Änderungen speichern',
      saveProfile: 'Profil speichern',
      updated: 'Profil aktualisiert',
      updateFailed: 'Aktualisierung fehlgeschlagen',
      missingConfig: 'Konfiguration fehlt',
      added: 'VPN-Profil hinzugefügt',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: 'Automatisch erkennen'
      }
    },
    auth: {
      title: 'Verbinden · {{name}}',
      pinMfaOnly: 'Nur PIN + MFA',
      pinMfaDesc: 'Benutzername / Server / Organisation kommen aus dem Profil. Bei Fehlern Bearbeiten nutzen.',
      user: 'Benutzer:',
      server: 'Server:',
      organization: 'Organisation:',
      notSetEdit: 'nicht gesetzt — Profil bearbeiten',
      setUsernameFirst: 'Zuerst Benutzername unter Bearbeiten setzen oder unten eingeben',
      pin: 'PIN',
      pinRequired: 'PIN eingeben',
      pinPlaceholder: 'VPN-PIN',
      mfa: 'MFA-/OTP-Code',
      mfaRequired: 'MFA-/OTP-Code eingeben',
      mfaPlaceholder: '6-stelliger Code',
      editFields: 'Profilfelder bearbeiten'
    },
    pasteModal: {
      title: 'VPN-Konfiguration einfügen',
      namePlaceholder: 'Büro-VPN',
      config: 'Konfiguration',
      configPlaceholder: '.ovpn- oder WireGuard-Konfiguration einfügen',
      continue: 'Weiter — Felder prüfen'
    },
    panel: {
      connectionStatus: 'Verbindungsstatus',
      healthyTunnel: 'Gesunder Tunnel',
      verifying: 'Verbunden — wird geprüft',
      connecting: 'Verbinden…',
      error: 'Fehler',
      disconnected: 'Getrennt',
      tunnel: 'VPN-Tunnel',
      opening: 'wird geöffnet…',
      server: 'VPN-Server',
      privateNetwork: 'Privates Netzwerk',
      clusterEndpoints: 'Cluster-Endpunkte',
      local: 'lokal',
      download: 'Download',
      upload: 'Upload',
      total: 'Gesamt {{size}}',
      checkProcess: 'VPN-Prozess läuft',
      checkInterface: 'Tunnel-Interface mit IP',
      checkTraffic: 'Datenverkehr fließt',
      falsePositive:
        'Als verbunden markiert, aber noch keine Tunnel-IP — private Cluster scheitern, bis die Route steht.',
      providerLine: 'Anbieter: {{provider}}',
      connectedAgo: 'Vor {{uptime}} verbunden',
      connectionFailed: 'Verbindung fehlgeschlagen'
    },
    session: {
      titleForCluster: 'VPN für {{cluster}}',
      titleConnect: 'VPN verbinden · {{name}}',
      alertTitle: 'VPN-Sitzung',
      pinKnownDesc:
        'PIN wird ca. 5 Stunden gespeichert. Geben Sie einen neuen MFA-Code ein, um den Tunnel zu starten. Danach wird beim Clusterwechsel nicht erneut gefragt, solange der Tunnel aktiv ist.',
      pinUnknownDesc:
        'Einmal pro VPN authentifizieren. MagicLens hält Tunnel offen (wie Pritunl); Clusterwechsel benötigt ca. 5 Stunden keine erneute Anmeldung.',
      profile: 'Profil:',
      user: 'Benutzer:',
      pin: 'PIN',
      pinPlaceholder: 'VPN-PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6-stelliger Code',
      connectContinue: 'Verbinden und fortfahren'
    },
    badge: {
      missing: 'VPN fehlt',
      missingTooltip: 'Verknüpftes VPN-Profil nicht gefunden — in Cluster bearbeiten neu zuweisen',
      connected: 'VPN verbunden · {{name}}',
      connecting: 'VPN verbindet · {{name}}',
      autoConnect: 'Auto-Verbindung · {{name}}'
    },
    clusterLink: {
      title: 'VPN-Profil (Auto-Verbindung)',
      placeholder: 'Kein VPN — manuell verbinden',
      empty: 'Zuerst ein VPN-Profil auf der VPN-Seite hinzufügen',
      hint:
        'Beim Wechsel zu diesem Cluster-Tab verbindet MagicLens dieses VPN automatisch. PIN und MFA werden nach der ersten erfolgreichen Verbindung für den Tag pro Profil gespeichert.'
    }
  },
  tour: {
    skip: 'Überspringen',
    back: 'Zurück',
    next: 'Weiter',
    getStarted: 'Loslegen',
    continue: 'Weiter',
    chooseLanguage: 'Sprache wählen',
    languageHint: 'Sie können das jederzeit in den Einstellungen ändern. Die Tipps folgen Ihrer Auswahl.',
    slidesAria: 'Feature-Folien',
    slides: {
      welcome: {
        eyebrow: 'Willkommen',
        title: 'MagicLens für Kubernetes',
        body:
          'Ein schneller Desktop-Client für Cluster, Ressourcen, VPN-Tunnel, Logs und Terminals — offline-first auf Ihrem Rechner.'
      },
      clusters: {
        eyebrow: 'Cluster',
        title: 'Mehrere Cluster, ein Arbeitsbereich',
        body: 'Kubeconfigs importieren, Favoriten anheften und sofort zwischen allen Clustern wechseln.'
      },
      split: {
        eyebrow: 'Geteilte Ansicht',
        title: 'Zwei Cluster gleichzeitig vergleichen',
        body: 'Geteilte Ansicht hält zwei Cluster-Tabs nebeneinander — ideal für Staging vs. Produktion.'
      },
      search: {
        eyebrow: 'Suche',
        title: 'Alles schnell finden',
        body:
          'Die globale Suche springt mit einem Shortcut zu Clustern, Namespaces und Ressourcen (⌘K / Ctrl+K — änderbar unter Einstellungen → Tastatur).'
      },
      resources: {
        eyebrow: 'Explorer',
        title: 'Jede Ressource durchsuchen',
        body:
          'Workloads, Config, Network, Storage und mehr — Live-Watch, YAML-Bearbeitung, Batch-Aktionen und Detailpanel.'
      },
      topology: {
        eyebrow: 'Topologie',
        title: 'Verbindungen Ihrer Apps sehen',
        body:
          'Deployments, Services und Ingress in einem Graphen — ungesunde Pods erkennen, Details öffnen und von Apps zur Abhängigkeitskarte springen.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Private Cluster, Ihre Tunnel',
        body:
          'OpenVPN-/Pritunl-/WireGuard-Profile laden, mit Clustern verknüpfen und mehrere Tunnel offen halten.'
      },
      ops: {
        eyebrow: 'Alltag',
        title: 'Logs, Exec & Terminals',
        body:
          'Pod-Logs verfolgen und laden, in Container exec’en, lokale Terminals öffnen — alles im unteren Panel.'
      },
      forward: {
        eyebrow: 'Zugriff',
        title: 'Port-Forwarding leicht gemacht',
        body:
          'Pod oder Service mit wenigen Klicks auf einen lokalen Port weiterleiten — die Sitzung bleibt sichtbar.'
      }
    }
  },
  resourceNav: {
    virtual: {
      topology: 'Topologie',
      clusterOverview: 'Cluster',
      applications: 'Anwendungen',
      workloadsOverview: 'Überblick',
      configOverview: 'Überblick',
      portForwarding: 'Portweiterleitung',
      helmCharts: 'Diagramme',
      helmReleases: 'Veröffentlichungen',
      operatorResources: 'Installierte CRDs',
      dynamicCustomResources: 'Dynamische Ressourcen',
      definitions: 'Definitionen'
    },
    search: 'Ressourcen durchsuchen',
    favorites: 'Favoriten',
    addFavorite: 'Zu Favoriten hinzufügen',
    removeFavorite: 'Aus Favoriten entfernen',
    pin: 'An Tabs anheften',
    unpin: 'Von Tabs lösen',
    pinned: 'An Tabs angeheftet',
    emptyFavorites: 'Klicken Sie mit der rechten Maustaste auf eine Ressource, um Favoriten hinzuzufügen.',
    aria: 'Ressourcen',
    sections: {
      overview: 'Überblick',
      workloads: 'Arbeitsbelastungen',
      config: 'Konfig',
      network: 'Netzwerk',
      storage: 'Lagerung',
      helm: 'Helm',
      "access-control": 'Zugangskontrolle',
      "custom-resources": 'Benutzerdefinierte Ressourcen'
    }
  },
  topology: {
    brandEyebrow: 'MagicLens',
    title: 'Topologie & Anwendungen',
    subtitle: 'Live-Karte von Workloads, Services und Abhängigkeiten in diesem Namespace.',
    modes: {
      graph: 'Topologie',
      apps: 'Anwendungen',
      resources: 'Ressourcen'
    },
    refresh: 'Aktualisieren',
    empty: 'Keine Ressourcen zum Abbilden in diesem Namespace.',
    loading: 'Topologie wird erstellt…',
    error: 'Topologie konnte nicht geladen werden',
    search: 'Ressourcen suchen…',
    filterKind: 'Art',
    filterHealth: 'Status',
    filterAll: 'Alle',
    insights: 'Hinweise',
    noInsights: 'Keine Probleme erkannt.',
    health: {
      healthy: 'Gesund',
      degraded: 'Eingeschränkt',
      error: 'Fehler',
      unknown: 'Unbekannt'
    },
    apps: {
      replicas: 'Replicas',
      uptime: 'Alter',
      errors: 'Fehler',
      search: 'Anwendungen suchen…',
      noMatch: 'Keine Anwendungen entsprechen der Suche.',
      empty: 'Keine Anwendungen gefunden. Workloads mit app.kubernetes.io/name kennzeichnen.'
    },
    drawer: {
      overview: 'Übersicht',
      yaml: 'YAML',
      events: 'Ereignisse',
      logs: 'Logs',
      metrics: 'Metriken',
      actions: 'Aktionen',
      close: 'Schließen',
      restart: 'Neustart',
      scale: 'Skala',
      delete: 'Löschen',
      editYaml: 'Bearbeiten Sie YAML'
    },
    insightItems: {
      crashloopTitle: 'CrashLoopBackOff: {{name}}',
      crashloopDetail: 'Pod startet ständig neu',
      serviceEmptyTitle: 'Service ohne Endpoints: {{name}}',
      serviceEmptyDetail: 'Selector trifft in diesem Namespace auf keine Pods.',
      ingressOrphanTitle: 'Ingress ohne Backends: {{name}}',
      ingressOrphanDetail: 'Keine HTTP-Pfade oder Default-Backend konfiguriert.',
      brokenRouteTitle: 'Kaputte Ingress-Abhängigkeit',
      brokenRouteDetail: 'Route zeigt auf fehlenden Service ({{target}}).',
      zeroReadyTitle: 'Keine bereiten Replicas: {{name}}',
      zeroReadyDetail: '{{ready}}/{{desired}} bereit'
    },
    zoomIn: 'Vergrößern',
    zoomOut: 'Herauszoomen',
    fitView: 'Zur Ansicht anpassen',
    openWindow: 'Im Fenster öffnen',
    openWindowMissingCluster: 'No cluster selected for topology window',
    pickNamespace: 'Wählen Sie einen Namespace aus, um die Topologiekarte zu erstellen',
    pickNamespaceHint:
      'Die Topologie benötigt einen einzelnen Namespace. Wählen Sie einen aus der Namespace-Auswahl oben aus.',
    graphCrash:
      'Das Diagramm konnte nicht gerendert werden. Versuchen Sie, den Namensraum zu aktualisieren oder einen anderen Namensraum auszuwählen.',
    live: 'Live',
    updating: 'Aktualisierung…',
    filterNamespace: 'Namensraum',
    sortName: 'Name',
    sortKind: 'Art',
    sortHealth: 'Gesundheit',
    relation: {
      owns: 'besitzt',
      selects: 'wählt',
      routes: 'Routen',
      mounts: 'Reittiere',
      dependsOn: 'hängt davon ab'
    },
    edge: {
      ports: 'Häfen',
      protocol: 'Protokoll',
      rate: '{{rate}} erforderlich/s'
    }
  },
  workspaces: {
    title: 'Arbeitsbereiche',
    sectionHint: 'Gruppierte Cluster',
    compactMark: 'W',
    compactTooltip: 'Arbeitsbereiche',
    new: 'Neuer Arbeitsbereich',
    newTooltip: 'Neuer Arbeitsbereich',
    edit: 'Arbeitsbereich bearbeiten',
    delete: 'Arbeitsbereich löschen',
    empty: 'Gruppieren Sie Cluster in Arbeitsbereiche',
    noClusters: 'Noch keine Cluster – bearbeiten Sie den Arbeitsbereich, um welche hinzuzufügen.',
    defaultName: 'Arbeitsplatz',
    name: 'Name',
    logo: 'Logo',
    changeLogo: 'Logo ändern',
    removeLogo: 'Entfernen',
    clusters: 'Cluster',
    selectClusters: 'Wählen Sie Cluster für diesen Arbeitsbereich aus',
    shortcut: 'Tastenkombination',
    shortcutHint:
      'Öffnet diesen Arbeitsbereich und seine Cluster. Verwenden Sie ⌘/Strg (oder Alt) mit einer Taste.',
    shortcutAssign: 'Verknüpfung zuweisen',
    shortcutListening: 'Tasten drücken…',
    shortcutClear: 'Klar',
    shortcutNone: 'Keiner',
    shortcutRecordError:
      'Verwenden Sie eine Tastenkombination mit ⌘/Strg (oder Alt) oder drücken Sie Esc, um den Vorgang abzubrechen',
    save: 'Speichern',
    created: 'Arbeitsbereich erstellt',
    updated: 'Arbeitsbereich aktualisiert'
  },
  nodesOverview: {
    tableTitle: 'Knoten',
    tableCount: '{{count}} insgesamt',
    emptyTitle: 'Keine Knoten gefunden',
    emptyHint:
      'Dieser Cluster hat keine registrierten Knoten oder Ihr Suchfilter hat alle Ergebnisse ausgeschlossen.',
    hiddenTitle: 'Knoten-Dashboard ausgeblendet',
    hiddenHint: 'Aktivieren Sie Abschnitte unter Einstellungen → Anzeige → Knotenseitenlayout.',
    hotspots: 'Hotspots',
    hotspotsCount: '{{count}} Erkenntnisse',
    topConsumers: 'Top-Verbraucher'
  },
  clusterOverview: {
    title: 'Clusterübersicht',
    subtitle: 'Zustand, Kapazität und aktuelle Aktivitäten im gesamten Cluster.',
    metricsUnavailable: 'Nutzungsmetriken nicht verfügbar – metrics-server installieren oder Prometheus verbinden',
    nodes: 'Knoten',
    nodesHint: '{{ready}} bereit · {{notReady}} nicht bereit',
    pods: 'Schoten',
    podsHint: '{{running}} wird ausgeführt · {{pending}} steht aus · {{failed}} ist fehlgeschlagen',
    namespaces: 'Namensräume',
    deployments: 'Bereitstellungen',
    services: 'Dienstleistungen',
    problemPods: 'Problemkapseln',
    resources: 'Ressourcennutzung',
    cpuCapacity: 'CPU-Kapazität',
    memCapacity: 'Speicherkapazität',
    cpuAlloc: 'CPU zuweisbar',
    memAlloc: 'Speicher zuweisbar',
    recentEvents: 'Aktuelle Ereignisse'
  },
  workloadsOverview: {
    title: 'Übersicht über die Arbeitslasten',
    subtitle: 'Anzahl, Zustand und Problem-Workloads über Namespaces hinweg.',
    healthy: 'Gesund',
    unhealthy: 'Ungesund',
    byNamespace: 'Nach Namensraum',
    empty: 'No workloads found',
    problems: 'Problematische Arbeitslasten',
    noProblems: 'No unhealthy workloads detected',
    highRestarts: 'Pods mit hohem Neustart',
    noRestarts: 'Keine Pods mit hoher Neustartanzahl',
    restarts: '{{count}} wird neu gestartet'
  },
  applicationsOverview: {
    title: 'Anwendungen',
    subtitle: 'Apps grouped from workload labels in the selected namespace.',
    pickNamespace: 'Namensraum',
    search: 'Apps suchen…',
    needNamespace: 'Wählen Sie einen Namensraum',
    needNamespaceHint: 'Für die Anwendungsgruppierung ist ein Namespace-Kontext erforderlich.',
    error: 'Anwendungen konnten nicht geladen werden',
    total: 'Apps',
    apps: 'Anwendungen',
    empty: 'No applications in this namespace',
    replicas: 'Repliken',
    errors: 'Fehler',
    resources: 'Ressourcen'
  },
  configOverview: {
    title: 'Konfigurationsübersicht',
    subtitle: 'ConfigMaps, Secrets, Kontingente, Autoscaling und Zulassungs-Webhooks.',
    highlights: 'Höhepunkte',
    configMaps: 'ConfigMaps',
    secrets: 'Geheimnisse',
    tlsSecrets: 'TLS-Geheimnisse',
    hpas: 'HPAs',
    pdbs: 'PDBs',
    webhooks: 'Webhooks',
    quotas: 'Ressourcenkontingente',
    noQuotas: 'Keine Ressourcenkontingente',
    quotaWarnings: '{{count}} Kontingente scheinen begrenzt zu sein',
    hpaList: 'Horizontale Pod-Autoskalierer',
    noHpas: 'Keine HPAs definiert'
  },
  clustersHub: {
    brandEyebrow: 'MagicLens',
    title: 'Cluster',
    subtitle:
      'Fügen Sie alle Kubernetes-Cluster von einem Ort aus hinzu, verbinden Sie sie und verwalten Sie sie.',
    add: 'Cluster hinzufügen',
    addFirst: 'Fügen Sie Ihren ersten Cluster hinzu',
    statTotal: 'Gesamt',
    statConnected: 'Verbunden',
    statFavorites: 'Favoriten',
    statIssues: 'Braucht Aufmerksamkeit',
    searchPlaceholder: 'Suche nach Name, Kontext, Endpunkt, Namespace, Version …',
    empty: 'Noch keine Cluster. Fügen Sie Ihren ersten Cluster hinzu, um loszulegen.',
    noMatch: 'Keine Cluster entsprechen Ihrer Suche oder Ihrem Filter.',
    filters: {
      all: 'Alle',
      favorites: 'Favoriten',
      connected: 'Verbunden',
      disconnected: 'Getrennt',
      error: 'Fehler',
      recent: 'Kürzlich eröffnet'
    }
  },
  addCluster: {
    title: 'Cluster hinzufügen',
    detected: 'Auf diesem Computer erkannt',
    rescan: 'Erneut scannen',
    scanPath: 'Scannen: {{path}}',
    mergeExisting: 'Duplikate in der Liste zusammenführen',
    mergeNone: 'Keine Duplikate in Ihrer Clusterliste.',
    mergeDone: '{{groups}} Gruppe(n) zusammengeführt, {{removed}} entfernt.',
    modeFile: 'Wählen Sie die kubeconfig-Datei aus',
    modePaste: 'Fügen Sie kubeconfig YAML ein',
    modeFolder: 'Scannen Sie einen Ordner',
    chooseFile: 'Datei auswählen...',
    chooseFolder: 'Wählen Sie den zu scannenden Ordner aus...',
    pastePlaceholder: 'Fügen Sie kubeconfig YAML hier ein',
    parse: 'Analysieren',
    uniqueContexts: '{{count}} eindeutige Kontext(e)',
    mergedHint: '({{count}} aus doppelten Konfigurationen zusammengeführt)',
    alreadyInList: '{{count}} bereits in Ihrer Clusterliste',
    selectAllNew: 'Wählen Sie „Alles neu“ aus',
    tagMerged: 'Zusammengeführt',
    tagAlready: 'Bereits hinzugefügt',
    matches: 'stimmt mit „{{name}}“ überein',
    dupSkip: 'Überspringen (existiert bereits)',
    dupRename: 'Mit neuem Namen hinzufügen',
    newNamePlaceholder: 'Neuer Anzeigename',
    noneToAdd: 'Nichts hinzuzufügen – Duplikate werden übersprungen oder es ist nichts ausgewählt.',
    skipped: '{{count}} Cluster übersprungen – bereits in Ihrer Liste.',
    added: '{{count}} Cluster(s) hinzugefügt.',
    addCount: '{{count}} Cluster(s) hinzufügen',
    allAlready:
      'Alle erkannten Kontexte befinden sich bereits in Ihrer Clusterliste. Wählen Sie „Mit neuem Namen hinzufügen“, um eine zweite Kopie zu behalten.'
  },
  clusterActions: {
    open: 'Offen',
    disconnect: 'Trennen',
    removeFavorite: 'Aus Favoriten entfernen',
    addFavorite: 'Zu Favoriten hinzufügen',
    removeCluster: 'Cluster entfernen',
    edit: 'Bearbeiten',
    testConnection: 'Testverbindung',
    openDashboard: 'Dashboard öffnen',
    removeConfirm: 'Diesen Cluster entfernen?',
    namespacesCount: '{{count}} Namespaces',
    lastOpened: 'Zuletzt geöffnet',
    splitScreen: 'Geteilter Bildschirm',
    exitSplit: 'Geteilte Ansicht verlassen'
  },
  clusterEdit: {
    title: 'Cluster bearbeiten',
    displayName: 'Anzeigename',
    displayNamePlaceholder: 'Mein Cluster',
    changeLogo: 'Logo ändern',
    removeLogo: 'Logo entfernen',
    prometheus: 'Prometheus-URL',
    prometheusHint:
      'Optional. Wird für Metriken verwendet, wenn die automatische Erkennung nicht verfügbar ist.',
    prometheusPlaceholder: 'https://prometheus.example.com',
    prometheusUnknown: 'Unbekannt',
    prometheusConnected: 'Verbunden ({{method}})',
    prometheusNotFound: 'Nicht gefunden',
    prometheusConnectHint: 'Stellen Sie eine Verbindung zu diesem Cluster her, um die Prometheus-Erkennung zu testen.',
    kubeconfig: 'Kubeconfig',
    kubeconfigHint: 'Sehen, kopieren oder bearbeiten Sie die für diesen Cluster verwendete kubeconfig.',
    kubeconfigCopied: 'Kubeconfig in die Zwischenablage kopiert',
    kubeconfigScopedFile: 'Geltungsbereich (aus Datei)',
    kubeconfigScopedInline: 'Bereichsbezogen (inline)',
    view: 'Sicht',
    copy: 'Kopie',
    editYaml: 'Bearbeiten',
    saveKubeconfig: 'Kubeconfig speichern',
    noKubeconfigChanges: 'Keine Änderungen zum Speichern',
    kubeconfigSaved: 'Kubeconfig wurde für diesen Cluster gespeichert',
    reconnectHint: 'Verbinden Sie den Cluster erneut, um die kubeconfig-Änderungen anzuwenden',
    save: 'Speichern',
    cancel: 'Stornieren',
    close: 'Schließen'
  },
  clusterBg: {
    title: 'Arbeitsbereich-Hintergrund',
    hint:
      'Wird angezeigt, wenn diese Cluster-Registerkarte geöffnet ist. Wählen Sie eine Standardlandschaft oder laden Sie PNG/JPG hoch.',
    remove: 'Entfernen',
    upload: 'PNG/JPG hochladen',
    panelTransparency: 'Panel-Transparenz',
    solidPct: '{{Opacity}} % Feststoff',
    clear: 'Klar',
    default: 'Standard',
    solid: 'Solide',
    panelHint:
      'Steuert, wie durchsichtige Ressourcenmenüs, Tabellen (Pods, Bereitstellungen usw.) und Kopfzeilen über dem Hintergrund angezeigt werden.'
  },
  clusterView: {
    disconnectedTitle: 'Cluster getrennt',
    disconnectedBody: 'Stellen Sie eine Verbindung her, um Namespaces und Ressourcen für diesen Cluster zu laden.',
    connect: 'Verbinden',
    connectingVpn: 'VPN verbinden…',
    connecting: 'Verbinden…'
  },
  clusterAdd: {
    title: 'Cluster hinzufügen',
    pickFile: 'Wählen Sie die kubeconfig-Datei aus',
    pasteYaml: 'YAML einfügen',
    scan: 'Scan',
    rescan: 'Erneut scannen',
    selectAllNew: 'Wählen Sie „Alles neu“ aus',
    alreadyAdded: 'Bereits hinzugefügt',
    addN: '{{count}} Cluster hinzufügen',
    addN_plural: 'Fügen Sie {{count}} Cluster hinzu',
    noContexts: 'In dieser Kubeconfig wurden keine Kontexte gefunden.',
    duplicate: 'Bereits in Ihrer Liste'
  },
  auth: {
    signInTitle: 'Melden Sie sich bei MagicLens an',
    signInBody:
      'Verwenden Sie die E-Mail-Adresse und das Passwort Ihrer Organisation. Administratoren öffnen die Admin-Konsole; Mitglieder öffnen ihr Profil. Sie können auch offline nur mit lokalen kubeconfigs fortfahren.',
    email: 'E-Mail',
    emailPlaceholder: 'you@company.com',
    password: 'Passwort',
    passwordPlaceholder: 'Passwort',
    apiBase: 'API-Basis-URL',
    apiBasePlaceholder: 'http://localhost:3000',
    signIn: 'anmelden',
    apiSettings: 'API-Einstellungen',
    hideApiSettings: 'API-Einstellungen ausblenden',
    continueOffline: 'Offline weitermachen',
    syncedToast: 'Synchronisierte {{kubeconfigs}}-Clusterkontext(e) und {{vpn}}-VPN-Profil(e)',
    syncFailedToast: 'Angemeldet, aber die Synchronisierung ist fehlgeschlagen: {{error}}'
  },
  search: {
    placeholder: 'Suchcluster, Pods…',
    searching: 'Suche...',
    noResults: 'Keine Ergebnisse',
    connectHint: 'Verbinden Sie einen Cluster, um Ressourcen über Namespaces hinweg zu durchsuchen.',
    typeHint:
      'Geben Sie ein, um zu suchen. Verwenden Sie Schlüsselwörter wie pod:nginx, @deploy api oder klicken Sie oben auf einen Typfilter.',
    searchingIn: 'Suche nach Ressourcen in: {{cluster}}',
    recent: 'Jüngste',
    clusters: 'Cluster',
    resources: 'Ressourcen',
    hint: '↑↓ navigieren · Enter öffnen · Esc schließen'
  },
  onboarding: {
    title: 'Ihnen zugewiesene Ressourcen',
    body:
      'Wählen Sie aus, welche Organisations-Kubekonfigurationen und VPN-Profile mit diesem Gerät synchronisiert werden sollen.',
    syncSelected: 'Mit diesem Gerät synchronisieren ausgewählt',
    notNow: 'Nicht jetzt',
    kubeconfigs: 'Kubeconfigs',
    vpnProfiles: 'VPN-Profile',
    empty: 'Noch keine Aufgaben'
  },
  profile: {
    title: 'Profil',
    assignedClusters: 'Zugewiesene Cluster',
    assignedVpn: 'Zugewiesene VPN-Profile',
    syncAssignments: 'Aufgaben synchronisieren',
    adminConsole: 'Admin-Konsole',
    updatePassword: 'Update password',
    notifications: 'Benachrichtigungen',
    markAllRead: 'Alles als gelesen markieren',
    fullAccess: 'Voller Zugriff',
    readOnly: 'Nur lesen',
    noClusters: 'Noch keine Cluster zugewiesen',
    noVpn: 'Keine VPN-Profile zugewiesen',
    noNotifications: 'Keine Benachrichtigungen',
    currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Passwort bestätigen'
  },
  admin: {
    title: 'Admin-Konsole',
    signInRequired: 'Anmeldung erforderlich',
    accessRequired: 'Administratorzugriff erforderlich',
    nav: {
      dashboard: 'Armaturenbrett',
      users: 'Users',
      teams: 'Mannschaften',
      kubeconfigs: 'Kubeconfigs',
      vpn: 'VPN',
      permissions: 'Berechtigungen',
      invitations: 'Einladungen',
      audit: 'Prüfung'
    },
    dashboard: {
      pendingInvitations: 'Ausstehende Einladungen',
      recentActions: 'Aktuelle Verwaltungsmaßnahmen',
      users: 'Users',
      teams: 'Mannschaften'
    }
  },
  chromeExtra: {
    splitScreen: 'Geteilter Bildschirm',
    exitSplit: 'Geteilte Ansicht verlassen',
    terminal: 'Terminal',
    closePanel: 'Panel schließen'
  },
  resourceDetail: {
    tabs: {
      overview: 'Überblick',
      events: 'Veranstaltungen',
      yaml: 'YAML',
      portForward: 'Portweiterleitung',
      replicaHistory: 'Replikatgeschichte',
      exec: 'Geschäftsführer',
      metrics: 'Metriken',
      pressure: 'Druck',
      pods: 'Pods'
    },
    overview: {
      title: 'Überblick',
      status: 'Status',
      age: 'Alter',
      namespace: 'Namensraum'
    },
    metadata: {
      title: 'Eigentum und Metadaten',
      controlledBy: 'Kontrolliert von',
      labels: 'Labels',
      annotations: 'Anmerkungen',
      selector: 'Wähler',
      apiVersion: 'API-Version'
    },
    conditions: {
      title: 'Bedingungen'
    },
    data: {
      secretTitle: 'Geheime Daten',
      configMapTitle: 'ConfigMap-Daten',
      empty: 'Keine Datenschlüssel'
    },
    actions: {
      kubectl: 'Kubectl kopieren',
      copyGet: 'kubectl get',
      copyDescribe: 'kubectl beschreiben',
      copyDelete: 'kubectl löschen',
      copyYaml: 'kubectl get -o yaml',
      copied: 'Command copied to clipboard',
      copyFailed: 'Der Kopiervorgang ist fehlgeschlagen',
      editYaml: 'Bearbeiten Sie YAML',
      delete: 'Löschen',
      deleteTitle: '„{{name}}“ löschen?',
      deleteBody: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      deleted: '„{{name}}“ gelöscht',
      deleteFailed: 'Löschen fehlgeschlagen: {{error}}'
    }
  },
  podDetail: {
    loadError: 'Pod-Details konnten nicht geladen werden',
    tabs: {
      overview: 'Überblick',
      containers: 'Container',
      metrics: 'Metriken',
      network: 'Netzwerk',
      logs: 'Protokolle',
      exec: 'Geschäftsführer',
      events: 'Veranstaltungen',
      yaml: 'YAML'
    },
    overview: {
      title: 'Überblick',
      status: 'Status',
      ready: 'Bereit',
      restarts: 'Neustarts',
      age: 'Alter',
      node: 'Knoten',
      podIP: 'Pod-IP',
      hostIP: 'Host-IP',
      qos: 'QoS-Klasse',
      serviceAccount: 'Dienstkonto',
      priorityClass: 'Prioritätsklasse',
      restartPolicy: 'Richtlinie neu starten'
    },
    metadata: {
      title: 'Eigentum und Metadaten',
      controlledBy: 'Kontrolliert von',
      labels: 'Labels',
      annotations: 'Anmerkungen'
    },
    conditions: {
      title: 'Bedingungen'
    },
    scheduling: {
      title: 'Terminplanung',
      node: 'Knoten',
      nodeSelector: 'Knotenauswahl',
      tolerations: 'Toleranzen',
      affinity: 'Affinität',
      none: 'Keiner'
    },
    security: {
      title: 'Sicherheit',
      pod: 'Pod-Sicherheitskontext',
      container: 'Containersicherheitskontext',
      none: 'Nicht festgelegt'
    },
    storage: {
      title: 'Lagerung',
      volume: 'Volumen',
      type: 'Typ',
      source: 'Quelle',
      mounts: 'Volumen steigt',
      none: 'Keine Bände'
    },
    health: {
      title: 'Gesundheitschecks',
      liveness: 'Lebendigkeit',
      readiness: 'Bereitschaft',
      startup: 'Start-up'
    },
    containers: {
      title: 'Container',
      initTitle: 'Container initialisieren',
      init: 'init',
      ready: 'Bereit',
      notReady: 'Nicht bereit',
      restarts: '{{count}} wird neu gestartet',
      image: 'Bild',
      pullPolicy: 'Pull-Richtlinie',
      requests: 'Anfragen',
      limits: 'Grenzen',
      message: 'Nachricht',
      lastState: 'Letzter Zustand',
      ports: 'Häfen',
      env: 'Umfeld',
      containers: 'Container'
    },
    actions: {
      kubectl: 'Kubectl kopieren',
      copyGet: 'kubectl get -o yaml',
      copyDescribe: 'kubectl beschreiben',
      copyLogs: 'kubectl-Protokolle',
      copyExec: 'kubectl exec',
      copyDelete: 'kubectl löschen',
      copied: 'Command copied to clipboard',
      copyFailed: 'Der Kopiervorgang ist fehlgeschlagen',
      restart: 'Neustart',
      restartTitle: '„{{name}}“ neu starten?',
      restartBody: 'Der Pod wird gelöscht und von seinem Controller neu erstellt.',
      restartBodyOrphan:
        'Dieser Pod hat keinen Controller – durch das Löschen wird er NICHT neu erstellt. Weitermachen?',
      delete: 'Löschen',
      deleteTitle: '„{{name}}“ löschen?',
      deleteBody: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      deleted: '„{{name}}“ gelöscht',
      deleteFailed: 'Löschen fehlgeschlagen: {{error}}'
    },
    insights: {
      crashLoop: '{{container}} stürzt ab ({{reason}}).',
      oomKilled: '{{container}} wurde OOMKilled – erwägen Sie eine Erhöhung des Speicherlimits.',
      highRestarts: 'Hohe Neustartanzahl ({{count}}) – der Pod ist instabil.',
      notReady: 'Nur {{ready}} von {{total}} Containern sind bereit.',
      unschedulable: 'Pod kann nicht geplant werden: {{reason}}.',
      noLiveness: '{{container}} hat keine Liveness-Prüfung.',
      noReadiness: '{{container}} has no readiness probe.',
      noLimits: 'Für {{container}} sind keine CPU-/Speicherbeschränkungen festgelegt.',
      floatingTag:
        '{{container}} verwendet ein Floating-Image-Tag (:latest) – pinnen Sie eine Version für reproduzierbare Bereitstellungen an.',
      privileged: '{{container}} wird im privilegierten Modus ausgeführt – ein Sicherheitsrisiko.',
      privilegeEscalation: '{{container}} ermöglicht eine Rechteausweitung.',
      bestEffort: 'QoS ist BestEffort – dieser Pod wird als erster unter Druck geräumt.',
      healthy: 'Keine Probleme festgestellt. Die Schote sieht gesund aus.'
    }
  }
}
