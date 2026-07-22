import type { TranslationResources } from './en'

export const tr: TranslationResources = {
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
      'OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app veya wireguard-tools kurun.',
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
  }
}
