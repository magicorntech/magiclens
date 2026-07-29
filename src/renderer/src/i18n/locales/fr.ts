import type { TranslationOverrides } from './en'

export const fr: TranslationOverrides = {
  common: {
    settings: 'Paramètres',
    custom: 'Personnalisé',
    version: 'Version',
    build: 'Build',
    manual: 'Manuel',
    connected: 'Connecté',
    connecting: 'Connexion…',
    disconnected: 'Déconnecté',
    error: 'Erreur',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'Tous les namespaces',
    selectNamespaces: 'Sélectionner des namespaces',
    namespacesSelected: '{{count}} namespaces',
    total: 'au total',
    clusters: 'Clusters',
    vpn: 'VPN',
    favorites: 'Favoris',
    cancel: 'Annuler',
    close: 'Fermer'
  },
  chrome: {
    searchPlaceholder: 'Rechercher clusters, ressources, namespaces…',
    manageClusters: 'Gérer les clusters',
    clustersMeta: '{{total}} au total · {{connected}} connectés',
    vpnTooltip: 'Profils VPN (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Connecté · {{name}}',
    vpnConnecting: 'Connexion · {{name}}',
    searchFavorites: 'Rechercher dans les favoris',
    searchWorkspaces: 'Rechercher des workspaces…',
    noWorkspaceMatch: 'Aucun workspace correspondant',
    noFavoriteClusters: 'Aucun cluster favori',
    collapseSidebar: 'Réduire la barre latérale',
    expandSidebar: 'Développer la barre latérale',
    favoritesHint: 'Clusters épinglés',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran'
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      updates: 'Mises à jour',
      display: 'Affichage',
      vpnExtensions: 'Extensions VPN',
      keyboard: 'Clavier',
      appearance: 'Apparence',
      about: 'À propos',
      developer: 'Promoteur'
    },
    language: {
      title: 'Langue',
      hint:
        'Choisissez la langue de l’application. Les contrôles Ant Design et les dates suivent ce réglage.'
    },
    general: {
      refreshTitle: 'Intervalle d’actualisation des ressources',
      refreshHint:
        'Fréquence d’actualisation automatique des listes et métriques. S’applique à chaque onglet de cluster ouvert ; la pause reste possible par vue de ressource.',
      kubeconfigPathTitle: 'Chemin d\'accès local à Kubeconfig',
      kubeconfigPathHint:
        'MagicLens analyse automatiquement uniquement ce fichier ou ce dossier lorsque vous ouvrez Ajouter un cluster. Laissez vide pour utiliser ~/.kube.',
      kubeconfigPathPlaceholder: '~/.kube (par défaut)',
      kubeconfigPickFile: 'Choisir un fichier',
      kubeconfigPickFolder: 'Choisir un dossier',
      kubeconfigReset: 'Utilisez ~/.kube',
      dedupeTitle: 'Duplicate clusters',
      dedupeHint:
        'Réduisez les clusters qui partagent le même nom/contexte, le même serveur API et les mêmes informations d\'identification en une seule entrée. Les favoris et les paramètres de la meilleure correspondance sont conservés.',
      dedupe: 'Fusionner les doublons',
      dedupeConfirmTitle: 'Fusionner les clusters en double ?',
      dedupeConfirmBody:
        'Les clusters portant le même nom/contexte, le même serveur API et les mêmes informations d\'identification seront regroupés en une seule entrée. Les favoris et les paramètres de la meilleure correspondance sont conservés.',
      dedupeConfirmOk: 'Fusionner les doublons',
      dedupeNone: 'Aucun cluster en double trouvé.',
      dedupeDone:
        'Fusion de {{groups}} groupe(s), suppression de {{removed}} doublons. {{conservé}} cluster(s) restent.'
    },
    updates: {
      available: 'v{{version}} disponible',
      checkAutomatically: 'Rechercher les mises à jour automatiquement',
      checkOnStartup: 'Vérifier au démarrage',
      includePrerelease: 'Inclure les préversions',
      macosManual:
        'Le téléchargement/installation automatique n’est pas disponible sur macOS sans certificat Apple Developer ID payant. En cas de mise à jour, MagicLens renvoie vers la release GitHub pour un téléchargement DMG manuel.',
      autoDownload: 'Télécharger les mises à jour automatiquement',
      askBeforeInstall: 'Demander avant d’installer',
      checkNow: 'Rechercher les mises à jour maintenant',
      openCenter: 'Ouvrir le centre de mises à jour'
    },
    display: {
      detailsTitle: 'Détails des ressources',
      detailsHint:
        'Choisissez si un clic ouvre le détail dans un panneau à droite ou comme onglet dans le dock inférieur (avec Terminal et éditeur YAML).',
      placementDrawer: 'Tiroir droit (recommandé)',
      placementRight: 'Panneau droit (vue partagée)',
      placementBottom: 'Onglet inférieur',
      nodesTitle: 'Mise en page de la page Nodes',
      nodesHint:
        'Activez ou désactivez les sections et réordonnez-les par glisser-déposer. La table reste flexible et remplit l’espace restant.',
      nodesChooser: 'Choisissez les sections de la page Nodes et réordonnez-les par glisser-déposer.',
      sidebarTitle: 'Barre latérale',
      showFavorites: 'Afficher la section Favoris',
      showFavoritesHint:
        'Lorsqu’elle est activée, Favoris apparaît au-dessus des Workspaces dans la barre latérale. Cliquez sur l’en-tête pour la replier ou la déplier.',
      showWorkspaces: 'Afficher la section Workspaces',
      showWorkspacesHint:
        'Lorsqu’elle est activée, Workspaces apparaît dans la barre latérale. En mode réduit, un W marque les clusters de workspace.',
      showWorkspaceClusterCounts: 'Afficher le nombre de clusters par workspace',
      showWorkspaceClusterCountsHint:
        'Lorsqu’elle est activée, chaque en-tête de workspace indique combien de clusters il contient.',
      tabIconsTitle: 'Icônes des onglets',
      showClusterLogos: 'Afficher les logos sur les onglets cluster',
      showResourceIcons: 'Afficher les icônes sur les onglets ressource',
      tabIconsHint:
        'Les onglets cluster utilisent le logo défini à l’ajout. Les onglets ressource utilisent les mêmes icônes que le menu de gauche.',
      chromeToolbarTitle: 'Icônes de la barre d’outils',
      chromeToolbarHint:
        'Affichez, masquez et réordonnez les icônes de la barre supérieure. Paramètres reste fixe à droite et ne peut pas être déplacé ni masqué.',
      chromeToolbarChooser:
        'Glissez pour réordonner. Activez la visibilité. Paramètres reste verrouillé.',
      chromeToolbarFixed: 'Fixe',
      detailMaskBlur: 'Arrière-plan flou derrière les détails',
      detailMaskBlurHint:
        'Lorsqu’un tiroir de détails de ressources est ouvert, brouillez la liste derrière celui-ci. Désactivé par défaut pour que le tableau reste net.',
      panelTitle: 'Panneau Terminal et YAML',
      panelHint:
        'Ancrez le panneau Terminal et Modifier YAML en bas, à droite ou à gauche de l\'espace de travail. Vous pouvez également basculer entre les icônes de la barre d\'outils du panneau.',
      panelPlacementBottom: 'Bas',
      panelPlacementRight: 'Droite',
      panelPlacementLeft: 'Gauche',
      showClusterNamespace: 'Afficher l\'espace de noms connecté',
      showClusterNamespaceHint:
        'Lorsqu\'il est activé, l\'espace de noms sélectionné est affiché sous forme de puce sur les clusters connectés dans la barre latérale gauche.'
    },
    chromeToolbar: {
      search: 'Recherche',
      terminal: 'Terminal',
      theme: 'Thème',
      fullscreen: 'Plein écran',
      split: 'Diviser les clusters',
      settings: 'Paramètres'
    },
    nodesSections: {
      health: 'Santé du cluster',
      resources: 'Utilisation des ressources',
      quickInsights: 'Aperçus rapides',
      topConsumers: 'Plus gros consommateurs',
      table: 'Table des nœuds',
      events: 'Panneau d’événements'
    },
    keyboard: {
      hint:
        'Cliquez sur un raccourci pour en enregistrer un nouveau. Les conflits s’échangent automatiquement. Échap annule.',
      reset: 'Réinitialiser',
      pressKeys: 'Appuyez sur les touches…',
      recordError: 'Utilisez un raccourci avec ⌘/Ctrl (ou Alt), ou Échap pour annuler',
      changeAria: 'Modifier le raccourci pour {{label}}',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        'Attribuez un raccourci pour ouvrir un workspace (l’ouvre et ses clusters). Aussi possible en modifiant le workspace.',
      workspacesEmpty: 'Créez un workspace dans la barre latérale pour lui attribuer un raccourci.',
      workspaceOpenDesc: 'Ouvrir le workspace · {{count}} clusters',
      actions: {
        globalSearch: {
          label: 'Recherche globale',
          description: 'Ouvrir ou fermer la palette de recherche cluster / ressource'
        },
        toggleSplitView: {
          label: 'Basculer la vue partagée',
          description: 'Comparer deux onglets cluster côte à côte'
        },
        goToClusters: {
          label: 'Aller aux clusters',
          description: 'Ouvrir la liste des clusters'
        },
        goToVpn: {
          label: 'Aller au VPN',
          description: 'Ouvrir la page des profils VPN'
        },
        toggleSidebar: {
          label: 'Basculer la barre latérale',
          description: 'Réduire ou développer la barre latérale gauche'
        },
        openSettings: {
          label: 'Ouvrir les paramètres',
          description: 'Ouvrir la fenêtre des paramètres'
        }
      },
      globalTitle: 'Raccourcis d\'applications'
    },
    appearance: {
      intro:
        'Choisissez un préréglage ou votre propre couleur d’accent. La barre latérale, le menu des ressources et les panneaux suivent le thème actif. Utilisez le bouton de l’en-tête pour le mode clair / sombre.',
      groupClassic: 'Classique',
      groupWorlds: 'Mondes — anime & héros',
      customAccent: 'Accent personnalisé',
      customAccentHint: 'S’applique aux barres latérales, boutons, surbrillances et accents de graphiques.',
      customSwatch: 'Votre propre couleur d’accent',
      modeTitle: 'Mode couleur',
      modeHint: 'Basculez entre clair, sombre ou suivez l’apparence du système.'
    },
    about: {
      platform: 'Plateforme',
      appTitle: 'Objectif magique',
      appHint: 'Client Desktop Kubernetes : détails de version et d\'exécution pour cette installation.'
    },
    vpnExtensions: {
      intro:
        'Installez et vérifiez les outils CLI VPN dont MagicLens a besoin pour les tunnels PIN + MFA. OpenVPN Connect n’est pas pris en charge.',
      platformLabel: 'Plateforme détectée : {{platform}}',
      platformHint: {
        darwin:
          'Sur macOS, Homebrew installe les CLI OpenVPN / WireGuard. Tunnelblick et WireGuard.app sont des solutions de repli optionnelles.',
        win32:
          'Sous Windows, MagicLens installe OpenVPN Community CLI et WireGuard via winget (repli Chocolatey/Scoop). N’utilisez pas OpenVPN Connect.',
        linux:
          'Sous Linux, les paquets de distribution (apt/dnf/pacman/zypper) sont préférés. Sinon, repli sur Homebrew.',
        other: 'L’installation automatique peut être limitée. Utilisez les commandes manuelles ci-dessous.'
      },
      statusTitle: 'Outils détectés',
      ready: 'prêt',
      missing: 'manquant',
      rescan: 'Rescanner les outils',
      installTitle: 'Installer avec MagicLens',
      installHint: 'Un mot de passe / UAC peut être demandé. L’installation peut prendre plusieurs minutes.',
      installOpenVpn: 'Installer OpenVPN CLI',
      installWireGuard: 'Installer WireGuard',
      installSuccess: '{{tool}} installé avec succès',
      installFailed: 'Échec de l’installation',
      packagesTitle: 'Paquets / commandes',
      packagesHint: 'Copiez ces commandes pour installer manuellement dans un terminal.',
      manualTitle: 'Étapes d’installation manuelle',
      manual: {
        darwin: [
          'Installez Homebrew depuis https://brew.sh si besoin.',
          'Exécutez : brew install openvpn',
          'Optionnel : brew install wireguard-tools',
          'GUI optionnelle : brew install --cask tunnelblick ou WireGuard.app',
          'Redémarrez MagicLens, puis reconnectez avec PIN + MFA.'
        ],
        win32: [
          'Ouvrez PowerShell ou Terminal.',
          'Installez OpenVPN Community (pas Connect) : winget install -e --id OpenVPNTechnologies.OpenVPN',
          'Installez WireGuard : winget install -e --id WireGuard.WireGuard',
          'Alternatives : choco install openvpn -y  /  choco install wireguard -y',
          'Redémarrez MagicLens pour trouver openvpn.exe sous Program Files\\OpenVPN\\bin.'
        ],
        linux: [
          'Debian/Ubuntu : sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL : sudo dnf install -y openvpn wireguard-tools',
          'Arch : sudo pacman -Sy openvpn wireguard-tools',
          'Ou Homebrew : brew install openvpn wireguard-tools',
          'Redémarrez MagicLens, puis connectez avec PIN + MFA.'
        ],
        other: [
          'Installez la CLI OpenVPN Community pour votre OS.',
          'Installez wg-quick si vous utilisez WireGuard.',
          'Redémarrez MagicLens et réessayez.'
        ]
      },
      connectNote:
        'Une fois les outils prêts, revenez à la page VPN et connectez-vous. MagicLens peut aussi auto-installer à la connexion si des outils manquent.',
      copyCmd: 'Copie',
      copied: 'Copié dans le presse-papiers',
      copyFailed: 'Échec de la copie'
    },
    subtitle: 'Préférences pour MagicLens',
    navGroups: {
      preferences: 'Préférences',
      system: 'Système'
    },
    sectionHints: {
      general:
        'Langue, cadence d\'actualisation, chemin d\'analyse kubeconfig et gestion interne du cluster.',
      updates: 'Contrôlez la manière dont MagicLens recherche et installe les mises à jour.',
      display: 'Où les détails s\'ouvrent, où Terminal/YAML s\'ancre et ce que montre la barre latérale.',
      vpnExtensions: 'Installez ou réparez les assistants OpenVPN et WireGuard utilisés par les profils VPN.',
      keyboard: 'Personnalisez les raccourcis globaux. Les liaisons en conflit s’échangent automatiquement.',
      appearance: 'Mode clair/sombre et thèmes de couleurs pour toute l\'application.',
      developer: 'Spécifications de l\'hôte et utilisation des processus en direct pour le débogage.',
      about: 'Informations sur la version et l\'exécution de cette version de MagicLens.'
    },
    developer: {
      hostTitle: 'Spécifications de l\'ordinateur',
      hostHint:
        'Détails du matériel et du système d\'exploitation de cette machine (chargés une fois lorsque vous ouvrez cette section).',
      hostHostname: 'Nom d\'hôte',
      hostOs: 'Système opérateur',
      hostCpu: 'Processeur',
      hostCores: '{{count}} cœurs',
      hostCpuSpeed: '{{Mhz}} MHz',
      hostMemory: 'Mémoire',
      hostMemoryValue: '{{gratuit}} gratuit / {{total}}',
      hostDisplay: 'Affichage principal',
      hostDisplayValue: '{{largeur}}×{{hauteur}} @ {{échelle}}×',
      hostRuntime: 'Durée d\'exécution',
      hostApiMissing:
        'L\'API d\'informations sur l\'hôte n\'est pas disponible. Redémarrez MagicLens pour charger les nouveaux outils de développement.',
      liveTitle: 'Utilisation de l\'application en direct',
      liveHint:
        'Lit en continu le processeur et la mémoire MagicLens (principal, GPU, moteur de rendu, utilitaires). Les valeurs sont actualisées selon l\'intervalle ci-dessous.',
      pollLabel: 'Actualiser tous les',
      cpuTotal: 'CPU (tous les processus)',
      memTotal: 'Mémoire (ensemble de travail)',
      mainHeap: 'Tas principal V8',
      heapOf: 'sur {{total}} alloués',
      systemMem: 'Mémoire système',
      systemMemValue: '{{gratuit}} gratuit / {{total}}',
      processes: '{{count}} processus',
      noSamples: 'En attente du premier échantillon…',
      sampleFailed: 'Impossible de lire les métriques du processus.',
      apiMissing:
        'L’API des métriques de processus n’est pas disponible. Redémarrez MagicLens pour charger les nouveaux outils de développement.',
      colType: 'Taper',
      colName: 'Nom',
      colCpu: 'Processeur',
      colMem: 'Mémoire',
      controlsTitle: 'Contrôles des performances',
      controlsHint:
        'Ajustez l\'actualisation des ressources en direct et récupérez les caches du moteur de rendu lorsque la mémoire augmente.',
      liveRefresh: 'Actualisation des ressources en direct',
      pauseRefresh: 'Suspendre l\'actualisation',
      resumeRefresh: 'Reprendre l\'actualisation',
      clearCache: 'Vider le cache du moteur de rendu',
      cacheCleared: 'Cache du moteur de rendu vidé',
      openDevTools: 'Ouvrir les outils de développement'
    }
  },
  vpn: {
    brandEyebrow: 'MagicLens',
    title: 'VPN',
    heroSubtitle: 'Tunnel sécurisé pour les clusters privés et l’accès distant.',
    heroEyebrow: 'Tunnel sécurisé',
    status: {
      connected: 'Connecté',
      connecting: 'Connexion',
      error: 'Erreur',
      disconnected: 'Déconnecté'
    },
    tunnelsUp: '{{count}} tunnels actifs',
    noActiveProfile: 'Aucun profil actif',
    disconnect: 'Déconnecter',
    connect: 'Connecter',
    edit: 'Modifier',
    disconnectedToast: 'Déconnecté',
    connectedToast: 'Connecté',
    openedExternalToast: 'Ouvert dans l’app VPN système',
    connectFailed: 'Échec de la connexion',
    removedToast: 'Supprimé',
    noToolsTitle: 'Aucun outil VPN détecté',
    noToolsDesc:
      'MagicLens a besoin de la CLI OpenVPN Community (ou des outils WireGuard) pour PIN + MFA. Ouvrez Paramètres → Extensions VPN pour installer, ou suivez les étapes manuelles. OpenVPN Connect n’est pas pris en charge.',
    openVpnExtensions: 'Extensions VPN',
    connectHelpTitle: 'Impossible de se connecter',
    connectHelpDesc:
      'Si des outils manquent ou si l’installation a échoué, ouvrez Extensions VPN pour installer OpenVPN / WireGuard et voir les étapes pour votre OS.',
    profilesTitle: 'Profils VPN',
    addToStart: 'Ajoutez une configuration pour commencer',
    filteredCount: '{{filtered}} sur {{total}}',
    searchPlaceholder: 'Rechercher des profils…',
    addFile: 'Ajouter un fichier',
    paste: 'Coller',
    refresh: 'Actualiser',
    emptyDesc: 'Ajoutez un .ovpn ou un .conf WireGuard',
    chooseFile: 'Choisir un fichier',
    noMatch: 'Aucun profil ne correspond à « {{query}} »',
    live: 'Actif',
    usernameNotSet: 'Nom d’utilisateur non défini',
    noServerSet: 'Aucun serveur défini',
    moreActions: 'Plus d’actions',
    menu: {
      editProfile: 'Modifier le profil',
      revealFile: 'Afficher le fichier',
      openExternally: 'Ouvrir en externe',
      delete: 'Supprimer'
    },
    draft: {
      editTitle: 'Modifier le profil VPN',
      reviewTitle: 'Vérifier le profil VPN',
      correctFields: 'Corriger les champs détectés',
      correctFieldsDesc:
        'Le nom d’utilisateur / l’organisation / le serveur sont lus depuis le .ovpn et sont souvent incorrects — modifiez-les avant d’enregistrer.',
      name: 'Nom',
      provider: 'Fournisseur',
      username: 'Nom d’utilisateur',
      usernameRequired: 'Saisissez le nom d’utilisateur VPN',
      organization: 'Organisation',
      organizationPlaceholder: 'Nom de l’organisation',
      serverName: 'Nom du serveur',
      serverHost: 'Hôte du serveur',
      protocol: 'Protocole',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: 'Enregistrer les modifications',
      saveProfile: 'Enregistrer le profil',
      updated: 'Profil mis à jour',
      updateFailed: 'Échec de la mise à jour',
      missingConfig: 'Configuration manquante',
      added: 'Profil VPN ajouté',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: 'Détection automatique'
      }
    },
    auth: {
      title: 'Connecter · {{name}}',
      pinMfaOnly: 'PIN + MFA uniquement',
      pinMfaDesc:
        'Le nom d’utilisateur / serveur / organisation viennent du profil. Utilisez Modifier s’ils sont incorrects.',
      user: 'Utilisateur :',
      server: 'Serveur :',
      organization: 'Organisation :',
      notSetEdit: 'non défini — modifier le profil',
      setUsernameFirst: 'Définissez d’abord le nom d’utilisateur via Modifier, ou saisissez-le ci-dessous',
      pin: 'PIN',
      pinRequired: 'Saisissez votre PIN',
      pinPlaceholder: 'PIN VPN',
      mfa: 'Code MFA / OTP',
      mfaRequired: 'Saisissez votre code MFA/OTP',
      mfaPlaceholder: 'Code à 6 chiffres',
      editFields: 'Modifier les champs du profil'
    },
    pasteModal: {
      title: 'Coller la config VPN',
      namePlaceholder: 'VPN du bureau',
      config: 'Configuration',
      configPlaceholder: 'Collez la config .ovpn ou WireGuard',
      continue: 'Continuer — vérifier les champs'
    },
    panel: {
      connectionStatus: 'État de la connexion',
      healthyTunnel: 'Tunnel sain',
      verifying: 'Connecté — vérification',
      connecting: 'Connexion…',
      error: 'Erreur',
      disconnected: 'Déconnecté',
      tunnel: 'Tunnel VPN',
      opening: 'ouverture…',
      server: 'Serveur VPN',
      privateNetwork: 'Réseau privé',
      clusterEndpoints: 'points de terminaison du cluster',
      local: 'local',
      download: 'Téléchargement',
      upload: 'Envoi',
      total: 'Total {{size}}',
      checkProcess: 'Processus VPN en cours',
      checkInterface: 'Interface tunnel avec IP',
      checkTraffic: 'Trafic en cours',
      falsePositive:
        'Marqué comme connecté mais pas encore d’IP de tunnel — les clusters privés expireront jusqu’à ce que la route soit prête.',
      providerLine: 'Fournisseur : {{provider}}',
      connectedAgo: 'Connecté il y a {{uptime}}',
      connectionFailed: 'Échec de la connexion'
    },
    session: {
      titleForCluster: 'VPN pour {{cluster}}',
      titleConnect: 'Connecter le VPN · {{name}}',
      alertTitle: 'Session VPN',
      pinKnownDesc:
        'Le PIN est mémorisé ~5 heures. Saisissez un nouveau code MFA pour ouvrir le tunnel. Une fois connecté, le changement de cluster ne redemandera rien tant que le tunnel reste actif.',
      pinUnknownDesc:
        'Authentifiez-vous une fois par VPN. MagicLens garde les tunnels ouverts (comme Pritunl) ; le changement de cluster ne demande pas de reconnexion pendant ~5 heures.',
      profile: 'Profil :',
      user: 'Utilisateur :',
      pin: 'PIN',
      pinPlaceholder: 'PIN VPN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: 'Code à 6 chiffres',
      connectContinue: 'Connecter et continuer'
    },
    badge: {
      missing: 'VPN manquant',
      missingTooltip: 'Profil VPN lié introuvable — réassignez dans Modifier le cluster',
      connected: 'VPN connecté · {{name}}',
      connecting: 'VPN en connexion · {{name}}',
      autoConnect: 'Connexion auto · {{name}}'
    },
    clusterLink: {
      title: 'Profil VPN (connexion auto)',
      placeholder: 'Pas de VPN — connexion manuelle',
      empty: 'Ajoutez d’abord un profil VPN dans la page VPN',
      hint:
        'En passant à cet onglet cluster, MagicLens connecte ce VPN automatiquement. Le PIN et le MFA sont mémorisés par profil pour la journée après la première connexion réussie.'
    }
  },
  tour: {
    skip: 'Passer',
    back: 'Retour',
    next: 'Suivant',
    getStarted: 'Commencer',
    continue: 'Continuer',
    chooseLanguage: 'Choisissez votre langue',
    languageHint: 'Modifiable à tout moment dans Réglages. Les conseils suivront votre choix.',
    slidesAria: 'Diapositives des fonctionnalités',
    slides: {
      welcome: {
        eyebrow: 'Bienvenue',
        title: 'MagicLens pour Kubernetes',
        body:
          'Un client bureau rapide pour gérer clusters, ressources, tunnels VPN, logs et terminaux — offline-first sur votre machine.'
      },
      clusters: {
        eyebrow: 'Clusters',
        title: 'Multi-cluster, un espace de travail',
        body:
          'Importez des kubeconfigs, épinglez des favoris et changez d’onglet instantanément entre vos clusters.'
      },
      split: {
        eyebrow: 'Vue partagée',
        title: 'Comparez deux clusters à la fois',
        body: 'La vue partagée garde deux onglets côte à côte — idéal staging vs production.'
      },
      search: {
        eyebrow: 'Recherche',
        title: 'Trouvez tout rapidement',
        body:
          'La recherche globale ouvre clusters, namespaces et ressources d’un raccourci (⌘K / Ctrl+K — modifiable dans Réglages → Clavier).'
      },
      resources: {
        eyebrow: 'Explorateur',
        title: 'Parcourez chaque ressource',
        body:
          'Workloads, Config, Network, Storage et plus — surveillance live, YAML, actions en lot et panneau de détail.'
      },
      topology: {
        eyebrow: 'Topologie',
        title: 'Voir comment les apps se connectent',
        body:
          'Cartographiez Deployments, Services et Ingress — repérez les pods en erreur, ouvrez les détails et passez des applications au graphe de dépendances.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Clusters privés, vos tunnels',
        body:
          'Chargez des profils OpenVPN / Pritunl / WireGuard, liez-les aux clusters et gardez plusieurs tunnels actifs.'
      },
      ops: {
        eyebrow: 'Au quotidien',
        title: 'Logs, exec et terminaux',
        body:
          'Suivez et téléchargez les logs de pods, exec dans les conteneurs, ouvrez des terminaux locaux — tout dans le panneau bas.'
      },
      forward: {
        eyebrow: 'Accès',
        title: 'Port forwarding simplifié',
        body:
          'Transférez un Pod ou Service vers un port local en quelques clics — la session reste visible.'
      }
    }
  },
  resourceNav: {
    virtual: {
      topology: 'Topologie',
      clusterOverview: 'Grappe',
      applications: 'Applications',
      workloadsOverview: 'Aperçu',
      configOverview: 'Aperçu',
      portForwarding: 'Redirection de port',
      helmCharts: 'Graphiques',
      helmReleases: 'Sorties',
      operatorResources: 'CRD installés',
      dynamicCustomResources: 'Ressources dynamiques',
      definitions: 'Définitions'
    },
    search: 'Rechercher des ressources',
    favorites: 'Favoris',
    addFavorite: 'Ajouter aux favoris',
    removeFavorite: 'Supprimer des favoris',
    pin: 'Épingler aux onglets',
    unpin: 'Retirer l\'épingle des onglets',
    pinned: 'Épinglé aux onglets',
    emptyFavorites: 'Cliquez avec le bouton droit sur une ressource pour ajouter des favoris.',
    aria: 'Ressources',
    sections: {
      overview: 'Aperçu',
      workloads: 'Charges de travail',
      config: 'Configuration',
      network: 'Réseau',
      storage: 'Stockage',
      helm: 'Barre',
      "access-control": 'Contrôle d\'accès',
      "custom-resources": 'Ressources personnalisées'
    }
  },
  topology: {
    brandEyebrow: 'MagicLens',
    title: 'Topologie et applications',
    subtitle: 'Carte live des workloads, services et dépendances de ce namespace.',
    modes: {
      graph: 'Topologie',
      apps: 'Applications',
      resources: 'Ressources'
    },
    refresh: 'Actualiser',
    empty: 'Aucune ressource à cartographier dans ce namespace.',
    loading: 'Construction de la topologie…',
    error: 'Échec du chargement de la topologie',
    search: 'Rechercher des ressources…',
    filterAll: 'Tous',
    insights: 'Insights',
    noInsights: 'Aucun problème détecté.',
    health: {
      healthy: 'Sain',
      degraded: 'Dégradé',
      error: 'Erreur',
      unknown: 'Inconnu'
    },
    apps: {
      replicas: 'Réplicas',
      uptime: 'Âge',
      errors: 'Erreurs',
      search: 'Rechercher des applications…',
      noMatch: 'Aucune application ne correspond à votre recherche.',
      empty: 'Aucune application. Étiquetez les workloads avec app.kubernetes.io/name.'
    },
    drawer: {
      overview: 'Aperçu',
      close: 'Fermer',
      yaml: 'YAML',
      events: 'Événements',
      logs: 'Journaux',
      metrics: 'Métrique',
      actions: 'Actes',
      restart: 'Redémarrage',
      scale: 'Échelle',
      delete: 'Supprimer',
      editYaml: 'Modifier YAML'
    },
    insightItems: {
      crashloopTitle: 'CrashLoopBackOff : {{name}}',
      crashloopDetail: 'Le pod redémarre en boucle',
      serviceEmptyTitle: 'Service sans endpoints : {{name}}',
      serviceEmptyDetail: 'Le sélecteur ne correspond à aucun pod dans ce namespace.',
      ingressOrphanTitle: 'Ingress sans backends : {{name}}',
      ingressOrphanDetail: 'Aucun chemin HTTP ni backend par défaut.',
      brokenRouteTitle: 'Dépendance Ingress cassée',
      brokenRouteDetail: 'La route pointe vers un service manquant ({{target}}).',
      zeroReadyTitle: 'Aucun replica prêt : {{name}}',
      zeroReadyDetail: '{{ready}}/{{desired}} prêts'
    },
    zoomIn: 'Zoomer',
    zoomOut: 'Zoom arrière',
    fitView: 'Ajuster à la vue',
    openWindow: 'Ouvrir dans la fenêtre',
    openWindowMissingCluster: 'Aucun cluster sélectionné pour la fenêtre de topologie',
    pickNamespace: 'Sélectionnez un espace de noms pour créer la carte topologique',
    pickNamespaceHint:
      'La topologie nécessite un seul espace de noms. Choisissez-en un dans le sélecteur d’espace de noms ci-dessus.',
    graphCrash:
      'Le graphique n\'a pas pu être rendu. Essayez d\'actualiser ou de choisir un autre espace de noms.',
    live: 'En direct',
    updating: 'Mise à jour…',
    filterNamespace: 'Espace de noms',
    filterKind: 'Gentil',
    filterHealth: 'Santé',
    sortName: 'Nom',
    sortKind: 'Gentil',
    sortHealth: 'Santé',
    relation: {
      owns: 'possède',
      selects: 'sélectionne',
      routes: 'itinéraires',
      mounts: 'monte',
      dependsOn: 'dépend de'
    },
    edge: {
      ports: 'Ports',
      protocol: 'Protocole',
      rate: '{{rate}} requêtes/s'
    }
  },
  workspaces: {
    title: 'Espaces de travail',
    sectionHint: 'Clusters groupés',
    compactMark: 'W',
    compactTooltip: 'Espaces de travail',
    new: 'Nouvel espace de travail',
    newTooltip: 'Nouvel espace de travail',
    edit: 'Modifier l\'espace de travail',
    delete: 'Supprimer l\'espace de travail',
    empty: 'Regrouper les clusters dans des espaces de travail',
    noClusters: 'Aucun cluster pour l\'instant : modifiez l\'espace de travail pour en ajouter.',
    defaultName: 'Espace de travail',
    name: 'Nom',
    logo: 'Logo',
    changeLogo: 'Changer de logo',
    removeLogo: 'Retirer',
    clusters: 'Groupes',
    selectClusters: 'Sélectionner des clusters pour cet espace de travail',
    shortcut: 'Raccourci clavier',
    shortcutHint: 'Ouvre cet espace de travail et ses clusters. Utilisez ⌘/Ctrl (ou Alt) avec une touche.',
    shortcutAssign: 'Attribuer un raccourci',
    shortcutListening: 'Appuyez sur les touches…',
    shortcutClear: 'Clair',
    shortcutNone: 'Aucun',
    shortcutRecordError: 'Utilisez un raccourci avec ⌘/Ctrl (ou Alt), ou appuyez sur Echap pour annuler',
    save: 'Sauvegarder',
    created: 'Espace de travail créé',
    updated: 'Espace de travail mis à jour'
  },
  nodesOverview: {
    tableTitle: 'Nœuds',
    tableCount: '{{count}} total',
    emptyTitle: 'Aucun nœud trouvé',
    emptyHint:
      'Ce cluster n\'a aucun nœud enregistré ou votre filtre de recherche a exclu tous les résultats.',
    hiddenTitle: 'Tableau de bord des nœuds masqué',
    hiddenHint: 'Activez les sections dans Paramètres → Affichage → Disposition de la page Nœuds.',
    hotspots: 'Points chauds',
    hotspotsCount: '{{count}} insights',
    topConsumers: 'Principaux consommateurs'
  },
  clusterOverview: {
    title: 'Présentation du cluster',
    subtitle: 'État de santé, capacité et activité récente dans l’ensemble du cluster.',
    metricsUnavailable: 'Métriques d\'utilisation indisponibles — installez metrics-server ou connectez Prometheus',
    nodes: 'Nœuds',
    nodesHint: '{{ready}} prêt · {{notReady}} pas prêt',
    pods: 'Gousses',
    podsHint: '{{running}} en cours d\'exécution · {{ending}} en attente · {{failed}} a échoué',
    namespaces: 'Espaces de noms',
    deployments: 'Déploiements',
    services: 'Services',
    problemPods: 'Pods à problèmes',
    resources: 'Utilisation des ressources',
    cpuCapacity: 'Capacité du processeur',
    memCapacity: 'Capacité mémoire',
    cpuAlloc: 'CPU allouable',
    memAlloc: 'Mémoire allouable',
    recentEvents: 'Événements récents'
  },
  workloadsOverview: {
    title: 'Présentation des charges de travail',
    subtitle: 'Comptes, intégrité et charges de travail problématiques dans les espaces de noms.',
    healthy: 'En bonne santé',
    unhealthy: 'Malsain',
    byNamespace: 'Par espace de noms',
    empty: 'No workloads found',
    problems: 'Charges de travail problématiques',
    noProblems: 'Aucune charge de travail malsaine détectée',
    highRestarts: 'Pods à redémarrage élevé',
    noRestarts: 'Aucun pod avec un nombre de redémarrages élevé',
    restarts: '{{count}} redémarre'
  },
  applicationsOverview: {
    title: 'Applications',
    subtitle:
      'Applications regroupées à partir d’étiquettes de charge de travail dans l’espace de noms sélectionné.',
    pickNamespace: 'Espace de noms',
    search: 'Rechercher des applications…',
    needNamespace: 'Choisissez un espace de noms',
    needNamespaceHint: 'Le regroupement d\'applications nécessite un contexte d\'espace de noms.',
    error: 'Échec du chargement des applications',
    total: 'Applications',
    apps: 'Applications',
    empty: 'Aucune application dans cet espace de noms',
    replicas: 'Répliques',
    errors: 'Erreurs',
    resources: 'Ressources'
  },
  configOverview: {
    title: 'Aperçu de la configuration',
    subtitle: 'ConfigMaps, secrets, quotas, mise à l\'échelle automatique et webhooks d\'admission.',
    highlights: 'Points forts',
    configMaps: 'Cartes de configuration',
    secrets: 'Secrets',
    tlsSecrets: 'Secrets TLS',
    hpas: 'HPA',
    pdbs: 'PDB',
    webhooks: 'Webhooks',
    quotas: 'Quotas de ressources',
    noQuotas: 'Aucun quota de ressources',
    quotaWarnings: '{{count}} quotas semblent limités',
    hpaList: 'Autoscalers de pods horizontaux',
    noHpas: 'Aucun HPA défini'
  },
  clustersHub: {
    brandEyebrow: 'MagicLens',
    title: 'Groupes',
    subtitle: 'Ajoutez, connectez et gérez tous les clusters Kubernetes à partir d\'un seul endroit.',
    add: 'Ajouter un cluster',
    addFirst: 'Ajoutez votre premier cluster',
    statTotal: 'Total',
    statConnected: 'Connecté',
    statFavorites: 'Favoris',
    statIssues: 'A besoin d\'attention',
    searchPlaceholder: 'Recherche par nom, contexte, point de terminaison, espace de noms, version…',
    empty: 'Pas encore de clusters. Ajoutez votre premier cluster pour commencer.',
    noMatch: 'Aucun cluster ne correspond à votre recherche ou filtre.',
    filters: {
      all: 'Tous',
      favorites: 'Favoris',
      connected: 'Connecté',
      disconnected: 'Déconnecté',
      error: 'Erreur',
      recent: 'Récemment ouvert'
    }
  },
  addCluster: {
    title: 'Ajouter un cluster',
    detected: 'Détecté sur cette machine',
    rescan: 'Nouvelle analyse',
    scanPath: 'Numérisation : {{path}}',
    mergeExisting: 'Fusionner les doublons dans la liste',
    mergeNone: 'Aucun doublon dans votre liste de clusters.',
    mergeDone: 'Fusion de {{groups}} groupe(s), suppression de {{removed}}.',
    modeFile: 'Choisissez le fichier kubeconfig',
    modePaste: 'Coller kubeconfig YAML',
    modeFolder: 'Scanner un dossier',
    chooseFile: 'Choisissez le fichier...',
    chooseFolder: 'Choisissez le dossier à analyser...',
    pastePlaceholder: 'Collez kubeconfig YAML ici',
    parse: 'Analyser',
    uniqueContexts: '{{count}} contexte(s) unique(s)',
    mergedHint: '({{count}} fusionné à partir de configurations en double)',
    alreadyInList: '{{count}} déjà dans votre liste de clusters',
    selectAllNew: 'Sélectionnez tous les nouveaux',
    tagMerged: 'Fusionné',
    tagAlready: 'Déjà ajouté',
    matches: 'correspond à "{{name}}"',
    dupSkip: 'Passer (existe déjà)',
    dupRename: 'Ajouter avec un nouveau nom',
    newNamePlaceholder: 'Nouveau nom d\'affichage',
    noneToAdd: 'Rien à ajouter : les doublons sont configurés pour être ignorés ou rien n\'est sélectionné.',
    skipped: '{{count}} cluster(s) ignoré(s) – déjà dans votre liste.',
    added: 'Ajout de {{count}} cluster(s).',
    addCount: 'Ajouter {{count}} cluster(s)',
    allAlready:
      'Tous les contextes détectés sont déjà dans votre liste de clusters. Choisissez « Ajouter avec un nouveau nom » pour conserver une deuxième copie.'
  },
  clusterActions: {
    open: 'Ouvrir',
    disconnect: 'Déconnecter',
    removeFavorite: 'Supprimer des favoris',
    addFavorite: 'Ajouter aux favoris',
    removeCluster: 'Supprimer le cluster',
    edit: 'Modifier',
    testConnection: 'Tester la connexion',
    openDashboard: 'Ouvrir le tableau de bord',
    removeConfirm: 'Supprimer ce cluster ?',
    namespacesCount: '{{count}} espaces de noms',
    lastOpened: 'Dernière ouverture',
    splitScreen: 'Écran partagé',
    exitSplit: 'Quitter la vue fractionnée'
  },
  clusterEdit: {
    title: 'Modifier le cluster',
    displayName: 'Nom d\'affichage',
    displayNamePlaceholder: 'Mon cluster',
    changeLogo: 'Changer de logo',
    removeLogo: 'Supprimer le logo',
    prometheus: 'URL de Prométhée',
    prometheusHint:
      'Facultatif. Utilisé pour les métriques lorsque la découverte automatique n\'est pas disponible.',
    prometheusPlaceholder: 'https://prometheus.example.com',
    prometheusUnknown: 'Inconnu',
    prometheusConnected: 'Connecté ({{méthode}})',
    prometheusNotFound: 'Pas trouvé',
    prometheusConnectHint: 'Connectez-vous à ce cluster pour tester la découverte Prometheus.',
    kubeconfig: 'Kubeconfig',
    kubeconfigHint: 'Affichez, copiez ou modifiez le kubeconfig utilisé pour ce cluster.',
    kubeconfigCopied: 'Kubeconfig copié dans le presse-papiers',
    kubeconfigScopedFile: 'Portée (à partir du fichier)',
    kubeconfigScopedInline: 'Portée (en ligne)',
    view: 'Voir',
    copy: 'Copie',
    editYaml: 'Modifier',
    saveKubeconfig: 'Enregistrer la configuration de Kube',
    noKubeconfigChanges: 'Aucune modification à enregistrer',
    kubeconfigSaved: 'Kubeconfig enregistré pour ce cluster',
    reconnectHint: 'Reconnectez le cluster pour appliquer les modifications de kubeconfig',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    close: 'Fermer'
  },
  clusterBg: {
    title: 'Arrière-plan de l\'espace de travail',
    hint:
      'Affiché lorsque cet onglet de cluster est ouvert. Choisissez un paysage par défaut ou téléchargez PNG / JPG.',
    remove: 'Retirer',
    upload: 'Télécharger des fichiers PNG/JPG',
    panelTransparency: 'Transparence du panneau',
    solidPct: '{{opacité}} % de solide',
    clear: 'Clair',
    default: 'Défaut',
    solid: 'Solide',
    panelHint:
      'Contrôle la façon dont les menus de ressources, les tableaux (pods, déploiements,…) et les en-têtes sont transparents sur le fond d\'écran.'
  },
  clusterView: {
    disconnectedTitle: 'Cluster déconnecté',
    disconnectedBody: 'Connectez-vous pour charger les espaces de noms et les ressources de ce cluster.',
    connect: 'Connecter',
    connectingVpn: 'Connexion VPN…',
    connecting: 'De liaison…'
  },
  clusterAdd: {
    title: 'Ajouter un cluster',
    pickFile: 'Choisissez le fichier kubeconfig',
    pasteYaml: 'Coller YAML',
    scan: 'Balayage',
    rescan: 'Nouvelle analyse',
    selectAllNew: 'Sélectionnez tous les nouveaux',
    alreadyAdded: 'Déjà ajouté',
    addN: 'Ajouter {{count}} cluster',
    addN_plural: 'Ajouter {{count}} clusters',
    noContexts: 'Aucun contexte trouvé dans ce kubeconfig.',
    duplicate: 'Déjà dans votre liste'
  },
  auth: {
    signInTitle: 'Connectez-vous à MagicLens',
    signInBody:
      'Utilisez l\'adresse e-mail et le mot de passe de votre organisation. Les administrateurs ouvrent la console d\'administration ; les membres ouvrent leur profil. Vous pouvez également continuer hors ligne avec les kubeconfigs locaux uniquement.',
    email: 'E-mail',
    emailPlaceholder: 'vous@entreprise.com',
    password: 'Mot de passe',
    passwordPlaceholder: 'Mot de passe',
    apiBase: 'URL de base de l\'API',
    apiBasePlaceholder: 'http://localhost:3000',
    signIn: 'Se connecter',
    apiSettings: 'Paramètres de l\'API',
    hideApiSettings: 'Masquer les paramètres de l\'API',
    continueOffline: 'Continuer hors ligne',
    syncedToast: '{{kubeconfigs}} contexte(s) de cluster synchronisés et {{vpn}} profil(s) VPN',
    syncFailedToast: 'Je suis connecté, mais la synchronisation a échoué : {{error}}'
  },
  search: {
    placeholder: 'Rechercher des clusters, des pods…',
    searching: 'Recherche…',
    noResults: 'Aucun résultat',
    connectHint: 'Connectez un cluster pour rechercher des ressources dans les espaces de noms.',
    typeHint:
      'Tapez pour rechercher. Utilisez des mots-clés comme pod:nginx, @deploy api ou cliquez sur un filtre de type ci-dessus.',
    searchingIn: 'Recherche de ressources dans : {{cluster}}',
    recent: 'Récent',
    clusters: 'Groupes',
    resources: 'Ressources',
    hint: '↑↓ naviguer · Entrer ouvrir · Esc fermer'
  },
  onboarding: {
    title: 'Ressources qui vous sont attribuées',
    body:
      'Choisissez les kubeconfigs d’organisation et les profils VPN à synchroniser avec cet appareil.',
    syncSelected: 'Synchronisation sélectionnée sur cet appareil',
    notNow: 'Pas maintenant',
    kubeconfigs: 'Configurations Kube',
    vpnProfiles: 'Profils VPN',
    empty: 'Aucune mission pour l\'instant'
  },
  profile: {
    title: 'Profil',
    assignedClusters: 'Clusters attribués',
    assignedVpn: 'Profils VPN attribués',
    syncAssignments: 'Synchroniser les affectations',
    adminConsole: 'Console d\'administration',
    updatePassword: 'Mettre à jour le mot de passe',
    notifications: 'Notifications',
    markAllRead: 'Marquer tout comme lu',
    fullAccess: 'Accès complet',
    readOnly: 'Lecture seule',
    noClusters: 'Aucun cluster attribué pour l\'instant',
    noVpn: 'Aucun profil VPN attribué',
    noNotifications: 'Aucune notification',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmez le mot de passe'
  },
  admin: {
    title: 'Console d\'administration',
    signInRequired: 'Connexion requise',
    accessRequired: 'Accès administrateur requis',
    nav: {
      dashboard: 'Tableau de bord',
      users: 'Utilisateurs',
      teams: 'Équipes',
      kubeconfigs: 'Configurations Kube',
      vpn: 'VPN',
      permissions: 'Autorisations',
      invitations: 'Invitations',
      audit: 'Audit'
    },
    dashboard: {
      pendingInvitations: 'Invitations en attente',
      recentActions: 'Actions administratives récentes',
      users: 'Utilisateurs',
      teams: 'Équipes'
    }
  },
  chromeExtra: {
    splitScreen: 'Écran partagé',
    exitSplit: 'Quitter la vue fractionnée',
    terminal: 'Terminal',
    closePanel: 'Fermer le panneau'
  },
  resourceDetail: {
    tabs: {
      overview: 'Aperçu',
      events: 'Événements',
      yaml: 'YAML',
      portForward: 'Redirection de port',
      replicaHistory: 'Historique des répliques',
      exec: 'Exécutif',
      metrics: 'Métrique',
      pressure: 'Pression',
      pods: 'Pods'
    },
    overview: {
      title: 'Aperçu',
      status: 'Statut',
      age: 'Âge',
      namespace: 'Espace de noms'
    },
    metadata: {
      title: 'Propriété et métadonnées',
      controlledBy: 'Contrôlé par',
      labels: 'Étiquettes',
      annotations: 'Annotations',
      selector: 'Sélecteur',
      apiVersion: 'Version API'
    },
    conditions: {
      title: 'Conditions'
    },
    data: {
      secretTitle: 'Données secrètes',
      configMapTitle: 'Données ConfigMap',
      empty: 'Aucune clé de données'
    },
    actions: {
      kubectl: 'Copier Kubectl',
      copyGet: 'Kubectl obtenir',
      copyDescribe: 'Kubectl décrit',
      copyDelete: 'Kubectl supprimer',
      copyYaml: 'kubectl obtient -o yaml',
      copied: 'Commande copiée dans le presse-papiers',
      copyFailed: 'Échec de la copie',
      editYaml: 'Modifier YAML',
      delete: 'Supprimer',
      deleteTitle: 'Supprimer "{{name}}" ?',
      deleteBody: 'Cette action ne peut pas être annulée.',
      deleted: '"{{name}}" supprimé',
      deleteFailed: 'Échec de la suppression : {{error}}'
    }
  },
  podDetail: {
    loadError: 'Échec du chargement des détails du pod',
    tabs: {
      overview: 'Aperçu',
      containers: 'Conteneurs',
      metrics: 'Métrique',
      network: 'Réseau',
      logs: 'Journaux',
      exec: 'Exécutif',
      events: 'Événements',
      yaml: 'YAML'
    },
    overview: {
      title: 'Aperçu',
      status: 'Statut',
      ready: 'Prêt',
      restarts: 'Redémarre',
      age: 'Âge',
      node: 'Nœud',
      podIP: 'IP du pod',
      hostIP: 'IP de l\'hôte',
      qos: 'Classe QoS',
      serviceAccount: 'Compte de service',
      priorityClass: 'Classe prioritaire',
      restartPolicy: 'Politique de redémarrage'
    },
    metadata: {
      title: 'Propriété et métadonnées',
      controlledBy: 'Contrôlé par',
      labels: 'Étiquettes',
      annotations: 'Annotations'
    },
    conditions: {
      title: 'Conditions'
    },
    scheduling: {
      title: 'Planification',
      node: 'Nœud',
      nodeSelector: 'Sélecteur de nœud',
      tolerations: 'Tolérances',
      affinity: 'Affinité',
      none: 'Aucun'
    },
    security: {
      title: 'Sécurité',
      pod: 'Contexte de sécurité des pods',
      container: 'Contexte de sécurité des conteneurs',
      none: 'Non défini'
    },
    storage: {
      title: 'Stockage',
      volume: 'Volume',
      type: 'Taper',
      source: 'Source',
      mounts: 'Montages de volumes',
      none: 'Aucun volume'
    },
    health: {
      title: 'Bilans de santé',
      liveness: 'Vivacité',
      readiness: 'Préparation',
      startup: 'Démarrer'
    },
    containers: {
      title: 'Conteneurs',
      initTitle: 'Initier les conteneurs',
      init: 'initialisation',
      ready: 'Prêt',
      notReady: 'Pas prêt',
      restarts: '{{count}} redémarre',
      image: 'Image',
      pullPolicy: 'Politique de retrait',
      requests: 'Demandes',
      limits: 'Limites',
      message: 'Message',
      lastState: 'Dernier état',
      ports: 'Ports',
      env: 'Environnement',
      containers: 'Conteneurs'
    },
    actions: {
      kubectl: 'Copier Kubectl',
      copyGet: 'kubectl obtient -o yaml',
      copyDescribe: 'Kubectl décrit',
      copyLogs: 'journaux Kubectl',
      copyExec: 'exécutable de Kubectl',
      copyDelete: 'Kubectl supprimer',
      copied: 'Commande copiée dans le presse-papiers',
      copyFailed: 'Échec de la copie',
      restart: 'Redémarrage',
      restartTitle: 'Redémarrer « {{name}} » ?',
      restartBody: 'Le pod sera supprimé et son contrôleur le recréera.',
      restartBodyOrphan: 'Ce pod n\'a pas de contrôleur : sa suppression ne le recréera PAS. Continuer?',
      delete: 'Supprimer',
      deleteTitle: 'Supprimer "{{name}}" ?',
      deleteBody: 'Cette action ne peut pas être annulée.',
      deleted: '"{{name}}" supprimé',
      deleteFailed: 'Échec de la suppression : {{error}}'
    },
    insights: {
      crashLoop: '{{container}} plante ({{reason}}).',
      oomKilled: '{{container}} était OOMKilled — envisagez d\'augmenter sa limite de mémoire.',
      highRestarts: 'Nombre de redémarrages élevé ({{count}}) : le pod est instable.',
      notReady: 'Seuls {{ready}} conteneurs sur {{total}} sont prêts.',
      unschedulable: 'Le pod ne peut pas être planifié : {{reason}}.',
      noLiveness: '{{container}} n\'a pas de sonde d\'activité.',
      noReadiness: '{{container}} n\'a pas de sonde de préparation.',
      noLimits: '{{container}} n\'a aucune limite de CPU/mémoire définie.',
      floatingTag:
        '{{container}} utilise une balise d\'image flottante (:latest) — épinglez une version pour des déploiements reproductibles.',
      privileged: '{{container}} s\'exécute en mode privilégié – un risque pour la sécurité.',
      privilegeEscalation: '{{container}} permet l\'élévation de privilèges.',
      bestEffort: 'La qualité de service est BestEffort : ce pod est le premier à être expulsé sous pression.',
      healthy: 'Aucun problème détecté. La gousse a l\'air saine.'
    }
  }
}
