import type { TranslationOverrides } from './en'

export const zh: TranslationOverrides = {
  common: {
    settings: '设置',
    custom: '自定义',
    version: '版本',
    build: '构建',
    manual: '手动',
    connected: '已连接',
    connecting: '正在连接…',
    disconnected: '未连接',
    error: '错误',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'All namespaces',
    total: '总计',
    clusters: '集群',
    vpn: 'VPN',
    favorites: '收藏'
  },
  chrome: {
    searchPlaceholder: '搜索集群、资源、命名空间…',
    manageClusters: '管理集群',
    clustersMeta: '共 {{total}} · {{connected}} 已连接',
    vpnTooltip: 'VPN 配置（OpenVPN、Pritunl、WireGuard）',
    vpnConnected: '已连接 · {{name}}',
    vpnConnecting: '正在连接 · {{name}}',
    searchFavorites: '搜索收藏',
    searchWorkspaces: '搜索工作区…',
    noWorkspaceMatch: '没有匹配的工作区',
    noFavoriteClusters: '暂无收藏的集群',
    collapseSidebar: '折叠侧边栏',
    expandSidebar: '展开侧边栏'
  },
  settings: {
    title: '设置',
    sections: {
      general: '通用',
      updates: '更新',
      display: '显示',
      keyboard: '键盘',
      appearance: '外观',
      about: '关于'
    },
    language: {
      title: '语言',
      hint: '选择应用语言。Ant Design 控件与日期显示将跟随此设置。'
    },
    general: {
      refreshTitle: '资源刷新间隔',
      refreshHint:
        '资源列表与指标自动刷新的频率。应用于每个打开的集群标签页；仍可在各资源视图中暂停实时刷新。'
    },
    updates: {
      available: 'v{{version}} 可用',
      checkAutomatically: '自动检查更新',
      checkOnStartup: '启动时检查',
      includePrerelease: '包含预发布版本',
      macosManual:
        '在没有付费 Apple Developer ID 证书的情况下，macOS 无法自动下载/安装。发现更新时，MagicLens 会跳转到 GitHub 发布页以便手动下载 DMG。',
      autoDownload: '自动下载更新',
      askBeforeInstall: '安装前询问',
      checkNow: '立即检查更新',
      openCenter: '打开更新中心'
    },
    display: {
      detailsTitle: '资源详情',
      detailsHint: '选择点击资源时在右侧面板打开详情，还是作为底部坞站标签页打开（与终端和 YAML 编辑器并列）。',
      placementDrawer: '右侧抽屉（推荐）',
      placementRight: '右侧面板（分屏）',
      placementBottom: '底部标签',
      nodesTitle: 'Nodes 页面布局',
      nodesHint: '切换各分区的显示并拖动排序。表格分区在可见时会灵活填充剩余空间。',
      nodesChooser: '选择 Nodes 页面显示的分区，并拖动以重新排序。',
      sidebarTitle: '侧边栏',
      showFavorites: '显示收藏部分',
      showFavoritesHint: '启用后，收藏会显示在左侧边栏的 Workspaces 上方。点击标题可折叠或展开。',
      showWorkspaces: '显示 Workspaces 部分',
      showWorkspacesHint: '启用后，Workspaces 会出现在左侧边栏。折叠时用 W 标记工作区集群。',
      tabIconsTitle: '标签图标',
      showClusterLogos: '在集群标签上显示徽标',
      showResourceIcons: '在资源标签上显示图标',
      tabIconsHint: '集群标签使用添加集群时设置的徽标。资源标签使用与左侧菜单相同的图标。'
    },
    nodesSections: {
      health: '集群健康',
      resources: '资源使用',
      quickInsights: '快速洞察',
      topConsumers: '高消耗项',
      table: '节点表格',
      events: '事件面板'
    },
    keyboard: {
      hint: '点击快捷键以录制新组合。冲突项会自动交换。按 Esc 取消。',
      reset: '恢复默认',
      pressKeys: '请按键…',
      recordError: '请使用带 ⌘/Ctrl（或 Alt）的快捷键，或按 Esc 取消',
      changeAria: '更改 {{label}} 的快捷键',
      actions: {
        globalSearch: {
          label: '全局搜索',
          description: '打开或关闭集群 / 资源搜索面板'
        },
        toggleSplitView: {
          label: '切换分屏',
          description: '并排比较两个集群标签'
        },
        goToClusters: {
          label: '转到集群',
          description: '打开集群列表'
        },
        goToVpn: {
          label: '转到 VPN',
          description: '打开 VPN 配置页面'
        },
        toggleSidebar: {
          label: '切换侧边栏',
          description: '折叠或展开左侧边栏'
        },
        openSettings: {
          label: '打开设置',
          description: '打开设置窗口'
        }
      }
    },
    appearance: {
      intro: '选择预设或自定义强调色。侧边栏、资源菜单和面板都会跟随当前主题。使用标题栏开关切换浅色 / 深色模式。',
      customAccent: '自定义强调色',
      customAccentHint: '应用于侧边栏、按钮、高亮与图表强调色。',
      customSwatch: '你自己的强调色'
    }
  },
  vpn: {
    heroEyebrow: '安全隧道',
    title: 'VPN',
    status: {
      connected: '已连接',
      connecting: '正在连接',
      error: '错误',
      disconnected: '未连接'
    },
    tunnelsUp: '{{count}} 条隧道已启动',
    noActiveProfile: '无活动配置',
    disconnect: '断开',
    connect: '连接',
    edit: '编辑',
    disconnectedToast: '已断开',
    connectedToast: '已连接',
    openedExternalToast: '已在系统 VPN 应用中打开',
    connectFailed: '连接失败',
    removedToast: '已删除',
    noToolsTitle: '未检测到 VPN 工具',
    noToolsDesc: '请安装 OpenVPN（brew install openvpn）、Tunnelblick、WireGuard.app 或 wireguard-tools。',
    profilesTitle: 'VPN 配置',
    addToStart: '添加配置以开始使用',
    filteredCount: '{{filtered}} / {{total}}',
    searchPlaceholder: '搜索配置…',
    addFile: '添加文件',
    paste: '粘贴',
    refresh: '刷新',
    emptyDesc: '添加 .ovpn 或 WireGuard .conf',
    chooseFile: '选择文件',
    noMatch: '没有与“{{query}}”匹配的配置',
    live: '在线',
    usernameNotSet: '未设置用户名',
    noServerSet: '未设置服务器',
    moreActions: '更多操作',
    menu: {
      editProfile: '编辑配置',
      revealFile: '显示文件',
      openExternally: '在外部打开',
      delete: '删除'
    },
    draft: {
      editTitle: '编辑 VPN 配置',
      reviewTitle: '检查 VPN 配置',
      correctFields: '更正自动检测的字段',
      correctFieldsDesc: '用户名 / 组织 / 服务器从 .ovpn 解析，经常不准确 — 保存前请编辑。',
      name: '名称',
      provider: '提供商',
      username: '用户名',
      usernameRequired: '请输入 VPN 用户名',
      organization: '组织',
      organizationPlaceholder: '组织名称',
      serverName: '服务器名称',
      serverHost: '服务器主机',
      protocol: '协议',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: '保存更改',
      saveProfile: '保存配置',
      updated: '配置已更新',
      updateFailed: '更新失败',
      missingConfig: '缺少配置内容',
      added: '已添加 VPN 配置',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: '自动检测'
      }
    },
    auth: {
      title: '连接 · {{name}}',
      pinMfaOnly: '仅需 PIN + MFA',
      pinMfaDesc: '用户名 / 服务器 / 组织来自配置。若有误请使用编辑。',
      user: '用户：',
      server: '服务器：',
      organization: '组织：',
      notSetEdit: '未设置 — 请编辑配置',
      setUsernameFirst: '请先通过编辑设置用户名，或在下方输入',
      pin: 'PIN',
      pinRequired: '请输入 PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP 验证码',
      mfaRequired: '请输入 MFA/OTP 验证码',
      mfaPlaceholder: '6 位验证码',
      editFields: '编辑配置字段'
    },
    pasteModal: {
      title: '粘贴 VPN 配置',
      namePlaceholder: '办公 VPN',
      config: '配置内容',
      configPlaceholder: '粘贴 .ovpn 或 WireGuard 配置',
      continue: '继续 — 检查字段'
    },
    panel: {
      connectionStatus: '连接状态',
      healthyTunnel: '隧道正常',
      verifying: '已连接 — 正在验证',
      connecting: '正在连接…',
      error: '错误',
      disconnected: '未连接',
      tunnel: 'VPN 隧道',
      opening: '正在打开…',
      server: 'VPN 服务器',
      privateNetwork: '专用网络',
      clusterEndpoints: '集群端点',
      local: '本地',
      download: '下载',
      upload: '上传',
      total: '总计 {{size}}',
      checkProcess: 'VPN 进程运行中',
      checkInterface: '带 IP 的隧道接口',
      checkTraffic: '流量传输中',
      falsePositive: '显示已连接但尚无隧道 IP — 路由就绪前专用集群会超时。',
      providerLine: '提供商：{{provider}}',
      connectedAgo: '{{uptime}} 前已连接',
      connectionFailed: '连接失败'
    },
    session: {
      titleForCluster: '{{cluster}} 的 VPN',
      titleConnect: '连接 VPN · {{name}}',
      alertTitle: 'VPN 会话',
      pinKnownDesc:
        'PIN 会记住约 5 小时。请输入新的 MFA 验证码以启动隧道。连接后，只要隧道保持，切换集群不会再次询问。',
      pinUnknownDesc:
        '每个 VPN 认证一次。MagicLens 会保持隧道（类似 Pritunl），约 5 小时内切换集群无需重新登录。',
      profile: '配置：',
      user: '用户：',
      pin: 'PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6 位验证码',
      connectContinue: '连接并继续'
    },
    badge: {
      missing: '缺少 VPN',
      missingTooltip: '未找到关联的 VPN 配置 — 请在编辑集群中重新分配',
      connected: 'VPN 已连接 · {{name}}',
      connecting: 'VPN 连接中 · {{name}}',
      autoConnect: '自动连接 · {{name}}'
    },
    clusterLink: {
      title: 'VPN 配置（自动连接）',
      placeholder: '无 VPN — 手动连接',
      empty: '请先在 VPN 页面添加配置',
      hint: '切换到此集群标签时，MagicLens 会自动连接此 VPN。首次成功连接后，PIN 和 MFA 会按配置在当天内记住。'
    }
  },
  tour: {
    skip: '跳过',
    back: '返回',
    next: '下一步',
    getStarted: '开始使用',
    continue: '继续',
    chooseLanguage: '选择语言',
    languageHint: '可随时在设置中更改。功能介绍将使用所选语言。',
    slidesAria: '功能幻灯片',
    slides: {
      welcome: {
        eyebrow: '欢迎',
        title: '面向 Kubernetes 的 MagicLens',
        body: '在一台桌面客户端中管理集群、资源、VPN、日志与终端 — 本机优先的离线体验。'
      },
      clusters: {
        eyebrow: '集群',
        title: '多集群，一个工作区',
        body: '导入 kubeconfig、固定收藏，并在集群标签间即时切换。'
      },
      split: {
        eyebrow: '分屏',
        title: '同时比较两个集群',
        body: '分屏让两个集群标签并排显示 — 适合对比预发与生产。'
      },
      search: {
        eyebrow: '搜索',
        title: '快速查找一切',
        body: '全局搜索一键跳到集群、命名空间与资源（默认 ⌘K / Ctrl+K — 可在设置 → 键盘中修改）。'
      },
      resources: {
        eyebrow: '资源浏览器',
        title: '浏览每类资源',
        body: '工作负载、配置、网络、存储等 — 实时监视、YAML 编辑、批量操作与详情面板。'
      },
      vpn: {
        eyebrow: 'VPN',
        title: '私有集群与隧道',
        body: '上传 OpenVPN / Pritunl / WireGuard，关联到集群，切换标签时保持多条隧道。'
      },
      ops: {
        eyebrow: '日常运维',
        title: '日志、exec 与终端',
        body: '跟踪并下载 Pod 日志、进入容器、打开本地终端 — 都在底部面板。'
      },
      forward: {
        eyebrow: '访问',
        title: '端口转发更简单',
        body: '几步将 Pod 或 Service 转到本地端口 — 会话在工作时保持可见。'
      }
    }
  }
}
