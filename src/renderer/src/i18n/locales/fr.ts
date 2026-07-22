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
    allNamespaces: 'All namespaces',
    total: 'au total',
    clusters: 'Clusters',
    vpn: 'VPN',
    favorites: 'Favoris'
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
    expandSidebar: 'Développer la barre latérale'
  },
  settings: {
    title: 'Paramètres',
    sections: {
      general: 'Général',
      updates: 'Mises à jour',
      display: 'Affichage',
      keyboard: 'Clavier',
      appearance: 'Apparence',
      about: 'À propos'
    },
    language: {
      title: 'Langue',
      hint: 'Choisissez la langue de l’application. Les contrôles Ant Design et les dates suivent ce réglage.'
    },
    general: {
      refreshTitle: 'Intervalle d’actualisation des ressources',
      refreshHint:
        'Fréquence d’actualisation automatique des listes et métriques. S’applique à chaque onglet de cluster ouvert ; la pause reste possible par vue de ressource.'
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
      tabIconsTitle: 'Icônes des onglets',
      showClusterLogos: 'Afficher les logos sur les onglets cluster',
      showResourceIcons: 'Afficher les icônes sur les onglets ressource',
      tabIconsHint:
        'Les onglets cluster utilisent le logo défini à l’ajout. Les onglets ressource utilisent les mêmes icônes que le menu de gauche.'
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
      hint: 'Cliquez sur un raccourci pour en enregistrer un nouveau. Les conflits s’échangent automatiquement. Échap annule.',
      reset: 'Réinitialiser',
      pressKeys: 'Appuyez sur les touches…',
      recordError: 'Utilisez un raccourci avec ⌘/Ctrl (ou Alt), ou Échap pour annuler',
      changeAria: 'Modifier le raccourci pour {{label}}',
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
      }
    },
    appearance: {
      intro:
        'Choisissez un préréglage ou votre propre couleur d’accent. La barre latérale, le menu des ressources et les panneaux suivent le thème actif. Utilisez le bouton de l’en-tête pour le mode clair / sombre.',
      customAccent: 'Accent personnalisé',
      customAccentHint: 'S’applique aux barres latérales, boutons, surbrillances et accents de graphiques.',
      customSwatch: 'Votre propre couleur d’accent'
    }
  },
  vpn: {
    heroEyebrow: 'Tunnel sécurisé',
    title: 'VPN',
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
      'Installez OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app ou wireguard-tools.',
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
      hint: 'En passant à cet onglet cluster, MagicLens connecte ce VPN automatiquement. Le PIN et le MFA sont mémorisés par profil pour la journée après la première connexion réussie.'
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
        body: 'Un client bureau rapide pour gérer clusters, ressources, tunnels VPN, logs et terminaux — offline-first sur votre machine.'
      },
      clusters: {
        eyebrow: 'Clusters',
        title: 'Multi-cluster, un espace de travail',
        body: 'Importez des kubeconfigs, épinglez des favoris et changez d’onglet instantanément entre vos clusters.'
      },
      split: {
        eyebrow: 'Vue partagée',
        title: 'Comparez deux clusters à la fois',
        body: 'La vue partagée garde deux onglets côte à côte — idéal staging vs production.'
      },
      search: {
        eyebrow: 'Recherche',
        title: 'Trouvez tout rapidement',
        body: 'La recherche globale ouvre clusters, namespaces et ressources d’un raccourci (⌘K / Ctrl+K — modifiable dans Réglages → Clavier).'
      },
      resources: {
        eyebrow: 'Explorateur',
        title: 'Parcourez chaque ressource',
        body: 'Workloads, Config, Network, Storage et plus — surveillance live, YAML, actions en lot et panneau de détail.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Clusters privés, vos tunnels',
        body: 'Chargez des profils OpenVPN / Pritunl / WireGuard, liez-les aux clusters et gardez plusieurs tunnels actifs.'
      },
      ops: {
        eyebrow: 'Au quotidien',
        title: 'Logs, exec et terminaux',
        body: 'Suivez et téléchargez les logs de pods, exec dans les conteneurs, ouvrez des terminaux locaux — tout dans le panneau bas.'
      },
      forward: {
        eyebrow: 'Accès',
        title: 'Port forwarding simplifié',
        body: 'Transférez un Pod ou Service vers un port local en quelques clics — la session reste visible.'
      }
    }
  }
}
