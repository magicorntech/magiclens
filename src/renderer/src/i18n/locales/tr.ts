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
    allNamespaces: 'All namespaces',
    total: 'toplam',
    clusters: 'Kümeler',
    vpn: 'VPN',
    favorites: 'Favoriler'
  },
  chrome: {
    searchPlaceholder: 'Küme, kaynak, namespace ara…',
    manageClusters: 'Kümeleri yönet',
    clustersMeta: '{{total}} toplam · {{connected}} bağlı',
    vpnTooltip: 'VPN profilleri (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: 'Bağlı · {{name}}',
    vpnConnecting: 'Bağlanıyor · {{name}}',
    searchFavorites: 'Favorilerde ara',
    searchWorkspaces: 'Workspace ara…',
    noWorkspaceMatch: 'Eşleşen workspace yok',
    noFavoriteClusters: 'Favori küme yok',
    collapseSidebar: 'Kenar çubuğunu daralt',
    expandSidebar: 'Kenar çubuğunu genişlet'
  },
  settings: {
    title: 'Ayarlar',
    sections: {
      general: 'Genel',
      updates: 'Güncellemeler',
      display: 'Görünüm',
      vpnExtensions: 'VPN Eklentileri',
      keyboard: 'Klavye',
      appearance: 'Tema',
      about: 'Hakkında'
    },
    language: {
      title: 'Dil',
      hint: 'Uygulama dilini seçin. Ant Design bileşenleri ve tarihler bu ayarı takip eder.'
    },
    general: {
      refreshTitle: 'Kaynak yenileme aralığı',
      refreshHint:
        'Kaynak listeleri ve metriklerin ne sıklıkla otomatik yenileneceği. Tüm açık küme sekmelerine uygulanır; canlı yenilemeyi kaynak görünümünde duraklatabilirsiniz.'
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
      hint: 'Yeni kısayol kaydetmek için bir satıra tıklayın. Çakışanlar otomatik yer değiştirir. Esc iptal eder.',
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
        'Bir hazır tema seçin veya kendi vurgu renginizi belirleyin. Kenar çubuğu, kaynak menüsü ve paneller aktif temayı izler. Açık / koyu mod için üst çubuktaki düğmeyi kullanın.',
      customAccent: 'Özel vurgu',
      customAccentHint: 'Kenar çubukları, düğmeler, vurgular ve grafik tonlarına uygulanır.',
      customSwatch: 'Kendi vurgu rengin'
    },
    about: {
      platform: 'Platform'
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
      hint: 'Bu küme sekmesine geçince MagicLens bu VPN’e otomatik bağlanır. PIN ve MFA, ilk başarılı bağlantıdan sonra gün boyu profil bazında hatırlanır.'
    }
  },
  tour: {
    skip: 'Atla',
    back: 'Geri',
    next: 'İleri',
    getStarted: 'Başla',
    continue: 'Devam',
    chooseLanguage: 'Dilinizi seçin',
    languageHint: 'Bunu istediğiniz zaman Ayarlar’dan değiştirebilirsiniz. Özellik kartları seçtiğiniz dilde açılır.',
    slidesAria: 'Özellik slaytları',
    slides: {
      welcome: {
        eyebrow: 'Hoş geldiniz',
        title: 'Kubernetes için MagicLens',
        body: 'Kümeleri, kaynakları, VPN tünellerini, logları ve terminalleri tek yerden yöneten hızlı bir masaüstü istemcisi — makinenizde offline-first.'
      },
      clusters: {
        eyebrow: 'Kümeler',
        title: 'Çoklu küme, tek çalışma alanı',
        body: 'Kubeconfig içe aktarın, favorilere sabitleyin ve çalıştığınız her küme arasında anında sekme değiştirin.'
      },
      split: {
        eyebrow: 'Bölünmüş görünüm',
        title: 'İki kümeyi aynı anda karşılaştırın',
        body: 'İki küme sekmesini yan yana tutmak için bölünmüş görünümü açın — staging vs production veya aynı kaynağı ortamlar arasında kontrol etmek için ideal.'
      },
      search: {
        eyebrow: 'Arama',
        title: 'Her şeyi hızlı bulun',
        body: 'Global arama tek kısayolla kümelere, namespace’lere ve kaynaklara atlar (varsayılan ⌘K / Ctrl+K — Ayarlar → Klavye’den değiştirebilirsiniz).'
      },
      resources: {
        eyebrow: 'Gezgin',
        title: 'Her kaynağa göz atın',
        body: 'Workload, Config, Network, Storage ve daha fazlası — canlı izleme, YAML düzenleme, toplu işlemler ve odaklı detay paneli.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'Özel kümeler, sizin tünelleriniz',
        body: 'OpenVPN / Pritunl / WireGuard profilleri yükleyin, kümelere bağlayın ve sekmeler arasında geçerken birden fazla tüneli açık tutun.'
      },
      ops: {
        eyebrow: 'Günlük iş',
        title: 'Log, exec ve terminaller',
        body: 'Pod loglarını izleyin ve indirin, container’lara exec yapın, yerel terminaller açın — hepsi alt panelde elinizin altında.'
      },
      forward: {
        eyebrow: 'Erişim',
        title: 'Port yönlendirme kolay',
        body: 'Bir Pod veya Service’i birkaç tıkla yerel porta yönlendirin — MagicLens oturumu çalışırken görünür tutar.'
      }
    }
  },
  workspaces: {
    title: 'Workspaces',
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
  }
}
