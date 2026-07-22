import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  ParsedKubeconfigResult,
  PickDirectoryResult,
  PickFileResult,
  ScanDirectoryResponse,
  ReadKubeconfigSourceRequest,
  ReadKubeconfigSourceResponse,
  WriteKubeconfigFileRequest,
  WriteKubeconfigFileResponse,
  ExportKubeconfigContextRequest,
  ExportKubeconfigContextResponse
} from '@shared/types/kubeconfig'
import type {
  ClusterIdRequest,
  ClusterVersionResponse,
  ConnectRequest,
  ConnectResponse,
  NamespacesResponse,
  PersistedClusterEntry,
  PersistedUiState
} from '@shared/types/cluster'
import type { ResourceListRequest, ResourceListResponse } from '@shared/types/resource'
import type { ResourceEventsRequest, ResourceEventsResponse, ClusterEventsRequest } from '@shared/types/resourceEvents'
import type {
  ResourceWatchEventPayload,
  ResourceWatchSessionRequest,
  ResourceWatchStartRequest,
  ResourceWatchStartResponse,
  ResourceWatchStatusPayload
} from '@shared/types/resourceWatch'
import type {
  ResourceApplyManifestRequest,
  ResourceApplyManifestResponse,
  ResourceCreateManifestRequest,
  ResourceCreateManifestResponse,
  ResourceDeleteRequest,
  ResourceDeleteResponse,
  ResourceGetManifestRequest,
  ResourceGetManifestResponse
} from '@shared/types/resourceMutation'
import type {
  ClusterMetricsRangeRequest,
  ClusterMetricsSummary,
  DeploymentMetricsRangeRequest,
  HpaMetricsRangeRequest,
  MetricsRangeResponse,
  NodeMetricsRangeRequest,
  NodeMetricsResponse,
  NodePressureRequest,
  PodMetricsRangeRequest
} from '@shared/types/metrics'
import type { RbacCanIRequest, RbacCanIResponse, ResourcePermissionsRequest, ResourcePermissionsResponse } from '@shared/types/rbac'
import type {
  RolloutHistoryResponse,
  WorkloadActionResponse,
  WorkloadChangeImageRequest,
  WorkloadContextInfo,
  WorkloadPermissionsRequest,
  WorkloadPermissionsResponse,
  WorkloadRollbackRequest,
  WorkloadScaleRequest,
  WorkloadTargetRequest
} from '@shared/types/workload'
import type {
  PrometheusDiscoverRequest,
  PrometheusQueryRangeRequest,
  PrometheusQueryRequest,
  PrometheusQueryResponse,
  PrometheusStatus
} from '@shared/types/prometheus'
import type { AppInfoResponse, DisplaySettings, WelcomeStateResponse } from '@shared/types/app'
import type {
  PodDetailResponse,
  PodExecDataPayload,
  PodExecExitPayload,
  PodExecInputRequest,
  PodExecResizeRequest,
  PodExecSessionRequest,
  PodExecStartRequest,
  PodLogsDataPayload,
  PodLogsDownloadRequest,
  PodLogsDownloadResponse,
  PodLogsEndedPayload,
  PodLogsSessionRequest,
  PodLogsStartRequest,
  PodMetricsResponse,
  PodNetworkResponse,
  PodResourceRequest
} from '@shared/types/pod'
import type {
  NodeExecInputRequest,
  NodeExecResizeRequest,
  NodeExecSessionRequest,
  NodeExecStartRequest
} from '@shared/types/node'
import type { ServiceDetailResponse, ServiceResourceRequest } from '@shared/types/service'
import type {
  VpnAuthCredentials,
  VpnConnectResult,
  VpnProfileSummary,
  VpnProvider,
  VpnRuntimeStatus
} from '@shared/types/vpn'
import type {
  PortForwardListRequest,
  PortForwardListResponse,
  PortForwardStartPodRequest,
  PortForwardStartResponse,
  PortForwardStartServiceRequest,
  PortForwardStopRequest
} from '@shared/types/portForward'
import type {
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalStartRequest,
  TerminalStartResponse,
  TerminalStopRequest
} from '@shared/types/terminal'
import type {
  CustomResourceKindsRequest,
  CustomResourceKindsResponse,
  DiscoveryRequest,
  DiscoveryResponse,
  DynamicResourceListRequest,
  DynamicResourceListResponse
} from '@shared/types/discovery'
import type {
  HelmChartsResponse,
  HelmReleaseHistoryRequest,
  HelmReleaseHistoryResponse,
  HelmReleaseDetailRequest,
  HelmReleaseDetailResponse,
  HelmReleasesResponse,
  HelmRollbackRequest,
  HelmRollbackResponse,
  HelmUninstallChartRequest,
  HelmUninstallChartResponse,
  HelmUninstallReleaseRequest,
  HelmUninstallReleaseResponse
} from '@shared/types/helm'
import type { SkipVersionRequest, UpdateSettings, UpdateState } from '@shared/types/update'
import type { GlobalSearchRequest, GlobalSearchResponse } from '@shared/types/search'

