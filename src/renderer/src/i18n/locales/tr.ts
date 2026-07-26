import type { TranslationOverrides } from './en'

export const tr: TranslationOverrides = {
  common: {
    settings: 'Ayarlar',
    custom: 'Özel',
    version: 'Sürüm',
    build: 'Derleme',
    manual: 'Manuel',
    connected: 'Bağlı',
    connecting: 'Bağlanıyor…',
    disconnected: 'Bağlı değil',
    error: 'Hata',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'Tüm namespace’ler',
    selectNamespaces: 'Namespace seçin',
    namespacesSelected: '{{count}} namespace',
    total: 'toplam',
    clusters: 'Kümeler',
    vpn: 'VPN',
    favorites: 'Favoriler',
    cancel: 'İptal'
  },
  chrome: {
    searchPlaceholder: 'Küme, kaynak, namespace ara…',
    manageClusters: 'Kümeleri yönet',
    clustersMeta: '{{total}} toplam · {{connected}} bağlı',
    vpnTooltip: 'VPN profilleri (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Bağlı · {{name}}',
    vpnConnecting: 'Bağlanıyor · {{name}}',
    searchFavorites: 'Favorilerde ara',
    favoritesHint: 'Sabitlenen kümeler',
    searchWorkspaces: 'Workspace ara…',
    noWorkspaceMatch: 'Eşleşen workspace yok',
    noFavoriteClusters: 'Favori küme yok',
    collapseSidebar: 'Kenar çubuğunu daralt',
    expandSidebar: 'Kenar çubuğunu genişlet',
    fullscreen: 'Tam ekran',
    exitFullscreen: 'Tam ekrandan çık'
  },
  clustersHub: {
    title: 'Kümeler',
    subtitle: 'Tüm Kubernetes kümelerini tek yerden ekleyin, bağlanın ve yönetin.',
    add: 'Küme ekle',
    addFirst: 'İlk kümenizi ekleyin',
    statTotal: 'Toplam',
    statConnected: 'Bağlı',
    statFavorites: 'Favoriler',
    statIssues: 'Dikkat gerektiren',
    searchPlaceholder: 'Ad, context, endpoint, namespace, sürüm ile ara…',
    empty: 'Henüz küme yok. Başlamak için ilk kümenizi ekleyin.',
    noMatch: 'Arama veya filtreyle eşleşen küme yok.',
    filters: {
      all: 'Tümü',
      favorites: 'Favoriler',
      connected: 'Bağlı',
      disconnected: 'Bağlı değil',
      error: 'Hata',
      recent: 'Son açılanlar'
    }
  },
  addCluster: {
    title: 'Küme Ekle',
    detected: 'Bu makinede bulunanlar',
    rescan: 'Yeniden tara',
    scanPath: 'Taranan yol: {{path}}',
    mergeExisting: 'Listedeki tekrarları birleştir',
    mergeNone: 'Küme listesinde tekrar yok.',
    mergeDone: '{{groups}} grup birleştirildi, {{removed}} silindi.',
    modeFile: 'Kubeconfig dosyası seç',
    modePaste: 'Kubeconfig YAML yapıştır',
    modeFolder: 'Klasör tara',
    chooseFile: 'Dosya seç...',
    chooseFolder: 'Taranacak klasörü seç...',
    pastePlaceholder: 'Kubeconfig YAML buraya yapıştırın',
    parse: 'Ayrıştır',
    uniqueContexts: '{{count}} benzersiz context',
    mergedHint: '({{count}} tekrarlayan config birleştirildi)',
    alreadyInList: '{{count}} zaten listede',
    selectAllNew: 'Tüm yenileri seç',
    tagMerged: 'Birleştirildi',
    tagAlready: 'Zaten eklendi',
    matches: '"{{name}}" ile eşleşiyor',
    dupSkip: 'Atla (zaten var)',
    dupRename: 'Yeni adla ekle',
    newNamePlaceholder: 'Yeni görünen ad',
    noneToAdd: 'Eklenecek bir şey yok — tekrarlar atlandı veya seçim yok.',
    skipped: '{{count}} küme atlandı — zaten listede.',
    added: '{{count}} küme eklendi.',
    addCount: '{{count}} küme ekle',
    allAlready: 'Tespit edilen tüm context’ler zaten listede. İkinci kopya için “Yeni adla ekle”yi seçin.'
  },
  settings: {
    title: 'Ayarlar',
    subtitle: 'MagicLens tercihleri',
    navGroups: {
      preferences: 'Tercihler',
      system: 'Sistem'
    },
    sections: {
      general: 'Genel',
      updates: 'Güncellemeler',
      display: 'Görünüm',
      vpnExtensions: 'VPN Eklentileri',
      keyboard: 'Klavye',
      appearance: 'Tema',
      developer: 'Geliştirici',
      about: 'Hakkında'
    },
    sectionHints: {
      general: 'Dil, yenileme sıklığı, kubeconfig tarama yolu ve küme bakımı.',
      updates: 'MagicLens güncellemelerinin nasıl kontrol edilip kurulacağını yönetin.',
      display: 'Detayların nerede açılacağı, Terminal/YAML dock konumu ve kenar çubuğu.',
      vpnExtensions: 'VPN profilleri için OpenVPN ve WireGuard yardımcılarını kurun veya onarın.',
      keyboard: 'Genel kısayolları özelleştirin. Çakışan bağlar otomatik yer değiştirir.',
      appearance: 'Açık/koyu mod ve tüm uygulama için renk temaları.',
      developer: 'Hata ayıklama için makine özellikleri ve canlı süreç kullanımı.',
      about: 'Bu MagicLens kurulumunun sürüm ve çalışma zamanı bilgileri.'
    },
    language: {
      title: 'Dil',
      hint: 'Uygulama dilini seçin. Ant Design bileşenleri ve tarihler bu ayarı takip eder.'
    },
    general: {
      refreshTitle: 'Kaynak yenileme aralığı',
      refreshHint:
        'Kaynak listeleri ve metriklerin ne sıklıkla otomatik yenileneceği. Tüm açık küme sekmelerine uygulanır; canlı yenilemeyi kaynak görünümünde duraklatabilirsiniz.',
      kubeconfigPathTitle: 'Yerel kubeconfig yolu',
      kubeconfigPathHint:
        'Küme Ekle açıldığında MagicLens yalnızca bu dosya veya klasörü tarar. Boş bırakırsanız ~/.kube kullanılır.',
      kubeconfigPathPlaceholder: '~/.kube (varsayılan)',
      kubeconfigPickFile: 'Dosya seç',
      kubeconfigPickFolder: 'Klasör seç',
      kubeconfigReset: '~/.kube kullan',
      dedupeTitle: 'Tekrarlayan kümeler',
      dedupeHint:
        'Aynı ad/context, API sunucusu ve kimlik bilgisine sahip kümeleri tek kayda indirger. Favori ve ayarlar en uygun kayıttan korunur.',
      dedupe: 'Tekrarları birleştir',
      dedupeConfirmTitle: 'Tekrarlayan kümeler birleştirilsin mi?',
      dedupeConfirmBody:
        'Aynı ad/context, API sunucusu ve kimlik bilgisine sahip kümeler tek kayda indirgenir. Favori ve ayarlar en uygun kayıttan korunur.',
      dedupeConfirmOk: 'Birleştir',
      dedupeNone: 'Tekrarlayan küme bulunamadı.',
      dedupeDone: '{{groups}} grup birleştirildi, {{removed}} tekrar silindi. {{kept}} küme kaldı.'
    },
    updates: {
      available: 'v{{version}} mevcut',
      checkAutomatically: 'Güncellemeleri otomatik kontrol et',
      checkOnStartup: 'Açılışta kontrol et',
      includePrerelease: 'Ön sürümleri dahil et',
      macosManual:
        'Ücretli Apple Developer ID sertifikası olmadan macOS’ta otomatik indirme/kurulum kullanılamaz. Güncelleme bulununca MagicLens GitHub sürüm sayfasına yönlendirir; DMG’yi elle indirmeniz gerekir.',
      autoDownload: 'Güncellemeleri otomatik indir',
      askBeforeInstall: 'Kurmadan önce sor',
      checkNow: 'Şimdi güncelleme kontrol et',
      openCenter: 'Güncelleme Merkezini aç'
    },
    display: {
      detailsTitle: 'Kaynak ayrıntıları',
      detailsHint:
        'Bir kaynağa tıklayınca ayrıntının sağ panoda mı yoksa alt dock sekmesinde mi (Terminal ve YAML ile birlikte) açılacağını seçin.',
      placementDrawer: 'Sağ çekmece (önerilen)',
      placementRight: 'Sağ panel (bölünmüş görünüm)',
      placementBottom: 'Alt sekme',
      detailMaskBlur: 'Detay arkasını bulanıklaştır',
      detailMaskBlurHint:
        'Kaynak detay çekmecesi açıkken arkasındaki listeyi bulanıklaştırır. Varsayılan kapalıdır; tablo net kalır.',
      panelTitle: 'Terminal ve YAML paneli',
      panelHint:
        'Terminal ve YAML düzenleyici panelini çalışma alanının altına, sağına veya soluna yerleştirin. Panel araç çubuğundaki simgelerden de değiştirebilirsiniz.',
      panelPlacementBottom: 'Alt',
      panelPlacementRight: 'Sağ',
      panelPlacementLeft: 'Sol',
      nodesTitle: 'Nodes sayfa düzeni',
      nodesHint:
        'Bölümleri açıp kapatın ve sürükleyerek sıralayın. Tablo bölümü görünürken kalan alanı doldurur.',
      nodesChooser: 'Nodes sayfasında hangi bölümlerin görüneceğini seçin ve sürükleyerek sıralayın.',
      sidebarTitle: 'Kenar çubuğu',
      showFavorites: 'Favoriler bölümünü göster',
      showFavoritesHint:
        'Açıkken Favoriler, sol kenar çubuğunda Workspaces’in üstünde görünür. Başlığa tıklayarak kapatıp açabilirsiniz.',
      showWorkspaces: 'Workspaces bölümünü göster',
      showWorkspacesHint:
        'Açıkken Workspaces sol kenar çubuğunda görünür. Daraltılmış sidebar’da W işareti workspace kümelerinin üzerindedir.',
      showClusterNamespace: 'Bağlı namespace’i göster',
      showClusterNamespaceHint:
        'Açıkken, sol kenar çubuğundaki bağlı kümelerde seçili namespace bir etiket olarak gösterilir.',
      tabIconsTitle: 'Sekme simgeleri',
      showClusterLogos: 'Küme sekmelerinde logo göster',
      showResourceIcons: 'Kaynak sekmelerinde simge göster',
      tabIconsHint:
        'Küme sekmeleri, küme eklerken ayarladığınız logoyu kullanır. Kaynak sekmeleri sol menüdeki aynı simgeleri kullanır.'
    },
    nodesSections: {
      health: 'Küme sağlığı',
      resources: 'Kaynak kullanımı',
      quickInsights: 'Hızlı içgörüler',
      topConsumers: 'En çok tüketenler',
      table: 'Node tablosu',
      events: 'Olay paneli'
    },
    keyboard: {
      hint:
        'Yeni kısayol kaydetmek için bir satıra tıklayın. Çakışanlar otomatik yer değiştirir. Esc iptal eder.',
      globalTitle: 'Uygulama kısayolları',
      reset: 'Varsayılanlara dön',
      pressKeys: 'Tuşlara basın…',
      recordError: '⌘/Ctrl (veya Alt) ile bir kısayol kullanın; iptal için Esc',
      changeAria: '{{label}} kısayolunu değiştir',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        'Bir workspace’i açmak için kısayol atayın (genişletir ve kümelerini açar). Workspace düzenlerken de ayarlayabilirsiniz.',
      workspacesEmpty: 'Kısayol atamak için kenar çubuğunda bir workspace oluşturun.',
      workspaceOpenDesc: 'Workspace’i aç · {{count}} küme',
      actions: {
        globalSearch: {
          label: 'Genel arama',
          description: 'Küme / kaynak arama paletini aç veya kapat'
        },
        toggleSplitView: {
          label: 'Bölünmüş görünümü aç/kapat',
          description: 'İki küme sekmesini yan yana karşılaştır'
        },
        goToClusters: {
          label: 'Kümelere git',
          description: 'Küme listesini aç'
        },
        goToVpn: {
          label: 'VPN’e git',
          description: 'VPN profilleri sayfasını aç'
        },
        toggleSidebar: {
          label: 'Kenar çubuğunu aç/kapat',
          description: 'Sol kenar çubuğunu daralt veya genişlet'
        },
        openSettings: {
          label: 'Ayarları aç',
          description: 'Ayarlar penceresini aç'
        }
      }
    },
    appearance: {
      intro:
        'Bir hazır tema seçin veya kendi vurgu renginizi belirleyin. Kenar çubuğu, kaynak menüsü ve paneller aktif temayı izler.',
      modeTitle: 'Renk modu',
      modeHint: 'Açık, koyu veya sistem görünümünü takip et.',
      groupClassic: 'Klasik',
      groupWorlds: 'Dünyalar — anime & kahramanlar',
      customAccent: 'Özel vurgu',
      customAccentHint: 'Kenar çubukları, düğmeler, vurgular ve grafik tonlarına uygulanır.',
      customSwatch: 'Kendi vurgu rengin'
    },
    developer: {
      hostTitle: 'Bilgisayar özellikleri',
      hostHint: 'Bu makinenin donanım ve işletim sistemi bilgileri (bölümü açınca bir kez yüklenir).',
      hostHostname: 'Ana makine adı',
      hostOs: 'İşletim sistemi',
      hostCpu: 'CPU',
      hostCores: '{{count}} çekirdek',
      hostCpuSpeed: '{{mhz}} MHz',
      hostMemory: 'Bellek',
      hostMemoryValue: '{{free}} boş / {{total}}',
      hostDisplay: 'Ana ekran',
      hostDisplayValue: '{{width}}×{{height}} @ {{scale}}×',
      hostRuntime: 'Çalışma zamanı',
      hostApiMissing: 'Bilgisayar bilgisi API’si yok. Geliştirici araçları için MagicLens’i yeniden başlatın.',
      liveTitle: 'Anlık uygulama kullanımı',
      liveHint:
        'MagicLens CPU ve belleğini sürekli okur (main, GPU, renderer, yardımcılar). Değerler aşağıdaki aralıkta yenilenir.',
      pollLabel: 'Yenileme aralığı',
      cpuTotal: 'CPU (tüm süreçler)',
      memTotal: 'Bellek (working set)',
      mainHeap: 'Main V8 heap',
      heapOf: 'ayrılan {{total}}',
      systemMem: 'Sistem belleği',
      systemMemValue: '{{free}} boş / {{total}}',
      processes: '{{count}} süreç',
      noSamples: 'İlk örnek bekleniyor…',
      sampleFailed: 'Süreç metrikleri okunamadı.',
      apiMissing: 'Süreç metrikleri API’si yok. Geliştirici araçları için MagicLens’i yeniden başlatın.',
      colType: 'Tür',
      colName: 'Ad',
      colCpu: 'CPU',
      colMem: 'Bellek',
      controlsTitle: 'Performans kontrolleri',
      controlsHint: 'Canlı kaynak yenilemesini ayarlayın; bellek yükselince renderer önbelleğini temizleyin.',
      liveRefresh: 'Canlı kaynak yenileme',
      pauseRefresh: 'Yenilemeyi duraklat',
      resumeRefresh: 'Yenilemeyi sürdür',
      clearCache: 'Renderer önbelleğini temizle',
      cacheCleared: 'Renderer önbelleği temizlendi',
      openDevTools: 'DevTools aç'
    },
    about: {
      platform: 'Platform',
      appTitle: 'MagicLens',
      appHint: 'Masaüstü Kubernetes istemcisi — bu kurulumun sürüm ve çalışma zamanı bilgileri.'
    },
    vpnExtensions: {
      intro:
        'PIN + MFA tünelleri için MagicLens’in ihtiyaç duyduğu VPN CLI araçlarını kurun ve doğrulayın. OpenVPN Connect desteklenmez.',
      platformLabel: 'Algılanan platform: {{platform}}',
      platformHint: {
        darwin:
          'macOS’ta OpenVPN / WireGuard CLI için Homebrew kullanılır. Tunnelblick ve WireGuard.app isteğe bağlı yedeklerdir.',
        win32:
          'Windows’ta OpenVPN Community CLI ve WireGuard winget ile kurulur (yedek: Chocolatey/Scoop). OpenVPN Connect kullanmayın.',
        linux:
          'Linux’ta önce dağıtım paketleri (apt/dnf/pacman/zypper) tercih edilir. Olmazsa Homebrew’a düşülür.',
        other: 'Bu platformda otomatik kurulum sınırlı olabilir. Aşağıdaki manuel komutları kullanın.'
      },
      statusTitle: 'Algılanan araçlar',
      ready: 'hazır',
      missing: 'eksik',
      rescan: 'Araçları yeniden tara',
      installTitle: 'MagicLens ile kur',
      installHint: 'Şifre / UAC onayı istenebilir. Kurulum birkaç dakika sürebilir.',
      installOpenVpn: 'OpenVPN CLI kur',
      installWireGuard: 'WireGuard kur',
      installSuccess: '{{tool}} başarıyla kuruldu',
      installFailed: 'Kurulum başarısız',
      packagesTitle: 'Paketler / komutlar',
      packagesHint: 'Elle kurmak için bu komutları terminale kopyalayın.',
      copyCmd: 'Kopyala',
      copied: 'Panoya kopyalandı',
      copyFailed: 'Kopyalama başarısız',
      manualTitle: 'Manuel kurulum adımları',
      manual: {
        darwin: [
          'Yoksa https://brew.sh adresinden Homebrew kurun.',
          'Çalıştırın: brew install openvpn',
          'İsteğe bağlı: brew install wireguard-tools',
          'İsteğe bağlı GUI: brew install --cask tunnelblick veya WireGuard.app',
          'MagicLens’i kapatıp açın, ardından PIN + MFA ile tekrar bağlanın.'
        ],
        win32: [
          'PowerShell veya Terminal açın.',
          'Community OpenVPN kurun (Connect değil): winget install -e --id OpenVPNTechnologies.OpenVPN',
          'WireGuard kurun: winget install -e --id WireGuard.WireGuard',
          'Alternatif: choco install openvpn -y  /  choco install wireguard -y',
          'openvpn.exe’nin Program Files\\OpenVPN\\bin altında bulunması için MagicLens’i yeniden başlatın.'
        ],
        linux: [
          'Debian/Ubuntu: sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL: sudo dnf install -y openvpn wireguard-tools',
          'Arch: sudo pacman -Sy openvpn wireguard-tools',
          'Veya Homebrew kurup: brew install openvpn wireguard-tools',
          'MagicLens’i yeniden başlatın, ardından PIN + MFA ile bağlanın.'
        ],
        other: [
          'İşletim sisteminiz için OpenVPN community CLI kurun.',
          'WireGuard profilleri kullanıyorsanız wg-quick araçlarını kurun.',
          'MagicLens’i yeniden başlatıp bağlantıyı deneyin.'
        ]
      },
      connectNote:
        'Araçlar hazır olduktan sonra VPN sayfasına dönüp bağlanın. Araçlar yoksa MagicLens bağlanırken de otomatik kurmayı dener.'
    }
  },
  vpn: {
    heroEyebrow: 'Güvenli tünel',
    title: 'VPN',
    status: {
      connected: 'Bağlı',
      connecting: 'Bağlanıyor',
      error: 'Hata',
      disconnected: 'Bağlı değil'
    },
    tunnelsUp: '{{count}} tünel açık',
    noActiveProfile: 'Aktif profil yok',
    disconnect: 'Bağlantıyı kes',
    connect: 'Bağlan',
    edit: 'Düzenle',
    disconnectedToast: 'Bağlantı kesildi',
    connectedToast: 'Bağlandı',
    openedExternalToast: 'Sistem VPN uygulamasında açıldı',
    connectFailed: 'Bağlantı başarısız',
    removedToast: 'Kaldırıldı',
    noToolsTitle: 'VPN aracı bulunamadı',
    noToolsDesc:
      'PIN + MFA için OpenVPN Community CLI (veya WireGuard araçları) gerekir. Paketleri kurmak için Ayarlar → VPN Eklentileri’ne gidin veya manuel adımları izleyin. OpenVPN Connect desteklenmez.',
    openVpnExtensions: 'VPN Eklentileri',
    connectHelpTitle: 'Bağlanılamadı',
    connectHelpDesc:
      'Araçlar eksikse veya kurulum başarısız olduysa OpenVPN / WireGuard kurmak ve işletim sisteminize özel adımları görmek için VPN Eklentileri’ni açın.',
    profilesTitle: 'VPN profilleri',
    addToStart: 'Başlamak için bir yapılandırma ekleyin',
    filteredCount: '{{filtered}} / {{total}}',
    searchPlaceholder: 'Profillerde ara…',
    addFile: 'Dosya ekle',
    paste: 'Yapıştır',
    refresh: 'Yenile',
    emptyDesc: '.ovpn veya WireGuard .conf ekleyin',
    chooseFile: 'Dosya seç',
    noMatch: '“{{query}}” ile eşleşen profil yok',
    live: 'Canlı',
    usernameNotSet: 'Kullanıcı adı ayarlı değil',
    noServerSet: 'Sunucu ayarlı değil',
    moreActions: 'Diğer işlemler',
    menu: {
      editProfile: 'Profili düzenle',
      revealFile: 'Dosyayı göster',
      openExternally: 'Harici aç',
      delete: 'Sil'
    },
    draft: {
      editTitle: 'VPN profilini düzenle',
      reviewTitle: 'VPN profilini gözden geçir',
      correctFields: 'Otomatik algılanan alanları düzeltin',
      correctFieldsDesc:
        'Kullanıcı adı / organizasyon / sunucu .ovpn dosyasından okunur ve çoğu zaman yanlıştır — kaydetmeden önce düzenleyin.',
      name: 'Ad',
      provider: 'Sağlayıcı',
      username: 'Kullanıcı adı',
      usernameRequired: 'VPN kullanıcı adını girin',
      organization: 'Organizasyon',
      organizationPlaceholder: 'Organizasyon adı',
      serverName: 'Sunucu adı',
      serverHost: 'Sunucu adresi',
      protocol: 'Protokol',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: 'Değişiklikleri kaydet',
      saveProfile: 'Profili kaydet',
      updated: 'Profil güncellendi',
      updateFailed: 'Güncelleme başarısız',
      missingConfig: 'Yapılandırma eksik',
      added: 'VPN profili eklendi',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: 'Otomatik algıla'
      }
    },
    auth: {
      title: 'Bağlan · {{name}}',
      pinMfaOnly: 'Yalnızca PIN + MFA',
      pinMfaDesc: 'Kullanıcı adı / sunucu / organizasyon profilden gelir. Yanlışsa Düzenle’yi kullanın.',
      user: 'Kullanıcı:',
      server: 'Sunucu:',
      organization: 'Organizasyon:',
      notSetEdit: 'ayarlı değil — profili düzenleyin',
      setUsernameFirst: 'Önce Düzenle ile kullanıcı adı ayarlayın veya aşağıya girin',
      pin: 'PIN',
      pinRequired: 'PIN’inizi girin',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP kodu',
      mfaRequired: 'MFA/OTP kodunuzu girin',
      mfaPlaceholder: '6 haneli kod',
      editFields: 'Profil alanlarını düzenle'
    },
    pasteModal: {
      title: 'VPN yapılandırmasını yapıştır',
      namePlaceholder: 'Ofis VPN',
      config: 'Yapılandırma',
      configPlaceholder: '.ovpn veya WireGuard yapılandırmasını yapıştırın',
      continue: 'Devam — alanları gözden geçir'
    },
    panel: {
      connectionStatus: 'Bağlantı durumu',
      healthyTunnel: 'Sağlıklı tünel',
      verifying: 'Bağlı — doğrulanıyor',
      connecting: 'Bağlanıyor…',
      error: 'Hata',
      disconnected: 'Bağlı değil',
      tunnel: 'VPN tüneli',
      opening: 'açılıyor…',
      server: 'VPN sunucusu',
      privateNetwork: 'Özel ağ',
      clusterEndpoints: 'küme uç noktaları',
      local: 'yerel',
      download: 'İndirme',
      upload: 'Yükleme',
      total: 'Toplam {{size}}',
      checkProcess: 'VPN süreci çalışıyor',
      checkInterface: 'IP’li tünel arayüzü',
      checkTraffic: 'Trafik akıyor',
      falsePositive:
        'Bağlı görünüyor ama henüz tünel IP’si yok — rota kurulana kadar özel kümeler zaman aşımına düşer.',
      providerLine: 'Sağlayıcı: {{provider}}',
      connectedAgo: '{{uptime}} önce bağlandı',
      connectionFailed: 'Bağlantı başarısız'
    },
    session: {
      titleForCluster: '{{cluster}} için VPN',
      titleConnect: 'VPN bağlan · {{name}}',
      alertTitle: 'VPN oturumu',
      pinKnownDesc:
        'PIN yaklaşık 5 saat hatırlanır. Tüneli açmak için yeni bir MFA kodu girin. Bağlandıktan sonra tünel açıkken küme değişiminde tekrar sorulmaz.',
      pinUnknownDesc:
        'Her VPN için bir kez kimlik doğrulayın. MagicLens tünelleri açık tutar (Pritunl gibi); yaklaşık 5 saat küme değişiminde yeniden giriş gerekmez.',
      profile: 'Profil:',
      user: 'Kullanıcı:',
      pin: 'PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6 haneli kod',
      connectContinue: 'Bağlan ve devam et'
    },
    badge: {
      missing: 'VPN eksik',
      missingTooltip: 'Bağlı VPN profili bulunamadı — Küme Düzenle’den yeniden atayın',
      connected: 'VPN bağlı · {{name}}',
      connecting: 'VPN bağlanıyor · {{name}}',
      autoConnect: 'Otomatik bağlan · {{name}}'
    },
    clusterLink: {
      title: 'VPN profili (otomatik bağlan)',
      placeholder: 'VPN yok — elle bağlan',
      empty: 'Önce VPN sayfasından bir profil ekleyin',
      hint:
        'Bu küme sekmesine geçince MagicLens bu VPN’e otomatik bağlanır. PIN ve MFA, ilk başarılı bağlantıdan sonra gün boyu profil bazında hatırlanır.'
    }
  },
  tour: {
    skip: 'Atla',
    back: 'Geri',
    next: 'İleri',
    getStarted: 'Başla',
    continue: 'Devam',
    chooseLanguage: 'Dilinizi seçin',
    languageHint:
      'Bunu istediğiniz zaman Ayarlar’dan değiştirebilirsiniz. Özellik kartları seçtiğiniz dilde açılır.',
    slidesAria: 'Özellik slaytları',
    slides: {
      welcome: {
        eyebrow: 'Hoş geldiniz',
        title: 'Kubernetes için MagicLens',
        body:
          'Kümeleri, kaynakları, VPN tünellerini, logları ve terminalleri tek yerden yöneten hızlı bir masaüstü istemcisi — makinenizde offline-first.'
      },
      clusters: {
        eyebrow: 'Kümeler',
        title: 'Çoklu küme, tek çalışma alanı',
        body:
          'Kubeconfig içe aktarın, favorilere sabitleyin ve çalıştığınız her küme arasında anında sekme değiştirin.'
      },
      split: {
        eyebrow: 'Bölünmüş görünüm',
        title: 'İki kümeyi aynı anda karşılaştırın',
        body:
          'İki küme sekmesini yan yana tutmak için bölünmüş görünümü açın — staging vs production veya aynı kaynağı ortamlar arasında kontrol etmek için ideal.'
      },
      search: {
        eyebrow: 'Arama',
        title: 'Her şeyi hızlı bulun',
        body:
          'Global arama tek kısayolla kümelere, namespace’lere ve kaynaklara atlar (varsayılan ⌘K / Ctrl+K — Ayarlar → Klavye’den değiştirebilirsiniz).'
      },
      resources: {
        eyebrow: 'Gezgin',
        title: 'Her kaynağa göz atın',
        body:
          'Workload, Config, Network, Storage ve daha fazlası — canlı izleme, YAML düzenleme, toplu işlemler ve odaklı detay paneli.'
      },
      topology: {
        eyebrow: 'Topoloji',
        title: 'Uygulamaların nasıl bağlandığını görün',
        body:
          'Deployment, Service ve Ingress’i tek grafikte haritalayın — sağlıksız pod’ları tespit edin, detaya inin ve uygulamalardan canlı bağımlılık haritasına geçin.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Özel kümeler, sizin tünelleriniz',
        body:
          'OpenVPN / Pritunl / WireGuard profilleri yükleyin, kümelere bağlayın ve sekmeler arasında geçerken birden fazla tüneli açık tutun.'
      },
      ops: {
        eyebrow: 'Günlük iş',
        title: 'Log, exec ve terminaller',
        body:
          'Pod loglarını izleyin ve indirin, container’lara exec yapın, yerel terminaller açın — hepsi alt panelde elinizin altında.'
      },
      forward: {
        eyebrow: 'Erişim',
        title: 'Port yönlendirme kolay',
        body:
          'Bir Pod veya Service’i birkaç tıkla yerel porta yönlendirin — MagicLens oturumu çalışırken görünür tutar.'
      }
    }
  },
  workspaces: {
    title: 'Workspaces',
    sectionHint: 'Gruplanmış kümeler',
    compactMark: 'W',
    compactTooltip: 'Workspaces',
    new: 'Yeni workspace',
    newTooltip: 'Yeni workspace',
    edit: 'Workspace düzenle',
    delete: 'Workspace sil',
    empty: 'Kümeleri workspace’lerde gruplayın',
    noClusters: 'Henüz küme yok — eklemek için workspace’i düzenleyin.',
    defaultName: 'Workspace',
    name: 'Ad',
    logo: 'Logo',
    changeLogo: 'Logo değiştir',
    removeLogo: 'Kaldır',
    clusters: 'Kümeler',
    selectClusters: 'Bu workspace için küme seçin',
    shortcut: 'Klavye kısayolu',
    shortcutHint: 'Bu workspace’i ve kümelerini açar. ⌘/Ctrl (veya Alt) ile bir tuş kullanın.',
    shortcutAssign: 'Kısayol ata',
    shortcutListening: 'Tuşlara basın…',
    shortcutClear: 'Temizle',
    shortcutNone: 'Yok',
    shortcutRecordError: '⌘/Ctrl (veya Alt) ile bir kısayol kullanın; iptal için Esc',
    save: 'Kaydet',
    created: 'Workspace oluşturuldu',
    updated: 'Workspace güncellendi'
  },
  resourceNav: {
    sections: {
      overview: 'Genel bakış',
      workloads: 'İş yükleri',
      config: 'Yapılandırma',
      network: 'Ağ',
      storage: 'Depolama',
      helm: 'Helm',
      "access-control": 'Erişim kontrolü',
      "custom-resources": 'Özel kaynaklar'
    },
    virtual: {
      clusterOverview: 'Cluster',
      applications: 'Uygulamalar',
      workloadsOverview: 'Genel bakış',
      configOverview: 'Genel bakış',
      topology: 'Topoloji',
      portForwarding: 'Port yönlendirme',
      helmCharts: 'Chart’lar',
      helmReleases: 'Release’ler',
      operatorResources: 'Yüklü CRD’ler',
      dynamicCustomResources: 'Dinamik kaynaklar',
      definitions: 'Tanımlar'
    },
    search: 'Kaynaklarda ara',
    favorites: 'Favoriler',
    addFavorite: 'Favorilere ekle',
    removeFavorite: 'Favorilerden kaldır',
    pin: 'Sekmelere sabitle',
    unpin: 'Sekmelerden kaldır',
    pinned: 'Sekmelere sabitlendi',
    emptyFavorites: 'Favori eklemek için bir kaynağa sağ tıklayın.',
    aria: 'Kaynaklar'
  },
  nodesOverview: {
    tableTitle: 'Nodes',
    tableCount: '{{count}} toplam',
    emptyTitle: 'Node bulunamadı',
    emptyHint: 'Cluster’da kayıtlı node yok veya arama filtresi tüm sonuçları dışladı.',
    hiddenTitle: 'Nodes paneli gizli',
    hiddenHint: 'Ayarlar → Görünüm → Nodes sayfa düzeninden bölümleri açın.',
    hotspots: 'Hotspot’lar',
    hotspotsCount: '{{count}} içgörü',
    topConsumers: 'En çok tüketenler'
  },
  metricsCharts: {
    networkReceive: 'Ağ alımı',
    networkTransmit: 'Ağ gönderimi',
    containerDisk: 'Konteyner disk kullanımı',
    restarts: 'Yeniden başlatma sayısı',
    nodeDisks: 'Node diskleri',
    nodeDisksUnavailable:
      'Node disk metrikleri yok (Prometheus + node-exporter: node_filesystem_* gerekir).',
    podVolumes: 'Kalıcı volume’lar',
    podVolumesUnavailable:
      'PVC kullanım metrikleri yok (Prometheus kubelet volume stats + kube-state-metrics gerekir).',
    filesystemPercent: 'Disk doluluk oranı (zaman)',
    filesystemUsed: 'Disk kullanımı (zaman)',
    volumePercent: 'Volume doluluk oranı (zaman)',
    volumeUsed: 'Volume kullanımı (zaman)'
  },
  clusterOverview: {
    title: 'Cluster genel bakış',
    subtitle: 'Cluster genelinde sağlık, kapasite ve son aktivite.',
    metricsUnavailable: 'metrics-server yok — kullanım verileri eksik olabilir',
    nodes: 'Nodes',
    nodesHint: '{{ready}} hazır · {{notReady}} hazır değil',
    pods: 'Podlar',
    podsHint: '{{running}} çalışıyor · {{pending}} bekliyor · {{failed}} başarısız',
    namespaces: 'Namespace’ler',
    deployments: 'Deployment’lar',
    services: 'Servisler',
    problemPods: 'Sorunlu podlar',
    resources: 'Kaynak kullanımı',
    cpuCapacity: 'CPU kapasitesi',
    memCapacity: 'Bellek kapasitesi',
    cpuAlloc: 'CPU allocatable',
    memAlloc: 'Bellek allocatable',
    recentEvents: 'Son olaylar'
  },
  workloadsOverview: {
    title: 'Workload genel bakış',
    subtitle: 'Namespace’lere göre sayılar, sağlık ve sorunlu workload’lar.',
    healthy: 'Sağlıklı',
    unhealthy: 'Sorunlu',
    byNamespace: 'Namespace’e göre',
    empty: 'Workload bulunamadı',
    problems: 'Sorunlu workload’lar',
    noProblems: 'Sorunlu workload yok',
    highRestarts: 'Yüksek restart podlar',
    noRestarts: 'Yüksek restart’lı pod yok',
    restarts: '{{count}} restart'
  },
  applicationsOverview: {
    title: 'Uygulamalar',
    subtitle: 'Seçili namespace’te label’lardan gruplanan uygulamalar.',
    pickNamespace: 'Namespace',
    search: 'Uygulama ara…',
    needNamespace: 'Namespace seçin',
    needNamespaceHint: 'Uygulama gruplaması için namespace gerekir.',
    error: 'Uygulamalar yüklenemedi',
    total: 'Uygulamalar',
    apps: 'Uygulamalar',
    empty: 'Bu namespace’te uygulama yok',
    replicas: 'Replica',
    errors: 'Hata',
    resources: 'Kaynak'
  },
  configOverview: {
    title: 'Config genel bakış',
    subtitle: 'ConfigMap, Secret, kota, autoscaling ve admission webhook’lar.',
    highlights: 'Öne çıkanlar',
    configMaps: 'ConfigMap’ler',
    secrets: 'Secret’lar',
    tlsSecrets: 'TLS secret’lar',
    hpas: 'HPA’lar',
    pdbs: 'PDB’ler',
    webhooks: 'Webhook’lar',
    quotas: 'Resource quota’lar',
    noQuotas: 'Resource quota yok',
    quotaWarnings: '{{count}} kota sınırlı görünüyor',
    hpaList: 'Horizontal Pod Autoscaler’lar',
    noHpas: 'HPA tanımlı değil'
  },
  topology: {
    title: 'Topoloji ve Uygulamalar',
    subtitle: 'Bu namespace’teki iş yükleri, servisler ve bağımlılıkların canlı haritası.',
    modes: {
      graph: 'Topoloji',
      apps: 'Uygulamalar',
      resources: 'Kaynaklar'
    },
    refresh: 'Yenile',
    empty: 'Bu namespace’te haritalanacak kaynak yok.',
    loading: 'Topoloji oluşturuluyor…',
    error: 'Topoloji yüklenemedi',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    fitView: 'Görünüme sığdır',
    openWindow: 'Pencerede aç',
    openWindowMissingCluster: 'Topoloji penceresi için küme seçili değil',
    pickNamespace: 'Topoloji haritası için bir namespace seçin',
    pickNamespaceHint: 'Topoloji tek bir namespace ister. Üstteki namespace seçiciden bir tane seçin.',
    graphCrash: 'Graf çizilemedi. Yenileyin veya başka bir namespace seçin.',
    live: 'Canlı',
    updating: 'Güncelleniyor…',
    search: 'Kaynaklarda ara…',
    filterNamespace: 'Namespace',
    filterKind: 'Tür',
    filterHealth: 'Sağlık',
    filterAll: 'Tümü',
    sortName: 'Ad',
    sortKind: 'Tür',
    sortHealth: 'Sağlık',
    insights: 'İçgörüler',
    noInsights: 'Sorun tespit edilmedi.',
    health: {
      healthy: 'Sağlıklı',
      degraded: 'Bozulmuş',
      error: 'Hata',
      unknown: 'Bilinmiyor'
    },
    relation: {
      owns: 'sahip',
      selects: 'seçer',
      routes: 'yönlendirir',
      mounts: 'bağlar',
      dependsOn: 'bağımlı'
    },
    apps: {
      replicas: 'Replica',
      uptime: 'Yaş',
      errors: 'Hata',
      search: 'Uygulama ara…',
      noMatch: 'Aramanızla eşleşen uygulama yok.',
      empty: 'Uygulama bulunamadı. Workload’lara app.kubernetes.io/name etiketi ekleyin.'
    },
    drawer: {
      overview: 'Genel bakış',
      yaml: 'YAML',
      events: 'Olaylar',
      logs: 'Loglar',
      metrics: 'Metrikler',
      actions: 'İşlemler',
      restart: 'Yeniden başlat',
      scale: 'Ölçekle',
      delete: 'Sil',
      editYaml: 'YAML düzenle',
      close: 'Kapat'
    },
    edge: {
      ports: 'Portlar',
      protocol: 'Protokol',
      rate: '{{rate}} istek/sn'
    },
    insightItems: {
      crashloopTitle: 'CrashLoopBackOff: {{name}}',
      crashloopDetail: 'Pod sürekli yeniden başlıyor',
      serviceEmptyTitle: 'Service endpoint yok: {{name}}',
      serviceEmptyDetail: 'Selector bu namespace’te hiçbir pod ile eşleşmiyor.',
      ingressOrphanTitle: 'Ingress backend yok: {{name}}',
      ingressOrphanDetail: 'HTTP path veya varsayılan backend tanımlı değil.',
      brokenRouteTitle: 'Bozuk Ingress bağımlılığı',
      brokenRouteDetail: 'Rota eksik servise işaret ediyor ({{target}}).',
      zeroReadyTitle: 'Hazır replica yok: {{name}}',
      zeroReadyDetail: '{{ready}}/{{desired}} hazır'
    }
  },
  resourceDetail: {
    tabs: {
      overview: 'Genel',
      events: 'Olaylar',
      yaml: 'YAML',
      portForward: 'Port Forward',
      replicaHistory: 'Replica geçmişi',
      exec: 'Terminal',
      metrics: 'Metrikler',
      pressure: 'Basınç'
    },
    overview: {
      title: 'Genel bakış',
      status: 'Durum',
      age: 'Yaş',
      namespace: 'Namespace'
    },
    metadata: {
      title: 'Sahiplik & metadata',
      controlledBy: 'Kontrol eden',
      labels: 'Etiketler',
      annotations: 'Notlar (annotations)',
      selector: 'Selector',
      apiVersion: 'API sürümü'
    },
    conditions: {
      title: 'Koşullar'
    },
    data: {
      secretTitle: 'Secret verisi',
      configMapTitle: 'ConfigMap verisi',
      empty: 'Veri anahtarı yok'
    },
    actions: {
      kubectl: 'kubectl kopyala',
      copyGet: 'kubectl get',
      copyDescribe: 'kubectl describe',
      copyDelete: 'kubectl delete',
      copyYaml: 'kubectl get -o yaml',
      copied: 'Komut panoya kopyalandı',
      copyFailed: 'Kopyalama başarısız',
      editYaml: 'YAML düzenle',
      delete: 'Sil',
      deleteTitle: '"{{name}}" silinsin mi?',
      deleteBody: 'Bu işlem geri alınamaz.',
      deleted: '"{{name}}" silindi',
      deleteFailed: 'Silme başarısız: {{error}}'
    }
  },
  podDetail: {
    loadError: 'Pod detayları yüklenemedi',
    tabs: {
      overview: 'Genel',
      containers: 'Konteynerler',
      metrics: 'Metrikler',
      network: 'Ağ',
      logs: 'Loglar',
      exec: 'Terminal',
      events: 'Olaylar',
      yaml: 'YAML'
    },
    overview: {
      title: 'Genel bakış',
      status: 'Durum',
      ready: 'Hazır',
      restarts: 'Yeniden başlatma',
      age: 'Yaş',
      node: 'Node',
      podIP: 'Pod IP',
      hostIP: 'Host IP',
      qos: 'QoS sınıfı',
      serviceAccount: 'Service account',
      priorityClass: 'Öncelik sınıfı',
      restartPolicy: 'Yeniden başlatma politikası'
    },
    metadata: {
      title: 'Sahiplik & metadata',
      controlledBy: 'Kontrol eden',
      labels: 'Etiketler',
      annotations: 'Notlar (annotations)'
    },
    conditions: {
      title: 'Koşullar'
    },
    scheduling: {
      title: 'Zamanlama',
      node: 'Node',
      nodeSelector: 'Node selector',
      tolerations: 'Tolerations',
      affinity: 'Affinity',
      none: 'Yok'
    },
    security: {
      title: 'Güvenlik',
      pod: 'Pod security context',
      container: 'Konteyner security context',
      none: 'Tanımlı değil'
    },
    storage: {
      title: 'Depolama',
      volume: 'Volume',
      type: 'Tür',
      source: 'Kaynak',
      mounts: 'Volume mount’ları',
      none: 'Volume yok',
      usage: 'Kullanım',
      capacity: 'Kapasite'
    },
    health: {
      title: 'Sağlık kontrolleri',
      liveness: 'Liveness',
      readiness: 'Readiness',
      startup: 'Startup'
    },
    containers: {
      title: 'Konteynerler',
      initTitle: 'Init konteynerler',
      init: 'init',
      ready: 'Hazır',
      notReady: 'Hazır değil',
      restarts: '{{count}} yeniden başlatma',
      image: 'İmaj',
      pullPolicy: 'Pull politikası',
      requests: 'Requests',
      limits: 'Limits',
      message: 'Mesaj',
      lastState: 'Son durum',
      ports: 'Portlar',
      env: 'Ortam değişkenleri',
      containers: 'Konteynerler'
    },
    actions: {
      kubectl: 'kubectl kopyala',
      copyGet: 'kubectl get -o yaml',
      copyDescribe: 'kubectl describe',
      copyLogs: 'kubectl logs',
      copyExec: 'kubectl exec',
      copyDelete: 'kubectl delete',
      copied: 'Komut panoya kopyalandı',
      copyFailed: 'Kopyalama başarısız',
      restart: 'Yeniden başlat',
      restartTitle: '"{{name}}" yeniden başlatılsın mı?',
      restartBody: 'Pod silinecek ve controller’ı tarafından yeniden oluşturulacak.',
      restartBodyOrphan: 'Bu pod’un bir controller’ı yok — silmek onu yeniden oluşturmaz. Devam edilsin mi?',
      delete: 'Sil',
      deleteTitle: '"{{name}}" silinsin mi?',
      deleteBody: 'Bu işlem geri alınamaz.',
      deleted: '"{{name}}" silindi',
      deleteFailed: 'Silme başarısız: {{error}}'
    },
    insights: {
      crashLoop: '{{container}} çökülüyor ({{reason}}).',
      oomKilled: '{{container}} OOMKilled oldu — bellek limitini artırmayı değerlendirin.',
      highRestarts: 'Yüksek yeniden başlatma sayısı ({{count}}) — pod kararsız.',
      notReady: '{{total}} konteynerden yalnızca {{ready}} tanesi hazır.',
      unschedulable: 'Pod zamanlanamıyor: {{reason}}.',
      noLiveness: '{{container}} için liveness probe tanımlı değil.',
      noReadiness: '{{container}} için readiness probe tanımlı değil.',
      noLimits: '{{container}} için CPU/bellek limiti tanımlı değil.',
      floatingTag:
        '{{container}} sabit olmayan imaj etiketi (:latest) kullanıyor — tekrarlanabilir dağıtım için sürüm sabitleyin.',
      privileged: '{{container}} privileged modda çalışıyor — güvenlik riski.',
      privilegeEscalation: '{{container}} privilege escalation’a izin veriyor.',
      bestEffort: 'QoS BestEffort — baskı altında ilk tahliye edilecek pod budur.',
      healthy: 'Sorun tespit edilmedi. Pod sağlıklı görünüyor.'
    }
  },
  clusterActions: {
    open: 'Aç',
    disconnect: 'Bağlantıyı kes',
    removeFavorite: 'Favorilerden kaldır',
    addFavorite: 'Favorilere ekle',
    removeCluster: 'Kümeyi kaldır',
    edit: 'Düzenle',
    testConnection: 'Bağlantıyı test et',
    openDashboard: 'Panoyu aç',
    removeConfirm: 'Bu küme kaldırılsın mı?',
    namespacesCount: '{{count}} namespace',
    lastOpened: 'Son açılış',
    splitScreen: 'Bölünmüş ekran',
    exitSplit: 'Bölünmüş görünümden çık'
  },
  clusterSettings: {
    nav: {
      appearance: 'Görünüm',
      general: 'Genel',
      proxy: 'Proxy',
      terminal: 'Terminal',
      namespaces: 'Namespace’ler',
      metrics: 'Metrikler',
      lensMetrics: 'Lens Metrics',
      nodeShell: 'Node Shell',
      security: 'Güvenlik',
      network: 'Ağ',
      storage: 'Depolama',
      integrations: 'Entegrasyonlar',
      performance: 'Performans',
      ui: 'Arayüz',
      debug: 'Debug / Gelişmiş'
    },
    general: {
      infoTitle: 'Küme kimliği',
      infoHint: 'Aktif kubeconfig context’inden salt okunur bağlantı bilgileri.',
      context: 'Kubeconfig context',
      endpoint: 'API sunucusu',
      version: 'Kubernetes sürümü',
      clusterId: 'Küme ID',
      status: 'Bağlantı durumu',
      lastOpened: 'Son açılış',
      metaTitle: 'Etiketler ve ortam',
      environment: 'Ortam',
      environmentHint: 'Bu küme için dev / staging / prod etiketi.',
      tags: 'Etiketler',
      tagsHint: 'Eklemek için Enter’a basın.',
      tagsPlaceholder: 'prod, eu-west…',
      notes: 'Notlar'
    },
    proxy: {
      title: 'HTTP / HTTPS proxy',
      hint: 'API trafiği için isteğe bağlı çıkış proxy’si. VPN profil bağlantısı aşağıda.',
      noProxyHint: 'Proxy’yi atlayan host’lar (virgülle).',
      username: 'Kullanıcı adı',
      password: 'Şifre',
      failover: 'Yedekleme (failover)',
      failoverHint: 'Birincil proxy başarısız olunca alternatif dene.'
    },
    terminal: {
      title: 'Terminal varsayılanları',
      hint: 'Bu küme için yerel terminal açılırken uygulanır.',
      shell: 'Varsayılan shell',
      cwd: 'Çalışma dizini',
      cwdCustom: 'Özel yol',
      cwdPath: 'Özel dizin',
      defaultNs: 'Varsayılan namespace',
      syncContext: 'kubectl context senkronu',
      syncContextHint: 'Terminal açılınca KUBECONFIG / context ayarla.',
      history: 'Komut geçmişini tut',
      autoComplete: 'Otomatik tamamlama',
      rbac: 'RBAC doğrulama ipuçları',
      multiTab: 'Çoklu sekme',
      env: 'Ek ortam değişkenleri',
      envHint: 'Her satıra bir KEY=value.'
    },
    namespaces: {
      title: 'Namespace’ler',
      hint: 'Namespace seçici için varsayılanlar ve filtreler.',
      accessible: 'Erişilebilir namespace’ler',
      default: 'Varsayılan namespace',
      pinned: 'Sabitlenenler',
      pinnedHint: 'Seçicide her zaman üstte gösterilir.',
      rbacFilter: 'RBAC tabanlı filtreleme',
      labelGrouping: 'Label ile gruplama'
    },
    metrics: {
      title: 'Metrik kaynağı',
      hint: 'Bu küme için Prometheus uç noktası ve scrape davranışı.',
      source: 'Kaynak',
      sourceAuto: 'Otomatik keşif',
      sourceCustom: 'Özel',
      endpoint: 'Endpoint URL',
      scrape: 'Scrape aralığı (sn)',
      timeout: 'Sorgu zaman aşımı (sn)',
      auth: 'Kimlik doğrulama',
      authNone: 'Yok',
      pathPrefix: 'Path öneki',
      hideUnused: 'Kullanılmayan metrikleri gizle',
      testQuery: 'Test / yeniden keşfet'
    },
    lensMetrics: {
      title: 'Lens Metrics yığını',
      hint: 'İsteğe bağlı küme içi Prometheus / exporter’lar (kurulum desteği yakında).',
      enabled: 'Lens Metrics’i aç',
      autoInstall: 'Bağlanınca otomatik kur',
      autoUpgrade: 'Otomatik yükselt'
    },
    nodeShell: {
      title: 'Node shell debug pod’u',
      hint: 'Node üzerinde host shell için privileged pod (nsenter).',
      image: 'Shell imajı',
      imageHint: 'Varsayılan {{default}}. Node’lar özel imaj gerektiriyorsa değiştirin.',
      resetDefault: 'Varsayılan',
      pullPolicy: 'Image pull policy',
      pullSecret: 'Image pull secret',
      cpuLimit: 'CPU limiti',
      memoryLimit: 'Bellek limiti',
      privileged: 'Privileged',
      runAsRoot: 'Root olarak çalıştır',
      nodeSelector: 'Node selector',
      nodeSelectorHint: 'key=value veya JSON nesnesi.',
      tolerations: 'Toleration’lar (JSON)',
      tolerationsHint: 'Toleration JSON dizisi. Varsayılan Exists tüm taint’lere uyar.',
      cleanupTtl: 'Temizlik TTL (saniye)'
    },
    security: {
      title: 'Güvenlik',
      hint: 'Erişim ve kubeconfig tercihleri.',
      rbacViewer: 'RBAC rollerini / izinleri göster',
      encrypt: 'Kubeconfig’i diskte şifrele',
      encryptHint: 'Mümkünse OS keychain / safeStorage kullanır.',
      audit: 'İstemci tarafı denetim günlüğü'
    },
    network: {
      title: 'Ağ',
      hint: 'Bilgilendirme amaçlı küme ağ alanları.',
      domain: 'Küme domain’i',
      serviceCidr: 'Service CIDR',
      podCidr: 'Pod CIDR',
      dnsNotes: 'DNS notları'
    },
    storage: {
      title: 'Depolama',
      hint: 'Kalıcı volume ile ilgili varsayılanlar.',
      defaultClass: 'Varsayılan storage class',
      snapshots: 'Volume snapshot desteği',
      csi: 'CSI driver’ları göster'
    },
    integrations: {
      title: 'Entegrasyonlar',
      hint: 'Bu küme için harici gözlemlenebilirlik uç noktaları.'
    },
    performance: {
      title: 'Performans',
      hint: 'İstemci tarafı hız limitleri ve yenileme.',
      rateLimit: 'API istek hız limiti',
      cache: 'Yanıt önbelleğini aç',
      refresh: 'UI yenileme aralığı (sn)',
      concurrency: 'Eşzamanlılık limiti'
    },
    ui: {
      title: 'Arayüz',
      hint: 'Küme bazlı görüntüleme tercihleri.',
      density: 'Tablo yoğunluğu',
      comfortable: 'Rahat',
      compact: 'Kompakt',
      defaultView: 'Varsayılan kaynak görünümü',
      favoritesFirst: 'Favoriler önce'
    },
    debug: {
      title: 'Debug / Gelişmiş',
      hint: 'Tanılama ve deneysel bayraklar.',
      kubectlProxy: 'kubectl proxy',
      apiInspector: 'API istek denetçisi',
      clientLogs: 'Ayrıntılı istemci logları',
      experimental: 'Deneysel ayarlar',
      featureFlags: 'Özellik bayrakları'
    }
  },
  clusterEdit: {
    title: 'Kümeyi düzenle',
    displayName: 'Görünen ad',
    displayNamePlaceholder: 'Kümem',
    changeLogo: 'Logoyu değiştir',
    removeLogo: 'Logoyu kaldır',
    prometheus: 'Prometheus URL',
    prometheusHint: 'İsteğe bağlı. Otomatik keşif yoksa metrikler için kullanılır.',
    prometheusPlaceholder: 'https://prometheus.example.com',
    prometheusUnknown: 'Bilinmiyor',
    prometheusConnected: 'Bağlı ({{method}})',
    prometheusNotFound: 'Bulunamadı',
    prometheusConnectHint: 'Prometheus keşfini test etmek için bu kümeye bağlanın.',
    kubeconfig: 'Kubeconfig',
    kubeconfigHint: 'Bu küme için kullanılan kubeconfig’i görüntüleyin, kopyalayın veya düzenleyin.',
    kubeconfigCopied: 'Kubeconfig panoya kopyalandı',
    kubeconfigScopedFile: 'Kapsamlı (dosyadan)',
    kubeconfigScopedInline: 'Kapsamlı (satır içi)',
    view: 'Görüntüle',
    copy: 'Kopyala',
    editYaml: 'Düzenle',
    saveKubeconfig: 'Kubeconfig’i kaydet',
    noKubeconfigChanges: 'Kaydedilecek değişiklik yok',
    kubeconfigSaved: 'Bu küme için kubeconfig kaydedildi',
    reconnectHint: 'Kubeconfig değişikliklerini uygulamak için kümeyi yeniden bağlayın',
    save: 'Kaydet',
    cancel: 'İptal',
    close: 'Kapat'
  },
  clusterBg: {
    title: 'Workspace arka planı',
    hint: 'Bu küme sekmesi açıkken gösterilir. Varsayılan bir manzara seçin veya PNG / JPG yükleyin.',
    remove: 'Kaldır',
    upload: 'PNG / JPG yükle',
    panelTransparency: 'Panel şeffaflığı',
    solidPct: '%{{opacity}} opak',
    clear: 'Temizle',
    default: 'Varsayılan',
    solid: 'Opak',
    panelHint:
      'Kaynak menüleri, tablolar (Pod’lar, Deployment’lar, …) ve başlıkların duvar kağıdı üzerinde ne kadar şeffaf görüneceğini kontrol eder.'
  },
  clusterView: {
    disconnectedTitle: 'Küme bağlı değil',
    disconnectedBody: 'Bu küme için namespace’leri ve kaynakları yüklemek üzere bağlanın.',
    connect: 'Bağlan',
    connectingVpn: 'VPN bağlanıyor…',
    connecting: 'Bağlanıyor…'
  },
  clusterAdd: {
    title: 'Küme ekle',
    pickFile: 'Kubeconfig dosyası seç',
    pasteYaml: 'YAML yapıştır',
    scan: 'Tara',
    rescan: 'Yeniden tara',
    selectAllNew: 'Tüm yenileri seç',
    alreadyAdded: 'Zaten eklendi',
    addN: '{{count}} küme ekle',
    addN_plural: '{{count}} küme ekle',
    noContexts: 'Bu kubeconfig’te context bulunamadı.',
    duplicate: 'Zaten listede'
  },
  auth: {
    signInTitle: 'MagicLens’e giriş yapın',
    signInBody:
      'Kurumsal e-posta ve şifrenizi kullanın. Yöneticiler Admin Console’u, üyeler profilini açar. Yalnızca yerel kubeconfig’lerle çevrimdışı da devam edebilirsiniz.',
    email: 'E-posta',
    emailPlaceholder: 'siz@sirket.com',
    password: 'Şifre',
    passwordPlaceholder: 'Şifre',
    apiBase: 'API taban URL’si',
    apiBasePlaceholder: 'http://localhost:3000',
    signIn: 'Giriş yap',
    apiSettings: 'API ayarları',
    hideApiSettings: 'API ayarlarını gizle',
    continueOffline: 'Çevrimdışı devam et',
    syncedToast: '{{kubeconfigs}} küme context’i ve {{vpn}} VPN profili senkronize edildi',
    syncFailedToast: 'Giriş yapıldı ancak senkron başarısız: {{error}}'
  },
  search: {
    placeholder: 'Küme, pod ara…',
    searching: 'Aranıyor…',
    noResults: 'Sonuç yok',
    connectHint: 'Namespace’ler arasında kaynak aramak için bir kümeye bağlanın.',
    typeHint:
      'Aramak için yazın. pod:nginx, @deploy api gibi anahtar kelimeler kullanın veya yukarıdaki tür filtresine tıklayın.',
    searchingIn: 'Kaynaklar aranıyor: {{cluster}}',
    recent: 'Son',
    clusters: 'Kümeler',
    resources: 'Kaynaklar',
    hint: '↑↓ gezin · Enter aç · Esc kapat'
  },
  onboarding: {
    title: 'Size atanan kaynaklar',
    body: 'Bu cihaza senkronize edilecek org kubeconfig ve VPN profillerini seçin.',
    syncSelected: 'Seçilenleri bu cihaza senkronize et',
    notNow: 'Şimdi değil',
    kubeconfigs: 'Kubeconfig’ler',
    vpnProfiles: 'VPN profilleri',
    empty: 'Henüz atama yok'
  },
  profile: {
    title: 'Profil',
    assignedClusters: 'Atanan kümeler',
    assignedVpn: 'Atanan VPN profilleri',
    syncAssignments: 'Atamaları senkronize et',
    adminConsole: 'Admin Console',
    updatePassword: 'Şifreyi güncelle',
    notifications: 'Bildirimler',
    markAllRead: 'Tümünü okundu işaretle',
    fullAccess: 'Tam erişim',
    readOnly: 'Salt okunur',
    noClusters: 'Henüz atanmış küme yok',
    noVpn: 'Atanmış VPN profili yok',
    noNotifications: 'Bildirim yok',
    currentPassword: 'Mevcut şifre',
    newPassword: 'Yeni şifre',
    confirmPassword: 'Şifreyi onayla'
  },
  admin: {
    title: 'Admin Console',
    signInRequired: 'Giriş gerekli',
    accessRequired: 'Yönetici erişimi gerekli',
    nav: {
      dashboard: 'Panel',
      users: 'Kullanıcılar',
      teams: 'Ekipler',
      kubeconfigs: 'Kubeconfig’ler',
      vpn: 'VPN',
      permissions: 'İzinler',
      invitations: 'Davetler',
      audit: 'Denetim'
    },
    dashboard: {
      pendingInvitations: 'Bekleyen davetler',
      recentActions: 'Son yönetim işlemleri',
      users: 'Kullanıcılar',
      teams: 'Ekipler'
    }
  },
  chromeExtra: {
    splitScreen: 'Bölünmüş ekran',
    exitSplit: 'Bölünmüş görünümden çık',
    terminal: 'Terminal',
    closePanel: 'Paneli kapat'
  }
}
