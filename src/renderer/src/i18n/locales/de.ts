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
    allNamespaces: 'All namespaces',
    total: 'gesamt',
    clusters: 'Cluster',
    vpn: 'VPN',
    favorites: 'Favoriten'
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
    expandSidebar: 'Seitenleiste ausklappen'
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
      about: 'Info'
    },
    language: {
      title: 'Sprache',
      hint: 'Wählen Sie die App-Sprache. Ant-Design-Steuerelemente und Datumsangaben folgen dieser Einstellung.'
    },
    general: {
      refreshTitle: 'Aktualisierungsintervall für Ressourcen',
      refreshHint:
        'Wie oft Ressourcenlisten und Metriken automatisch aktualisiert werden. Gilt für jeden offenen Cluster-Tab; die Live-Aktualisierung kann pro Ressourcenansicht pausiert werden.'
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
      nodesChooser: 'Wählen Sie, welche Abschnitte auf der Nodes-Seite erscheinen, und ordnen Sie sie per Drag & Drop.',
      sidebarTitle: 'Seitenleiste',
      showFavorites: 'Favoriten-Bereich anzeigen',
      showFavoritesHint:
        'Wenn aktiv, erscheinen Favoriten oberhalb der Workspaces in der linken Seitenleiste. Klicken Sie auf die Überschrift zum Ein- und Ausklappen.',
      showWorkspaces: 'Workspaces-Bereich anzeigen',
      showWorkspacesHint:
        'Wenn aktiv, erscheinen Workspaces in der linken Seitenleiste. In der eingeklappten Leiste markiert ein W die Workspace-Cluster.',
      tabIconsTitle: 'Tab-Symbole',
      showClusterLogos: 'Logos auf Cluster-Tabs anzeigen',
      showResourceIcons: 'Symbole auf Ressourcen-Tabs anzeigen',
      tabIconsHint:
        'Cluster-Tabs verwenden das Logo, das Sie beim Hinzufügen eines Clusters festlegen. Ressourcen-Tabs nutzen dieselben Symbole wie das linke Menü.'
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
      hint: 'Klicken Sie auf eine Tastenkombination, um eine neue aufzuzeichnen. Konflikte tauschen automatisch. Esc bricht ab.',
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
      }
    },
    appearance: {
      intro:
        'Wählen Sie eine Vorgabe oder Ihre eigene Akzentfarbe. Seitenleiste, Ressourcenmenü und Panels folgen dem aktiven Theme. Hell-/Dunkelmodus über den Schalter in der Kopfzeile.',
      customAccent: 'Benutzerdefinierter Akzent',
      customAccentHint: 'Gilt für Seitenleisten, Schaltflächen, Hervorhebungen und Diagrammakzente.',
      customSwatch: 'Eigene Akzentfarbe'
    },
    about: {
      platform: 'Plattform'
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
        other: 'Die automatische Installation kann auf dieser Plattform eingeschränkt sein. Nutzen Sie die manuellen Befehle.'
      },
      statusTitle: 'Erkannte Tools',
      ready: 'bereit',
      missing: 'fehlt',
      rescan: 'Tools erneut scannen',
      installTitle: 'Mit MagicLens installieren',
      installHint: 'Möglicherweise wird nach Passwort / UAC gefragt. Die Installation kann einige Minuten dauern.',
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
        'Wenn die Tools bereit sind, zur VPN-Seite zurückkehren und verbinden. Fehlen Tools, versucht MagicLens beim Verbinden auch die Auto-Installation.'
    }
  },
  vpn: {
    heroEyebrow: 'Sicherer Tunnel',
    title: 'VPN',
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
      hint: 'Beim Wechsel zu diesem Cluster-Tab verbindet MagicLens dieses VPN automatisch. PIN und MFA werden nach der ersten erfolgreichen Verbindung für den Tag pro Profil gespeichert.'
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
        body: 'Ein schneller Desktop-Client für Cluster, Ressourcen, VPN-Tunnel, Logs und Terminals — offline-first auf Ihrem Rechner.'
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
        body: 'Die globale Suche springt mit einem Shortcut zu Clustern, Namespaces und Ressourcen (⌘K / Ctrl+K — änderbar unter Einstellungen → Tastatur).'
      },
      resources: {
        eyebrow: 'Explorer',
        title: 'Jede Ressource durchsuchen',
        body: 'Workloads, Config, Network, Storage und mehr — Live-Watch, YAML-Bearbeitung, Batch-Aktionen und Detailpanel.'
      },
      topology: {
        eyebrow: 'Topologie',
        title: 'Verbindungen Ihrer Apps sehen',
        body: 'Deployments, Services und Ingress in einem Graphen — ungesunde Pods erkennen, Details öffnen und von Apps zur Abhängigkeitskarte springen.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Private Cluster, Ihre Tunnel',
        body: 'OpenVPN-/Pritunl-/WireGuard-Profile laden, mit Clustern verknüpfen und mehrere Tunnel offen halten.'
      },
      ops: {
        eyebrow: 'Alltag',
        title: 'Logs, Exec & Terminals',
        body: 'Pod-Logs verfolgen und laden, in Container exec’en, lokale Terminals öffnen — alles im unteren Panel.'
      },
      forward: {
        eyebrow: 'Zugriff',
        title: 'Port-Forwarding leicht gemacht',
        body: 'Pod oder Service mit wenigen Klicks auf einen lokalen Port weiterleiten — die Sitzung bleibt sichtbar.'
      }
    }
  },
  resourceNav: {
    virtual: {
      topology: 'Topologie'
    }
  },
  topology: {
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
      empty: 'Keine Anwendungen gefunden. Workloads mit app.kubernetes.io/name kennzeichnen.'
    },
    drawer: {
      overview: 'Übersicht',
      yaml: 'YAML',
      events: 'Ereignisse',
      logs: 'Logs',
      metrics: 'Metriken',
      actions: 'Aktionen',
      close: 'Schließen'
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
    }
  }
}
