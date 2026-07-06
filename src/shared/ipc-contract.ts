export const IPC = {
  KUBECONFIG_PICK_FILE: 'kubeconfig:pickFile',
  KUBECONFIG_PARSE_FILE: 'kubeconfig:parseFile',
  KUBECONFIG_PARSE_STRING: 'kubeconfig:parseString',
  KUBECONFIG_PICK_DIRECTORY: 'kubeconfig:pickDirectory',
  KUBECONFIG_SCAN_DIRECTORY: 'kubeconfig:scanDirectory',
  KUBECONFIG_SCAN_DEFAULT: 'kubeconfig:scanDefault',

  CLUSTER_CONNECT: 'cluster:connect',
  CLUSTER_DISCONNECT: 'cluster:disconnect',
  CLUSTER_GET_VERSION: 'cluster:getVersion',
  CLUSTER_LIST_NAMESPACES: 'cluster:listNamespaces',

  RESOURCE_LIST: 'resource:list',
  RESOURCE_WATCH_START: 'resource:watch:start',
  RESOURCE_WATCH_STOP: 'resource:watch:stop',
  RESOURCE_WATCH_EVENT: 'resource:watch:event',
  RESOURCE_WATCH_STATUS: 'resource:watch:status',
  RESOURCE_GET_MANIFEST: 'resource:getManifest',
  RESOURCE_APPLY_MANIFEST: 'resource:applyManifest',
  RESOURCE_CREATE_MANIFEST: 'resource:createManifest',
  RESOURCE_DELETE: 'resource:delete',

  CLUSTER_STORE_LIST: 'clusterStore:list',
  CLUSTER_STORE_ADD: 'clusterStore:add',
  CLUSTER_STORE_UPDATE: 'clusterStore:update',
  CLUSTER_STORE_REMOVE: 'clusterStore:remove',

  UI_STATE_GET: 'uiState:get',
  UI_STATE_SET: 'uiState:set',

  METRICS_GET_CLUSTER_SUMMARY: 'metrics:getClusterSummary',
  METRICS_GET_NODE_METRICS: 'metrics:getNodeMetrics',

  APP_GET_INFO: 'app:getInfo',
  APP_GET_WELCOME_STATE: 'app:getWelcomeState',
  APP_SET_WELCOME_SEEN: 'app:setWelcomeSeen',
  APP_SET_SPLASH_SEEN: 'app:setSplashSeen',

  POD_GET_DETAIL: 'pod:getDetail',
  POD_GET_METRICS: 'pod:getMetrics',
  POD_GET_NETWORK: 'pod:getNetwork',

  POD_LOGS_START: 'pod:logs:start',
  POD_LOGS_STOP: 'pod:logs:stop',
  POD_LOGS_DATA: 'pod:logs:data',
  POD_LOGS_ENDED: 'pod:logs:ended',
  POD_LOGS_DOWNLOAD: 'pod:logs:download',

  POD_EXEC_START: 'pod:exec:start',
  POD_EXEC_INPUT: 'pod:exec:input',
  POD_EXEC_RESIZE: 'pod:exec:resize',
  POD_EXEC_STOP: 'pod:exec:stop',
  POD_EXEC_DATA: 'pod:exec:data',
  POD_EXEC_EXIT: 'pod:exec:exit',

  SERVICE_GET_DETAIL: 'service:getDetail',

  PORT_FORWARD_START_POD: 'portForward:startPod',
  PORT_FORWARD_START_SERVICE: 'portForward:startService',
  PORT_FORWARD_STOP: 'portForward:stop',
  PORT_FORWARD_LIST: 'portForward:list',

  TERMINAL_START: 'terminal:start',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_STOP: 'terminal:stop',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  DISCOVERY_LIST: 'discovery:list',
  DISCOVERY_LIST_CUSTOM_RESOURCE_KINDS: 'discovery:listCustomResourceKinds',
  DISCOVERY_LIST_DYNAMIC_RESOURCES: 'discovery:listDynamicResources',

  HELM_LIST_RELEASES: 'helm:listReleases',
  HELM_LIST_CHARTS: 'helm:listCharts',
  HELM_GET_HISTORY: 'helm:getHistory',
  HELM_ROLLBACK: 'helm:rollback',

  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_SKIP_VERSION: 'update:skipVersion',
  UPDATE_REMIND_LATER: 'update:remindLater',
  UPDATE_GET_STATE: 'update:getState',
  UPDATE_GET_SETTINGS: 'update:getSettings',
  UPDATE_SET_SETTINGS: 'update:setSettings',
  UPDATE_STATE_CHANGED: 'update:stateChanged',
  UPDATE_OPEN_RELEASE_PAGE: 'update:openReleasePage'
} as const
