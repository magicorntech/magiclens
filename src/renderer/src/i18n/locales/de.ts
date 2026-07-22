import type { TranslationResources } from './en'

export const de: TranslationResources = {
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
      'Installieren Sie OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app oder wireguard-tools.',
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
  }
}
