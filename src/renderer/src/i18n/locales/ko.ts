import type { TranslationResources } from './en'

export const ko: TranslationResources = {
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
      'OpenVPN(brew install openvpn), Tunnelblick, WireGuard.app 또는 wireguard-tools를 설치하세요.',
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
  }
}
