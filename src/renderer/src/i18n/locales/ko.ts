import type { TranslationOverrides } from './en'

export const ko: TranslationOverrides = {
  common: {
    settings: '설정',
    custom: '사용자 지정',
    version: '버전',
    build: '빌드',
    manual: '수동',
    connected: '연결됨',
    connecting: '연결 중…',
    disconnected: '연결 끊김',
    error: '오류',
    connectionError: 'Connection error',
    idle: 'Idle',
    allNamespaces: 'All namespaces',
    total: '전체',
    clusters: '클러스터',
    vpn: 'VPN',
    favorites: '즐겨찾기'
  },
  chrome: {
    searchPlaceholder: '클러스터, 리소스, 네임스페이스 검색…',
    manageClusters: '클러스터 관리',
    clustersMeta: '{{total}} 전체 · {{connected}} 연결됨',
    vpnTooltip: 'VPN 프로필 (OpenVPN, Pritunl, WireGuard)',
    vpnConnected: '연결됨 · {{name}}',
    vpnConnecting: '연결 중 · {{name}}',
    searchFavorites: '즐겨찾기 검색',
    searchWorkspaces: '워크스페이스 검색…',
    noWorkspaceMatch: '일치하는 워크스페이스 없음',
    noFavoriteClusters: '즐겨찾는 클러스터 없음',
    collapseSidebar: '사이드바 접기',
    expandSidebar: '사이드바 펼치기'
  },
  settings: {
    title: '설정',
    sections: {
      general: '일반',
      updates: '업데이트',
      display: '표시',
      vpnExtensions: 'VPN 확장',
      keyboard: '키보드',
      appearance: '모양',
      about: '정보'
    },
    language: {
      title: '언어',
      hint: '앱 언어를 선택하세요. Ant Design 컨트롤과 날짜 표시가 이 설정을 따릅니다.'
    },
    general: {
      refreshTitle: '리소스 새로고침 간격',
      refreshHint:
        '리소스 목록과 메트릭이 자동으로 새로고침되는 주기입니다. 열린 모든 클러스터 탭에 적용되며, 리소스 보기별로 실시간 새로고침을 일시 중지할 수 있습니다.'
    },
    updates: {
      available: 'v{{version}} 사용 가능',
      checkAutomatically: '업데이트 자동 확인',
      checkOnStartup: '시작 시 확인',
      includePrerelease: '사전 출시 버전 포함',
      macosManual:
        '유료 Apple Developer ID 인증서가 없으면 macOS에서 자동 다운로드/설치를 사용할 수 없습니다. 업데이트가 있으면 MagicLens가 GitHub 릴리스로 안내하여 DMG를 수동으로 다운로드하게 합니다.',
      autoDownload: '업데이트 자동 다운로드',
      askBeforeInstall: '설치 전 확인',
      checkNow: '지금 업데이트 확인',
      openCenter: '업데이트 센터 열기'
    },
    display: {
      detailsTitle: '리소스 세부정보',
      detailsHint:
        '리소스를 클릭했을 때 오른쪽 패널에서 열지, 하단 독 탭(터미널 및 YAML 편집기와 함께)으로 열지 선택하세요.',
      placementDrawer: '오른쪽 서랍 (권장)',
      placementRight: '오른쪽 패널 (분할 보기)',
      placementBottom: '하단 탭',
      nodesTitle: 'Nodes 페이지 레이아웃',
      nodesHint:
        '섹션을 켜거나 끄고 드래그하여 순서를 바꿉니다. 테이블 섹션은 표시될 때 남은 공간을 채웁니다.',
      nodesChooser: 'Nodes 페이지에 표시할 섹션을 선택하고 드래그하여 순서를 바꿉니다.',
      sidebarTitle: '사이드바',
      showFavorites: '즐겨찾기 섹션 표시',
      showFavoritesHint:
        '켜면 왼쪽 사이드바의 Workspaces 위에 즐겨찾기가 표시됩니다. 제목을 클릭해 접거나 펼칠 수 있습니다.',
      showWorkspaces: 'Workspaces 섹션 표시',
      showWorkspacesHint:
        '켜면 왼쪽 사이드바에 Workspaces가 표시됩니다. 접힌 상태에서는 W 표시가 워크스페이스 클러스터 위에 나타납니다.',
      tabIconsTitle: '탭 아이콘',
      showClusterLogos: '클러스터 탭에 로고 표시',
      showResourceIcons: '리소스 탭에 아이콘 표시',
      tabIconsHint:
        '클러스터 탭은 클러스터 추가 시 설정한 로고를 사용합니다. 리소스 탭은 왼쪽 메뉴와 같은 아이콘을 사용합니다.'
    },
    nodesSections: {
      health: '클러스터 상태',
      resources: '리소스 사용량',
      quickInsights: '빠른 인사이트',
      topConsumers: '상위 사용량',
      table: '노드 테이블',
      events: '이벤트 패널'
    },
    keyboard: {
      hint: '단축키를 클릭해 새 조합을 녹음하세요. 충돌 시 자동으로 서로 바뀝니다. Esc로 취소합니다.',
      reset: '기본값으로 재설정',
      pressKeys: '키를 누르세요…',
      recordError: '⌘/Ctrl(또는 Alt)이 포함된 단축키를 사용하거나 Esc로 취소하세요',
      changeAria: '{{label}} 단축키 변경',
      workspacesTitle: 'Workspaces',
      workspacesHint:
        '워크스페이스를 여는 단축키를 지정하세요(펼치고 클러스터를 엽니다). 워크스페이스 편집에서도 설정할 수 있습니다.',
      workspacesEmpty: '단축키를 지정하려면 사이드바에서 워크스페이스를 만드세요.',
      workspaceOpenDesc: '워크스페이스 열기 · 클러스터 {{count}}개',
      actions: {
        globalSearch: {
          label: '전역 검색',
          description: '클러스터 / 리소스 검색 팔레트 열기 또는 닫기'
        },
        toggleSplitView: {
          label: '분할 보기 전환',
          description: '두 클러스터 탭을 나란히 비교'
        },
        goToClusters: {
          label: '클러스터로 이동',
          description: '클러스터 목록 열기'
        },
        goToVpn: {
          label: 'VPN으로 이동',
          description: 'VPN 프로필 페이지 열기'
        },
        toggleSidebar: {
          label: '사이드바 전환',
          description: '왼쪽 사이드바 접기 또는 펼치기'
        },
        openSettings: {
          label: '설정 열기',
          description: '설정 창 열기'
        }
      }
    },
    appearance: {
      intro:
        '프리셋을 고르거나 나만의 강조 색을 선택하세요. 사이드바, 리소스 메뉴, 패널은 활성 테마를 따릅니다. 라이트 / 다크 모드는 헤더 토글을 사용하세요.',
      customAccent: '사용자 지정 강조색',
      customAccentHint: '사이드바, 버튼, 하이라이트 및 차트 강조색에 적용됩니다.',
      customSwatch: '나만의 강조 색'
    },
    about: {
      platform: '플랫폼'
    },
    vpnExtensions: {
      intro:
        'PIN + MFA 터널에 필요한 VPN CLI 도구를 설치하고 확인하세요. OpenVPN Connect는 지원되지 않습니다.',
      platformLabel: '감지된 플랫폼: {{platform}}',
      platformHint: {
        darwin:
          'macOS에서는 Homebrew로 OpenVPN / WireGuard CLI를 설치합니다. Tunnelblick과 WireGuard.app은 선택적 대안입니다.',
        win32:
          'Windows에서는 winget으로 OpenVPN Community CLI와 WireGuard를 설치합니다(대체: Chocolatey/Scoop). OpenVPN Connect는 사용하지 마세요.',
        linux:
          'Linux에서는 배포판 패키지(apt/dnf/pacman/zypper)를 우선합니다. 실패 시 Homebrew로 대체합니다.',
        other: '이 플랫폼에서는 자동 설치가 제한될 수 있습니다. 아래 수동 명령을 사용하세요.'
      },
      statusTitle: '감지된 도구',
      ready: '준비됨',
      missing: '없음',
      rescan: '도구 다시 검색',
      installTitle: 'MagicLens로 설치',
      installHint: '비밀번호 / UAC 승인이 필요할 수 있습니다. 설치에 몇 분이 걸릴 수 있습니다.',
      installOpenVpn: 'OpenVPN CLI 설치',
      installWireGuard: 'WireGuard 설치',
      installSuccess: '{{tool}} 설치 완료',
      installFailed: '설치 실패',
      packagesTitle: '패키지 / 명령',
      packagesHint: '수동 설치를 위해 터미널에 이 명령을 복사하세요.',
      manualTitle: '수동 설치 단계',
      manual: {
        darwin: [
          '필요하면 https://brew.sh 에서 Homebrew를 설치하세요.',
          '실행: brew install openvpn',
          '선택: brew install wireguard-tools',
          '선택 GUI: brew install --cask tunnelblick 또는 WireGuard.app',
          'MagicLens를 다시 시작한 뒤 PIN + MFA로 연결하세요.'
        ],
        win32: [
          'PowerShell 또는 터미널을 엽니다.',
          'Community OpenVPN 설치(Connect 아님): winget install -e --id OpenVPNTechnologies.OpenVPN',
          'WireGuard 설치: winget install -e --id WireGuard.WireGuard',
          '대체: choco install openvpn -y  /  choco install wireguard -y',
          'Program Files\\OpenVPN\\bin의 openvpn.exe를 찾도록 MagicLens를 다시 시작하세요.'
        ],
        linux: [
          'Debian/Ubuntu: sudo apt-get install -y openvpn wireguard-tools',
          'Fedora/RHEL: sudo dnf install -y openvpn wireguard-tools',
          'Arch: sudo pacman -Sy openvpn wireguard-tools',
          '또는 Homebrew: brew install openvpn wireguard-tools',
          'MagicLens를 다시 시작한 뒤 PIN + MFA로 연결하세요.'
        ],
        other: [
          'OS용 OpenVPN community CLI를 설치하세요.',
          'WireGuard 프로필을 쓰면 wg-quick 도구를 설치하세요.',
          'MagicLens를 다시 시작하고 다시 연결하세요.'
        ]
      },
      connectNote:
        '도구가 준비되면 VPN 페이지로 돌아가 연결하세요. 도구가 없으면 연결 시 자동 설치도 시도합니다.'
    }
  },
  vpn: {
    heroEyebrow: '보안 터널',
    title: 'VPN',
    status: {
      connected: '연결됨',
      connecting: '연결 중',
      error: '오류',
      disconnected: '연결 끊김'
    },
    tunnelsUp: '터널 {{count}}개 가동 중',
    noActiveProfile: '활성 프로필 없음',
    disconnect: '연결 끊기',
    connect: '연결',
    edit: '편집',
    disconnectedToast: '연결이 끊겼습니다',
    connectedToast: '연결되었습니다',
    openedExternalToast: '시스템 VPN 앱에서 열림',
    connectFailed: '연결 실패',
    removedToast: '삭제됨',
    noToolsTitle: 'VPN 도구를 찾을 수 없음',
    noToolsDesc:
      'PIN + MFA에는 OpenVPN Community CLI(또는 WireGuard 도구)가 필요합니다. 설정 → VPN 확장에서 설치하거나 수동 단계를 따르세요. OpenVPN Connect는 지원되지 않습니다.',
    openVpnExtensions: 'VPN 확장',
    connectHelpTitle: '연결할 수 없음',
    connectHelpDesc:
      '도구가 없거나 설치에 실패했다면 VPN 확장을 열어 OpenVPN / WireGuard를 설치하고 OS별 단계를 확인하세요.',
    profilesTitle: 'VPN 프로필',
    addToStart: '시작하려면 구성을 추가하세요',
    filteredCount: '{{filtered}} / {{total}}',
    searchPlaceholder: '프로필 검색…',
    addFile: '파일 추가',
    paste: '붙여넣기',
    refresh: '새로고침',
    emptyDesc: '.ovpn 또는 WireGuard .conf 추가',
    chooseFile: '파일 선택',
    noMatch: '“{{query}}”와 일치하는 프로필 없음',
    live: '활성',
    usernameNotSet: '사용자 이름 미설정',
    noServerSet: '서버 미설정',
    moreActions: '추가 작업',
    menu: {
      editProfile: '프로필 편집',
      revealFile: '파일 보기',
      openExternally: '외부에서 열기',
      delete: '삭제'
    },
    draft: {
      editTitle: 'VPN 프로필 편집',
      reviewTitle: 'VPN 프로필 검토',
      correctFields: '자동 감지된 필드 수정',
      correctFieldsDesc:
        '사용자 이름 / 조직 / 서버는 .ovpn에서 파싱되며 자주 잘못됩니다 — 저장 전에 편집하세요.',
      name: '이름',
      provider: '제공자',
      username: '사용자 이름',
      usernameRequired: 'VPN 사용자 이름을 입력하세요',
      organization: '조직',
      organizationPlaceholder: '조직 이름',
      serverName: '서버 이름',
      serverHost: '서버 호스트',
      protocol: '프로토콜',
      protocolPlaceholder: 'udp / tcp',
      saveChanges: '변경 저장',
      saveProfile: '프로필 저장',
      updated: '프로필이 업데이트되었습니다',
      updateFailed: '업데이트 실패',
      missingConfig: '구성이 없습니다',
      added: 'VPN 프로필이 추가되었습니다',
      providers: {
        openvpn: 'OpenVPN (.ovpn)',
        pritunl: 'Pritunl (.ovpn)',
        wireguard: 'WireGuard (.conf)',
        generic: '자동 감지'
      }
    },
    auth: {
      title: '연결 · {{name}}',
      pinMfaOnly: 'PIN + MFA만',
      pinMfaDesc: '사용자 이름 / 서버 / 조직은 프로필에서 가져옵니다. 잘못되면 편집을 사용하세요.',
      user: '사용자:',
      server: '서버:',
      organization: '조직:',
      notSetEdit: '미설정 — 프로필 편집',
      setUsernameFirst: '먼저 편집에서 사용자 이름을 설정하거나 아래에 입력하세요',
      pin: 'PIN',
      pinRequired: 'PIN을 입력하세요',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP 코드',
      mfaRequired: 'MFA/OTP 코드를 입력하세요',
      mfaPlaceholder: '6자리 코드',
      editFields: '프로필 필드 편집'
    },
    pasteModal: {
      title: 'VPN 구성 붙여넣기',
      namePlaceholder: '사무실 VPN',
      config: '구성',
      configPlaceholder: '.ovpn 또는 WireGuard 구성 붙여넣기',
      continue: '계속 — 필드 검토'
    },
    panel: {
      connectionStatus: '연결 상태',
      healthyTunnel: '정상 터널',
      verifying: '연결됨 — 확인 중',
      connecting: '연결 중…',
      error: '오류',
      disconnected: '연결 끊김',
      tunnel: 'VPN 터널',
      opening: '여는 중…',
      server: 'VPN 서버',
      privateNetwork: '사설 네트워크',
      clusterEndpoints: '클러스터 엔드포인트',
      local: '로컬',
      download: '다운로드',
      upload: '업로드',
      total: '합계 {{size}}',
      checkProcess: 'VPN 프로세스 실행 중',
      checkInterface: 'IP가 있는 터널 인터페이스',
      checkTraffic: '트래픽 흐름',
      falsePositive:
        '연결됨으로 표시되지만 아직 터널 IP가 없습니다 — 경로가 준비될 때까지 사설 클러스터가 시간 초과됩니다.',
      providerLine: '제공자: {{provider}}',
      connectedAgo: '{{uptime}} 전에 연결됨',
      connectionFailed: '연결 실패'
    },
    session: {
      titleForCluster: '{{cluster}}용 VPN',
      titleConnect: 'VPN 연결 · {{name}}',
      alertTitle: 'VPN 세션',
      pinKnownDesc:
        'PIN은 약 5시간 동안 기억됩니다. 터널을 열려면 새 MFA 코드를 입력하세요. 연결 후 터널이 유지되는 동안 클러스터 전환 시 다시 묻지 않습니다.',
      pinUnknownDesc:
        'VPN마다 한 번 인증하세요. MagicLens는 터널을 유지합니다(Pritunl과 유사). 약 5시간 동안 클러스터 전환 시 재로그인이 필요 없습니다.',
      profile: '프로필:',
      user: '사용자:',
      pin: 'PIN',
      pinPlaceholder: 'VPN PIN',
      mfa: 'MFA / OTP',
      mfaPlaceholder: '6자리 코드',
      connectContinue: '연결하고 계속'
    },
    badge: {
      missing: 'VPN 없음',
      missingTooltip: '연결된 VPN 프로필을 찾을 수 없습니다 — 클러스터 편집에서 다시 지정하세요',
      connected: 'VPN 연결됨 · {{name}}',
      connecting: 'VPN 연결 중 · {{name}}',
      autoConnect: '자동 연결 · {{name}}'
    },
    clusterLink: {
      title: 'VPN 프로필 (자동 연결)',
      placeholder: 'VPN 없음 — 수동 연결',
      empty: '먼저 VPN 페이지에서 프로필을 추가하세요',
      hint: '이 클러스터 탭으로 전환하면 MagicLens가 이 VPN에 자동 연결합니다. PIN과 MFA는 첫 성공 연결 후 하루 동안 프로필별로 기억됩니다.'
    }
  },
  tour: {
    skip: '건너뛰기',
    back: '뒤로',
    next: '다음',
    getStarted: '시작하기',
    continue: '계속',
    chooseLanguage: '언어 선택',
    languageHint: '설정에서 언제든 바꿀 수 있습니다. 기능 안내가 선택한 언어로 표시됩니다.',
    slidesAria: '기능 슬라이드',
    slides: {
      welcome: {
        eyebrow: '환영합니다',
        title: 'Kubernetes용 MagicLens',
        body: '클러스터, 리소스, VPN, 로그, 터미널을 한곳에서 관리하는 빠른 데스크톱 클라이언트 — 오프라인 우선.'
      },
      clusters: {
        eyebrow: '클러스터',
        title: '다중 클러스터, 하나의 워크스페이스',
        body: 'kubeconfig를 가져오고 즐겨찾기를 고정한 뒤 클러스터 탭을 즉시 전환하세요.'
      },
      split: {
        eyebrow: '분할 보기',
        title: '두 클러스터를 동시에 비교',
        body: '분할 보기로 두 탭을 나란히 — 스테이징 vs 프로덕션 비교에 적합합니다.'
      },
      search: {
        eyebrow: '검색',
        title: '빠르게 찾기',
        body: '전역 검색으로 클러스터, 네임스페이스, 리소스로 이동 (기본 ⌘K / Ctrl+K — 설정 → 키보드에서 변경).'
      },
      resources: {
        eyebrow: '탐색기',
        title: '모든 리소스 살펴보기',
        body: '워크로드, Config, Network, Storage 등 — 라이브 감시, YAML 편집, 일괄 작업, 상세 패널.'
      },
      topology: {
        eyebrow: '토폴로지',
        title: '앱 연결을 한눈에',
        body: 'Deployment, Service, Ingress를 그래프로 매핑 — 비정상 Pod를 찾고 상세를 연 뒤 애플리케이션에서 의존성 맵으로 이동하세요.'
      },
      vpn: {
        eyebrow: 'VPN',
        title: '프라이빗 클러스터와 터널',
        body: 'OpenVPN / Pritunl / WireGuard 프로필을 추가하고 클러스터에 연결한 뒤 여러 터널을 유지하세요.'
      },
      ops: {
        eyebrow: '일상',
        title: '로그, exec, 터미널',
        body: 'Pod 로그 추적·다운로드, 컨테이너 exec, 로컬 터미널 — 하단 패널에 모았습니다.'
      },
      forward: {
        eyebrow: '액세스',
        title: '포트 포워딩이 간단',
        body: '몇 번의 클릭으로 Pod/Service를 로컬 포트로 — 작업 중에도 세션이 보입니다.'
      }
    }
  },
  resourceNav: {
    virtual: {
      topology: '토폴로지'
    }
  },
  topology: {
    title: '토폴로지 및 애플리케이션',
    subtitle: '이 네임스페이스의 워크로드, 서비스, 의존성의 실시간 맵.',
    modes: {
      graph: '토폴로지',
      apps: '애플리케이션',
      resources: '리소스'
    },
    refresh: '새로고침',
    empty: '이 네임스페이스에 매핑할 리소스가 없습니다.',
    loading: '토폴로지 구성 중…',
    error: '토폴로지를 불러오지 못했습니다',
    search: '리소스 검색…',
    filterAll: '전체',
    insights: '인사이트',
    noInsights: '문제가 감지되지 않았습니다.',
    health: {
      healthy: '정상',
      degraded: '저하',
      error: '오류',
      unknown: '알 수 없음'
    },
    apps: {
      replicas: '레플리카',
      uptime: '경과',
      errors: '오류',
      empty: '애플리케이션이 없습니다. app.kubernetes.io/name 레이블을 추가하세요.'
    },
    drawer: {
      overview: '개요',
      close: '닫기'
    },
    insightItems: {
      crashloopTitle: 'CrashLoopBackOff: {{name}}',
      crashloopDetail: 'Pod가 크래시 루프 중입니다',
      serviceEmptyTitle: '엔드포인트 없는 Service: {{name}}',
      serviceEmptyDetail: '셀렉터가 이 네임스페이스의 Pod와 일치하지 않습니다.',
      ingressOrphanTitle: '백엔드 없는 Ingress: {{name}}',
      ingressOrphanDetail: 'HTTP 경로 또는 기본 백엔드가 없습니다.',
      brokenRouteTitle: '깨진 Ingress 의존성',
      brokenRouteDetail: '라우트가 없는 서비스를 가리킵니다 ({{target}}).',
      zeroReadyTitle: '준비된 레플리카 없음: {{name}}',
      zeroReadyDetail: '{{ready}}/{{desired}} ready'
    }
  }
}