const api = {
  kubeconfig: {
    pickFile: (): Promise<PickFileResult> => ipcRenderer.invoke(IPC.KUBECONFIG_PICK_FILE),
    parseFile: (req: { filePath: string }): Promise<ParsedKubeconfigResult> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_PARSE_FILE, req),
    parseString: (req: { yaml: string }): Promise<ParsedKubeconfigResult> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_PARSE_STRING, req),
    pickDirectory: (): Promise<PickDirectoryResult> => ipcRenderer.invoke(IPC.KUBECONFIG_PICK_DIRECTORY),
    scanDirectory: (req: { directoryPath: string }): Promise<ScanDirectoryResponse> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_SCAN_DIRECTORY, req),
    scanDefault: (): Promise<ScanDirectoryResponse> => ipcRenderer.invoke(IPC.KUBECONFIG_SCAN_DEFAULT),
    readSource: (req: ReadKubeconfigSourceRequest): Promise<ReadKubeconfigSourceResponse> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_READ_SOURCE, req),
    writeFile: (req: WriteKubeconfigFileRequest): Promise<WriteKubeconfigFileResponse> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_WRITE_FILE, req),
    exportContext: (req: ExportKubeconfigContextRequest): Promise<ExportKubeconfigContextResponse> =>
      ipcRenderer.invoke(IPC.KUBECONFIG_EXPORT_CONTEXT, req)
  },
  cluster: {
    connect: (req: ConnectRequest): Promise<ConnectResponse> => ipcRenderer.invoke(IPC.CLUSTER_CONNECT, req),
    disconnect: (req: ClusterIdRequest): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.CLUSTER_DISCONNECT, req),
    getVersion: (req: ClusterIdRequest): Promise<ClusterVersionResponse> =>
      ipcRenderer.invoke(IPC.CLUSTER_GET_VERSION, req),
    listNamespaces: (req: ClusterIdRequest): Promise<NamespacesResponse> =>
      ipcRenderer.invoke(IPC.CLUSTER_LIST_NAMESPACES, req)
  },
  resource: {
    list: (req: ResourceListRequest): Promise<ResourceListResponse> => ipcRenderer.invoke(IPC.RESOURCE_LIST, req),
    watch: {
      start: (req: ResourceWatchStartRequest): Promise<ResourceWatchStartResponse> =>
        ipcRenderer.invoke(IPC.RESOURCE_WATCH_START, req),
      stop: (req: ResourceWatchSessionRequest): Promise<{ ok: true }> =>
        ipcRenderer.invoke(IPC.RESOURCE_WATCH_STOP, req),
      onEvent: (cb: (payload: ResourceWatchEventPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: ResourceWatchEventPayload): void => cb(payload)
        ipcRenderer.on(IPC.RESOURCE_WATCH_EVENT, listener)
        return () => ipcRenderer.removeListener(IPC.RESOURCE_WATCH_EVENT, listener)
      },
      onStatus: (cb: (payload: ResourceWatchStatusPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: ResourceWatchStatusPayload): void => cb(payload)
        ipcRenderer.on(IPC.RESOURCE_WATCH_STATUS, listener)
        return () => ipcRenderer.removeListener(IPC.RESOURCE_WATCH_STATUS, listener)
      }
    },
    getManifest: (req: ResourceGetManifestRequest): Promise<ResourceGetManifestResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_GET_MANIFEST, req),
    applyManifest: (req: ResourceApplyManifestRequest): Promise<ResourceApplyManifestResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_APPLY_MANIFEST, req),
    createManifest: (req: ResourceCreateManifestRequest): Promise<ResourceCreateManifestResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_CREATE_MANIFEST, req),
    delete: (req: ResourceDeleteRequest): Promise<ResourceDeleteResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_DELETE, req),
    listEvents: (req: ResourceEventsRequest): Promise<ResourceEventsResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_LIST_EVENTS, req),
    listClusterEvents: (req: ClusterEventsRequest): Promise<ResourceEventsResponse> =>
      ipcRenderer.invoke(IPC.RESOURCE_LIST_CLUSTER_EVENTS, req)
  },
  session: {
    setScope: (scope: string): Promise<{ ok: true; scope: string }> =>
      ipcRenderer.invoke(IPC.SESSION_SET_SCOPE, { scope })
  },
  clusterStore: {
    list: (): Promise<{ clusters: PersistedClusterEntry[] }> => ipcRenderer.invoke(IPC.CLUSTER_STORE_LIST),
    add: (entry: PersistedClusterEntry): Promise<{ ok: true } | { ok: false; reason: 'duplicate' }> =>
      ipcRenderer.invoke(IPC.CLUSTER_STORE_ADD, entry),
    update: (entry: PersistedClusterEntry): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.CLUSTER_STORE_UPDATE, entry),
    remove: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.CLUSTER_STORE_REMOVE, { id }),
    upsertOrg: (input: {
      remoteId: string
      orgKubeconfigId: string
      customName: string
      contextName: string
      source?: import('@shared/types/kubeconfig').KubeconfigSource
      yamlContent?: string
      userEmail?: string
      endpoint?: string
      environment?: string
    }): Promise<{ ok: true; cluster: PersistedClusterEntry }> =>
      ipcRenderer.invoke(IPC.CLUSTER_STORE_UPSERT_ORG, input),
    syncOrgIds: (
      orgKubeconfigIds: string[],
      remoteIds: string[],
      successfullySyncedOrgIds?: string[]
    ): Promise<{ ok: true; removed: string[] }> =>
      ipcRenderer.invoke(IPC.CLUSTER_STORE_SYNC_ORG_IDS, {
        orgKubeconfigIds,
        remoteIds,
        successfullySyncedOrgIds
      })
  },
  clusterVpn: {
    getLinks: (): Promise<{ links: Record<string, string> }> =>
      ipcRenderer.invoke(IPC.CLUSTER_VPN_LINKS_GET),
    setLink: (
      clusterId: string,
      vpnProfileId: string | null
    ): Promise<{ ok: true; links: Record<string, string> }> =>
      ipcRenderer.invoke(IPC.CLUSTER_VPN_LINKS_SET, { clusterId, vpnProfileId }),
    removeLink: (clusterId: string): Promise<{ ok: true; links: Record<string, string> }> =>
      ipcRenderer.invoke(IPC.CLUSTER_VPN_LINKS_REMOVE, { clusterId })
  },
  uiState: {
    get: (): Promise<PersistedUiState> => ipcRenderer.invoke(IPC.UI_STATE_GET),
    set: (state: PersistedUiState): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UI_STATE_SET, state)
  },
  metrics: {
    getClusterSummary: (req: ClusterIdRequest): Promise<ClusterMetricsSummary> =>
      ipcRenderer.invoke(IPC.METRICS_GET_CLUSTER_SUMMARY, req),
    getNodeMetrics: (req: ClusterIdRequest): Promise<NodeMetricsResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_NODE_METRICS, req),
    getNodeRange: (req: NodeMetricsRangeRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_NODE_RANGE, req),
    getPodRange: (req: PodMetricsRangeRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_POD_RANGE, req),
    getClusterRange: (req: ClusterMetricsRangeRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_CLUSTER_RANGE, req),
    getHpaRange: (req: HpaMetricsRangeRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_HPA_RANGE, req),
    getDeploymentRange: (req: DeploymentMetricsRangeRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_DEPLOYMENT_RANGE, req),
    getNodePressure: (req: NodePressureRequest): Promise<MetricsRangeResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_NODE_PRESSURE, req)
  },
  rbac: {
    canI: (req: RbacCanIRequest): Promise<RbacCanIResponse> => ipcRenderer.invoke(IPC.RBAC_CAN_I, req),
    getResourcePermissions: (req: ResourcePermissionsRequest): Promise<ResourcePermissionsResponse> =>
      ipcRenderer.invoke(IPC.RBAC_GET_RESOURCE_PERMISSIONS, req)
  },
  workload: {
    getContext: (req: WorkloadTargetRequest): Promise<WorkloadContextInfo | { error: string }> =>
      ipcRenderer.invoke(IPC.WORKLOAD_GET_CONTEXT, req),
    getPermissions: (req: WorkloadPermissionsRequest): Promise<WorkloadPermissionsResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_GET_PERMISSIONS, req),
    scale: (req: WorkloadScaleRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_SCALE, req),
    restart: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_RESTART, req),
    pauseRollout: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_PAUSE_ROLLOUT, req),
    resumeRollout: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_RESUME_ROLLOUT, req),
    rolloutHistory: (req: WorkloadTargetRequest): Promise<RolloutHistoryResponse | { error: string }> =>
      ipcRenderer.invoke(IPC.WORKLOAD_ROLLOUT_HISTORY, req),
    rollback: (req: WorkloadRollbackRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_ROLLBACK, req),
    changeImage: (req: WorkloadChangeImageRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_CHANGE_IMAGE, req),
    suspendJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_SUSPEND_JOB, req),
    resumeJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_RESUME_JOB, req),
    rerunJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_RERUN_JOB, req),
    suspendCronJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_SUSPEND_CRONJOB, req),
    resumeCronJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_RESUME_CRONJOB, req),
    triggerCronJob: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_TRIGGER_CRONJOB, req),
    deletePods: (req: WorkloadTargetRequest): Promise<WorkloadActionResponse> =>
      ipcRenderer.invoke(IPC.WORKLOAD_DELETE_PODS, req)
  },
  prometheus: {
    discover: (req: PrometheusDiscoverRequest): Promise<PrometheusStatus> =>
      ipcRenderer.invoke(IPC.PROMETHEUS_DISCOVER, req),
    getStatus: (req: ClusterIdRequest): Promise<PrometheusStatus> =>
      ipcRenderer.invoke(IPC.PROMETHEUS_GET_STATUS, req),
    query: (req: PrometheusQueryRequest): Promise<PrometheusQueryResponse> =>
      ipcRenderer.invoke(IPC.PROMETHEUS_QUERY, req),
    queryRange: (req: PrometheusQueryRangeRequest): Promise<PrometheusQueryResponse> =>
      ipcRenderer.invoke(IPC.PROMETHEUS_QUERY_RANGE, req)
  },
  app: {
    getInfo: (): Promise<AppInfoResponse> => ipcRenderer.invoke(IPC.APP_GET_INFO),
    getWelcomeState: (): Promise<WelcomeStateResponse> => ipcRenderer.invoke(IPC.APP_GET_WELCOME_STATE),
    setWelcomeSeen: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.APP_SET_WELCOME_SEEN),
    setSplashSeen: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.APP_SET_SPLASH_SEEN),
    getDisplaySettings: (): Promise<DisplaySettings> => ipcRenderer.invoke(IPC.APP_GET_DISPLAY_SETTINGS),
    setDisplaySettings: (patch: Partial<DisplaySettings>): Promise<DisplaySettings> =>
      ipcRenderer.invoke(IPC.APP_SET_DISPLAY_SETTINGS, patch)
  },
  pod: {
    getDetail: (req: PodResourceRequest): Promise<PodDetailResponse> => ipcRenderer.invoke(IPC.POD_GET_DETAIL, req),
    getMetrics: (req: PodResourceRequest): Promise<PodMetricsResponse> =>
      ipcRenderer.invoke(IPC.POD_GET_METRICS, req),
    getNetwork: (req: PodResourceRequest): Promise<PodNetworkResponse> =>
      ipcRenderer.invoke(IPC.POD_GET_NETWORK, req),
    logs: {
      start: (req: PodLogsStartRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_LOGS_START, req),
      stop: (req: PodLogsSessionRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_LOGS_STOP, req),
      download: (req: PodLogsDownloadRequest): Promise<PodLogsDownloadResponse> =>
        ipcRenderer.invoke(IPC.POD_LOGS_DOWNLOAD, req),
      onData: (cb: (payload: PodLogsDataPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodLogsDataPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_LOGS_DATA, listener)
        return () => ipcRenderer.removeListener(IPC.POD_LOGS_DATA, listener)
      },
      onEnded: (cb: (payload: PodLogsEndedPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodLogsEndedPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_LOGS_ENDED, listener)
        return () => ipcRenderer.removeListener(IPC.POD_LOGS_ENDED, listener)
      }
    },
    exec: {
      start: (req: PodExecStartRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_EXEC_START, req),
      input: (req: PodExecInputRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_EXEC_INPUT, req),
      resize: (req: PodExecResizeRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_EXEC_RESIZE, req),
      stop: (req: PodExecSessionRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.POD_EXEC_STOP, req),
      onData: (cb: (payload: PodExecDataPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodExecDataPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_EXEC_DATA, listener)
        return () => ipcRenderer.removeListener(IPC.POD_EXEC_DATA, listener)
      },
      onExit: (cb: (payload: PodExecExitPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodExecExitPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_EXEC_EXIT, listener)
        return () => ipcRenderer.removeListener(IPC.POD_EXEC_EXIT, listener)
      }
    }
  },
  node: {
    exec: {
      start: (req: NodeExecStartRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.NODE_EXEC_START, req),
      input: (req: NodeExecInputRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.NODE_EXEC_INPUT, req),
      resize: (req: NodeExecResizeRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.NODE_EXEC_RESIZE, req),
      stop: (req: NodeExecSessionRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.NODE_EXEC_STOP, req),
      onData: (cb: (payload: PodExecDataPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodExecDataPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_EXEC_DATA, listener)
        return () => ipcRenderer.removeListener(IPC.POD_EXEC_DATA, listener)
      },
      onExit: (cb: (payload: PodExecExitPayload) => void): (() => void) => {
        const listener = (_e: Electron.IpcRendererEvent, payload: PodExecExitPayload): void => cb(payload)
        ipcRenderer.on(IPC.POD_EXEC_EXIT, listener)
        return () => ipcRenderer.removeListener(IPC.POD_EXEC_EXIT, listener)
      }
    }
  },
  service: {
    getDetail: (req: ServiceResourceRequest): Promise<ServiceDetailResponse> =>
      ipcRenderer.invoke(IPC.SERVICE_GET_DETAIL, req)
  },
  portForward: {
    startPod: (req: PortForwardStartPodRequest): Promise<PortForwardStartResponse> =>
      ipcRenderer.invoke(IPC.PORT_FORWARD_START_POD, req),
    startService: (req: PortForwardStartServiceRequest): Promise<PortForwardStartResponse> =>
      ipcRenderer.invoke(IPC.PORT_FORWARD_START_SERVICE, req),
    stop: (req: PortForwardStopRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.PORT_FORWARD_STOP, req),
    list: (req: PortForwardListRequest): Promise<PortForwardListResponse> =>
      ipcRenderer.invoke(IPC.PORT_FORWARD_LIST, req)
  },
  terminal: {
    start: (req: TerminalStartRequest): Promise<TerminalStartResponse> => ipcRenderer.invoke(IPC.TERMINAL_START, req),
    input: (req: TerminalInputRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.TERMINAL_INPUT, req),
    resize: (req: TerminalResizeRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.TERMINAL_RESIZE, req),
    stop: (req: TerminalStopRequest): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.TERMINAL_STOP, req),
    onData: (cb: (payload: TerminalDataPayload) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: TerminalDataPayload): void => cb(payload)
      ipcRenderer.on(IPC.TERMINAL_DATA, listener)
      return () => ipcRenderer.removeListener(IPC.TERMINAL_DATA, listener)
    },
    onExit: (cb: (payload: TerminalExitPayload) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: TerminalExitPayload): void => cb(payload)
      ipcRenderer.on(IPC.TERMINAL_EXIT, listener)
      return () => ipcRenderer.removeListener(IPC.TERMINAL_EXIT, listener)
    }
  },
  discovery: {
    list: (req: DiscoveryRequest): Promise<DiscoveryResponse> => ipcRenderer.invoke(IPC.DISCOVERY_LIST, req),
    listCustomResourceKinds: (req: CustomResourceKindsRequest): Promise<CustomResourceKindsResponse> =>
      ipcRenderer.invoke(IPC.DISCOVERY_LIST_CUSTOM_RESOURCE_KINDS, req),
    listDynamicResources: (req: DynamicResourceListRequest): Promise<DynamicResourceListResponse> =>
      ipcRenderer.invoke(IPC.DISCOVERY_LIST_DYNAMIC_RESOURCES, req)
  },
  helm: {
    listReleases: (req: ClusterIdRequest): Promise<HelmReleasesResponse> =>
      ipcRenderer.invoke(IPC.HELM_LIST_RELEASES, req),
    listCharts: (req: ClusterIdRequest): Promise<HelmChartsResponse> => ipcRenderer.invoke(IPC.HELM_LIST_CHARTS, req),
    getHistory: (req: HelmReleaseHistoryRequest): Promise<HelmReleaseHistoryResponse> =>
      ipcRenderer.invoke(IPC.HELM_GET_HISTORY, req),
    getReleaseDetail: (req: HelmReleaseDetailRequest): Promise<HelmReleaseDetailResponse> =>
      ipcRenderer.invoke(IPC.HELM_GET_RELEASE_DETAIL, req),
    rollback: (req: HelmRollbackRequest): Promise<HelmRollbackResponse> => ipcRenderer.invoke(IPC.HELM_ROLLBACK, req),
    uninstallChart: (req: HelmUninstallChartRequest): Promise<HelmUninstallChartResponse> =>
      ipcRenderer.invoke(IPC.HELM_UNINSTALL_CHART, req),
    uninstallRelease: (req: HelmUninstallReleaseRequest): Promise<HelmUninstallReleaseResponse> =>
      ipcRenderer.invoke(IPC.HELM_UNINSTALL_RELEASE, req)
  },
  update: {
    check: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_CHECK),
    download: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
    install: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
    skipVersion: (req: SkipVersionRequest): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.UPDATE_SKIP_VERSION, req),
    remindLater: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_REMIND_LATER),
    openReleasePage: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_OPEN_RELEASE_PAGE),
    getState: (): Promise<UpdateState> => ipcRenderer.invoke(IPC.UPDATE_GET_STATE),
    getSettings: (): Promise<UpdateSettings> => ipcRenderer.invoke(IPC.UPDATE_GET_SETTINGS),
    setSettings: (patch: Partial<UpdateSettings>): Promise<UpdateSettings> =>
      ipcRenderer.invoke(IPC.UPDATE_SET_SETTINGS, patch),
    onStateChanged: (cb: (state: UpdateState) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: UpdateState): void => cb(state)
      ipcRenderer.on(IPC.UPDATE_STATE_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC.UPDATE_STATE_CHANGED, listener)
    }
  },
  search: {
    resources: (req: GlobalSearchRequest): Promise<GlobalSearchResponse> =>
      ipcRenderer.invoke(IPC.SEARCH_RESOURCES, req)
  },
  enterprise: {
    request: (req: {
      url: string
      method?: string
      headers?: Record<string, string>
      body?: string | null
    }): Promise<{ ok: boolean; status: number; body: string }> =>
      ipcRenderer.invoke(IPC.ENTERPRISE_HTTP, req)
  },
  vpn: {
    list: (): Promise<{ profiles: VpnProfileSummary[]; status: VpnRuntimeStatus }> =>
      ipcRenderer.invoke(IPC.VPN_LIST),
    getStatus: (): Promise<VpnRuntimeStatus> => ipcRenderer.invoke(IPC.VPN_GET_STATUS),
    pickFile: (): Promise<
      | { ok: false; canceled: true }
      | {
          ok: true
          name: string
          config: string
          provider: VpnProvider
          filePath: string
          username?: string
          organization?: string
          serverHost?: string
          serverName?: string
          protocol?: string
        }
    > => ipcRenderer.invoke(IPC.VPN_PICK_FILE),
    connect: (
      id: string,
      preferExternal?: boolean,
      credentials?: VpnAuthCredentials
    ): Promise<VpnConnectResult> =>
      ipcRenderer.invoke(IPC.VPN_CONNECT, { id, preferExternal, credentials }),
    disconnect: (id?: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.VPN_DISCONNECT, id ? { id } : undefined),
    setFocus: (profileId: string | null): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.VPN_SET_FOCUS, { profileId }),
    reveal: (id: string): Promise<{ ok: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke(IPC.VPN_REVEAL, { id }),
    upsertOrg: (input: {
      remoteId: string
      name: string
      config: string
      provider?: string
      description?: string
      username?: string
      organization?: string
      serverHost?: string
      serverName?: string
      protocol?: string
    }): Promise<{ ok: true; profile: VpnProfileSummary }> =>
      ipcRenderer.invoke(IPC.VPN_UPSERT_ORG, input),
    add: (input: {
      name: string
      config: string
      provider?: string
      description?: string
      username?: string
      organization?: string
      serverHost?: string
      serverName?: string
      protocol?: string
    }): Promise<{ ok: true; profile: VpnProfileSummary }> => ipcRenderer.invoke(IPC.VPN_ADD, input),
    update: (input: {
      id: string
      name?: string
      username?: string
      organization?: string
      serverHost?: string
      serverName?: string
      protocol?: string
      description?: string
    }): Promise<{ ok: true; profile: VpnProfileSummary } | { ok: false; error: string }> =>
      ipcRenderer.invoke(IPC.VPN_UPDATE, input),
    remove: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke(IPC.VPN_REMOVE, { id }),
    syncOrgIds: (remoteIds: string[]): Promise<{ ok: true; removed: string[] }> =>
      ipcRenderer.invoke(IPC.VPN_SYNC_ORG_IDS, { remoteIds }),
    onStatusChanged: (cb: (status: VpnRuntimeStatus) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, status: VpnRuntimeStatus): void => cb(status)
      ipcRenderer.on(IPC.VPN_STATUS_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC.VPN_STATUS_CHANGED, listener)
    }
  }
}

export type MagicLensApi = typeof api

contextBridge.exposeInMainWorld('api', api)
