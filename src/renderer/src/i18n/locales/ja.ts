import type { TranslationOverrides } from './en'

export const ja: TranslationOverrides = {
  common: {
    settings: '設定',
    custom: 'カスタム',
    version: 'バージョン',
    build: 'ビルド',
    manual: '手動',
    connected: '接続済み',
    connecting: '接続中…',
    disconnected: '未接続',
    error: 'エラー',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'All namespaces',
    total: '合計',
    clusters: 'クラスター',
    vpn: 'VPN',
    favorites: 'お気に入り'
  },
  chrome: {
    searchPlaceholder: 'クラスター、リソース、名前空間を検索…',
    manageClusters: 'クラスターを管理',
    clustersMeta: '{{total}} 合計 · {{connected}} 接続中',
    vpnTooltip: 'VPN プロファイル（OpenVPN、Pritunl、WireGuard）',
    vpnConnected: '接続済み · {{name}}',
    vpnConnecting: '接続中 · {{name}}',
    searchFavorites: 'お気に入りを検索',
    searchWorkspaces: 'ワークスペースを検索…',
    noWorkspaceMatch: '一致するワークスペースはありません',
    noFavoriteClusters: 'お気に入りのクラスターはありません',
    collapseSidebar: 'サイドバーを折りたたむ',
    expandSidebar: 'サイドバーを展開'
  },
  settings: {
    title: '設定',
    sections: {
      general: '一般',
      updates: 'アップデート',
      display: '表示',
      vpnExtensions: 'VPN 拡張機能',
      keyboard: 'キーボード',
      appearance: '外観',
      about: '情報'
    },
    language: {
      title: '言語',
      hint: 'アプリの言語を選択します。Ant Design の UI と日付表示もこれに従います。'
    },
    general: {
      refreshTitle: 'リソースの更新間隔',
      refreshHint:
        'リソース一覧とメトリクスの自動更新頻度です。開いているすべてのクラスタータブに適用されます。リソース画面ごとにライブ更新を一時停止できます。'
    },
    updates: {
      available: 'v{{version}} が利用可能',
      checkAutomatically: 'アップデートを自動で確認',
      checkOnStartup: '起動時に確認',
      includePrerelease: 'プレリリースを含める',
      macosManual:
        '有料の Apple Developer ID 証明書がない場合、macOS では自動ダウンロード／インストールは利用できません。アップデートが見つかると MagicLens は GitHub のリリースへ案内し、DMG を手動でダウンロードします。',
      autoDownload: 'アップデートを自動ダウンロード',
      askBeforeInstall: 'インストール前に確認',
      checkNow: '今すぐアップデートを確認',
      openCenter: 'アップデートセンターを開く'
    },
    display: {
      detailsTitle: 'リソースの詳細',
      detailsHint:
        'リソースをクリックしたときに、右側パネルで開くか、下部ドックのタブ（ターミナルと YAML エディターと並ぶ）で開くかを選べます。',
      placementDrawer: '右ドロワー（推奨）',
      placementRight: '右パネル（分割表示）',
      placementBottom: '下部タブ',
      nodesTitle: 'Nodes ページのレイアウト',
      nodesHint:
        'セクションの表示／非表示を切り替え、ドラッグで並べ替えます。テーブルは表示時に残りの領域を埋めます。',
      nodesChooser: 'Nodes ページに表示するセクションを選び、ドラッグで並べ替えます。',
      sidebarTitle: 'サイドバー',
      showFavorites: 'お気に入りセクションを表示',
      showFavoritesHint:
        '有効にすると、左サイドバーの Workspaces の上にお気に入りが表示されます。見出しをクリックして折りたたみ／展開できます。',
      showWorkspaces: 'Workspaces セクションを表示',
      showWorkspacesHint:
        '有効にすると左サイドバーに Workspaces が表示されます。折りたたみ時は W マーカーがワークスペースのクラスター上に出ます。',
      tabIconsTitle: 'タブのアイコン',
      showClusterLogos: 'クラスタータブにロゴを表示',
      showResourceIcons: 'リソースタブにアイコンを表示',
      tabIconsHint:
        'クラスタータブは追加時に設定したロゴを使います。リソースタブは左メニューと同じアイコンを使います。'
    },
    nodesSections: {
      health: 'クラスターの健全性',
      resources: 'リソース使用状況',
      quickInsights: 'クイックインサイト',
      topConsumers: '上位コンシューマー',
      table: 'ノードテーブル',
      events: 'イベントパネル'
    },
    keyboard: {
      hint: 'ショートカットをクリックして新しい組み合わせを録音します。競合は自動で入れ替わります。Esc でキャンセル。',
      reset: 'デフォルトに戻す',
      pressKeys: 'キーを押してください…',
      recordError: '⌘/Ctrl（または Alt）付きのショートカットを使うか、Esc でキャンセル',
      changeAria: '{{label}} のショートカットを変更',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        'ワークスペースを開くショートカットを割り当てます（展開してクラスタを開きます）。編集画面でも設定できます。',
      workspacesEmpty: 'ショートカットを割り当てるにはサイドバーでワークスペースを作成してください。',
      workspaceOpenDesc: 'ワークスペースを開く · {{count}} クラスタ',
      actions: {
        globalSearch: {
          label: 'グローバル検索',
          description: 'クラスター／リソース検索パレットを開閉'
        },
        toggleSplitView: {
          label: '分割表示の切替',
          description: '2 つのクラスタータブを並べて比較'
        },
        goToClusters: {
          label: 'クラスターへ',
          description: 'クラスター一覧を開く'
        },
        goToVpn: {
          label: 'VPN へ',
          description: 'VPN プロファイルページを開く'
        },
        toggleSidebar: {
          label: 'サイドバーの切替',
          description: '左サイドバーを折りたたむ／展開する'
        },
        openSettings: {
          label: '設定を開く',
          description: '設定ウィンドウを開く'
        }
      }
    },
    appearance: {
      intro:
        'プリセットを選ぶか、独自のアクセントカラーを設定します。サイドバー、リソースメニュー、パネルはアクティブなテーマに従います。ライト／ダークはヘッダーの切替を使います。',
      customAccent: 'カスタムアクセント',
      customAccentHint: 'サイドバー、ボタン、ハイライト、チャートのアクセントに適用されます。',
      customSwatch: '独自のアクセントカラー'
    },
    about: {
      platform: 'プラットフォーム'
    },
    vpnExtensions: {
      intro:
        'PIN + MFA トンネルに必要な VPN CLI ツールをインストールして確認します。OpenVPN Connect はサポートされません。',
      platformLabel: '検出されたプラットフォーム: {{platform}}',
      platformHint: {
        darwin:
          'macOS では Homebrew で OpenVPN / WireGuard CLI を入れます。Tunnelblick と WireGuard.app は任意の代替です。',
        win32:
          'Windows では winget で OpenVPN Community CLI と WireGuard を入れます（代替: Chocolatey/Scoop）。OpenVPN Connect は使わないでください。',
        linux:
          'Linux では配布パッケージ（apt/dnf/pacman/zypper）を優先します。失敗時は Homebrew にフォールバックします。',
        other: 'この環境では自動インストールが制限される場合があります。下の手動コマンドを使ってください。'
      },
      statusTitle: '検出されたツール',
      ready: '準備完了',
      missing: '未検出',
      rescan: 'ツールを再スキャン',
      installTitle: 'MagicLens でインストール',
      installHint: 'パスワード / UAC の確認が求められる場合があります。数分かかることがあります。',
      installOpenVpn: 'OpenVPN CLI をインストール',
      installWireGuard: 'WireGuard をインストール',
      installSuccess: '{{tool}} をインストールしました',
      installFailed: 'インストールに失敗しました',
      packagesTitle: 'パッケージ / コマンド',
      packagesHint: '手動インストール用にターミナルへコピーできます。',
      manualTitle: '手動セットアップ手順',
      manual: {
        darwin: [
          '必要なら https://brew.sh から Homebrew をインストールします。',
          '実行: brew install openvpn',
          '任意: brew install wireguard-tools',
          '任意 GUI: brew install --cask tunnelblick または WireGuard.app',
          'MagicLens を再起動し、PIN + MFA で再接続します。'
        ],
        win32: [
          'PowerShell または Terminal を開きます。',
          'Community OpenVPN をインストール（Connect ではない）: winget install -e --id OpenVPNTechnologies.OpenVPN',
          'WireGuard をインストール: winget install -e --id WireGuard.WireGuard',
          '代替: choco install openvpn -y  /  choco install wireguard -y',
          'Program Files\\OpenVPN\\bin の openvpn.exe を検出できるよう MagicLens を再起動します。'
        ],
        linux: [
          'Debian/Ubuntu: sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL: sudo dnf install -y openvpn wireguard-tools',
          'Arch: sudo pacman -Sy openvpn wireguard-tools',
          'または Homebrew: brew install openvpn wireguard-tools',
          'MagicLens を再起動し、PIN + MFA で接続します。'
        ],
        other: [
          'OS 向けの OpenVPN community CLI をインストールします。',
          'WireGuard プロファイルを使う場合は wg-quick を入れます。',
          'MagicLens を再起動して再接続します。'
        ]
      },
      connectNote:
        'ツールの準備ができたら VPN ページに戻り接続してください。不足時は接続時に自動インストールも試します。'
    }
  },
  vpn: {
    heroEyebrow: 'セキュアトンネル',
    title: 'VPN',
    status: {
      connected: '接続済み',
      connecting: '接続中',
      error: 'エラー',
      disconnected: '未接続'
    },
    tunnelsUp: '{{count}} 本のトンネル稼働中',
    noActiveProfile: 'アクティブなプロファイルなし',
    disconnect: '切断',
    connect: '接続',
    edit: '編集',
    disconnectedToast: '切断しました',
    connectedToast: '接続しました',
    openedExternalToast: 'システムの VPN アプリで開きました',
    connectFailed: '接続に失敗しました',
    removedToast: '削除しました',
    noToolsTitle: 'VPN ツールが見つかりません',
    noToolsDesc:
      'PIN + MFA には OpenVPN Community CLI（または WireGuard ツール）が必要です。設定 → VPN 拡張機能でインストールするか、手動手順に従ってください。OpenVPN Connect は未対応です。',
    openVpnExtensions: 'VPN 拡張機能',
    connectHelpTitle: '接続できませんでした',
    connectHelpDesc:
      'ツール不足やインストール失敗の場合は、VPN 拡張機能を開いて OpenVPN / WireGuard の導入と OS 別手順を確認してください。',
    profilesTitle: 'VPN プロファイル',
    addToStart: '設定を追加して開始',
    filteredCount: '{{filtered}} / {{total}}',
    searchPlaceholder: 'プロファイルを検索…',
    addFile: 'ファイルを追加',
    paste: '貼り付け',
    refresh: '更新',
    emptyDesc: '.ovpn または WireGuard .conf を追加',
    chooseFile: 'ファイルを選択',
    noMatch: '「{{query}}」に一致するプロファイルはありません',
    live: '稼働中',
    usernameNotSet: 'ユーザー名未設定',
    noServerSet: 'サーバー未設定',
    moreActions: 'その他の操作',
    menu: {
      editProfile: 'プロファイルを編集',
      revealFile: 'ファイルを表示',
      openExternally: '外部で開く',
      delete: '削除'
    },
    draft: {
      editTitle: 'VPN プロファイルを編集',
      reviewTitle: 'VPN プロファイルを確認',
      correctFields: '自動検出された項目を修正',
      correctFieldsDesc:
        'ユーザー名 / 組織 / サーバーは .ovpn から読み取られ、しばしば誤っています — 保存前に編集してください。',
      name: '名前',
      provider: 'プロバイダー',
      username: 'ユーザー名',
      usernameRequired: 'VPN ユーザー名を入力',
      organization: '組織',
      organizationPlaceholder: '組織名',
      serverName: 'サーバー名',
      serverHost: 'サーバーホスト',
      protocol: 'プロトコル',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: '変更を保存',
      saveProfile: 'プロファイルを保存',
      updated: 'プロファイルを更新しました',
      updateFailed: '更新に失敗しました',
      missingConfig: '設定がありません',
      added: 'VPN プロファイルを追加しました',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: '自動検出'
      }
    },
    auth: {
      title: '接続 · {{name}}',
      pinMfaOnly: 'PIN + MFA のみ',
      pinMfaDesc: 'ユーザー名 / サーバー / 組織はプロファイルから取得されます。誤りがあれば編集してください。',
      user: 'ユーザー:',
      server: 'サーバー:',
      organization: '組織:',
      notSetEdit: '未設定 — プロファイルを編集',
      setUsernameFirst: '先に編集でユーザー名を設定するか、下に入力してください',
      pin: 'PIN',
      pinRequired: 'PIN を入力',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP コード',
      mfaRequired: 'MFA/OTP コードを入力',
      mfaPlaceholder: '6桁のコード',
      editFields: 'プロファイル項目を編集'
    },
    pasteModal: {
      title: 'VPN 設定を貼り付け',
      namePlaceholder: 'オフィス VPN',
      config: '設定',
      configPlaceholder: '.ovpn または WireGuard 設定を貼り付け',
      continue: '続行 — 項目を確認'
    },
    panel: {
      connectionStatus: '接続状態',
      healthyTunnel: '正常なトンネル',
      verifying: '接続済み — 確認中',
      connecting: '接続中…',
      error: 'エラー',
      disconnected: '未接続',
      tunnel: 'VPN トンネル',
      opening: '開いています…',
      server: 'VPN サーバー',
      privateNetwork: 'プライベートネットワーク',
      clusterEndpoints: 'クラスターエンドポイント',
      local: 'ローカル',
      download: 'ダウンロード',
      upload: 'アップロード',
      total: '合計 {{size}}',
      checkProcess: 'VPN プロセスが実行中',
      checkInterface: 'IP 付きトンネルインターフェース',
      checkTraffic: 'トラフィックが流れている',
      falsePositive:
        '接続済みと表示されていますがトンネル IP がまだありません — ルートが確立されるまでプライベートクラスターはタイムアウトします。',
      providerLine: 'プロバイダー: {{provider}}',
      connectedAgo: '{{uptime}} 前に接続',
      connectionFailed: '接続に失敗しました'
    },
    session: {
      titleForCluster: '{{cluster}} の VPN',
      titleConnect: 'VPN 接続 · {{name}}',
      alertTitle: 'VPN セッション',
      pinKnownDesc:
        'PIN は約 5 時間記憶されます。トンネルを開始するには新しい MFA コードを入力してください。接続後、トンネルが稼働中はクラスター切替で再入力を求めません。',
      pinUnknownDesc:
        'VPN ごとに一度認証します。MagicLens はトンネルを維持します（Pritunl と同様）。約 5 時間はクラスター切替で再ログイン不要です。',
      profile: 'プロファイル:',
      user: 'ユーザー:',
      pin: 'PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6桁のコード',
      connectContinue: '接続して続行'
    },
    badge: {
      missing: 'VPN なし',
      missingTooltip: 'リンクされた VPN プロファイルが見つかりません — クラスター編集で再割り当て',
      connected: 'VPN 接続済み · {{name}}',
      connecting: 'VPN 接続中 · {{name}}',
      autoConnect: '自動接続 · {{name}}'
    },
    clusterLink: {
      title: 'VPN プロファイル（自動接続）',
      placeholder: 'VPN なし — 手動で接続',
      empty: '先に VPN ページでプロファイルを追加してください',
      hint: 'このクラスタータブに切り替えると MagicLens がこの VPN に自動接続します。PIN と MFA は初回成功後、その日のうちプロファイルごとに記憶されます。'
    }
  },
  tour: {
    skip: 'スキップ',
    back: '戻る',
    next: '次へ',
    getStarted: 'はじめる',
    continue: '続ける',
    chooseLanguage: '言語を選択',
    languageHint: '設定からいつでも変更できます。ヒントはこの言語で表示されます。',
    slidesAria: '機能スライド',
    slides: {
      welcome: {
        eyebrow: 'ようこそ',
        title: 'Kubernetes 向け MagicLens',
        body: 'クラスター、リソース、VPN、ログ、ターミナルを一箇所で管理する高速デスクトップクライアント — オフラインファースト。'
      },
      clusters: {
        eyebrow: 'クラスター',
        title: '複数クラスター、一つのワークスペース',
        body: 'kubeconfig を取り込み、お気に入りに固定し、クラスター間を瞬時に切り替え。'
      },
      split: {
        eyebrow: '分割表示',
        title: '2つのクラスターを同時に比較',
        body: '分割表示で2つのタブを並べて表示 — staging と production の比較に最適。'
      },
      search: {
        eyebrow: '検索',
        title: 'すばやく見つける',
        body: 'グローバル検索でクラスター、ネームスペース、リソースへジャンプ（既定 ⌘K / Ctrl+K — 設定 → キーボードで変更可）。'
      },
      resources: {
        eyebrow: 'エクスプローラー',
        title: 'すべてのリソースを閲覧',
        body: 'Workload、Config、Network、Storage など — ライブ監視、YAML 編集、一括操作、詳細パネル。'
      },
      vpn: {
        eyebrow: 'VPN',
        title: 'プライベートクラスターとトンネル',
        body: 'OpenVPN / Pritunl / WireGuard を追加しクラスターに紐づけ、タブ切替中も複数トンネルを維持。'
      },
      ops: {
        eyebrow: '日常',
        title: 'ログ、exec、ターミナル',
        body: 'Pod ログの追跡・ダウンロード、コンテナへの exec、ローカルターミナル — 下部パネルに集約。'
      },
      forward: {
        eyebrow: 'アクセス',
        title: 'ポートフォワードが簡単',
        body: 'Pod / Service を数クリックでローカルポートへ — 作業中もセッションを表示。'
      }
    }
  }
}
