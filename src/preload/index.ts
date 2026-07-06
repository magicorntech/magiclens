import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  ParsedKubeconfigResult,
  PickDirectoryResult,
  PickFileResult,
  ScanDirectoryResponse
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
import type { ClusterMetricsSummary, NodeMetricsResponse } from '@shared/types/metrics'
import type { AppInfoResponse, WelcomeStateResponse } from '@shared/types/app'
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
import type { ServiceDetailResponse, ServiceResourceRequest } from '@shared/types/service'
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
  HelmReleasesResponse,
  HelmRollbackRequest,
  HelmRollbackResponse
} from '@shared/types/helm'
import type { SkipVersionRequest, UpdateSettings, UpdateState } from '@shared/types/update'

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
    scanDefault: (): Promise<ScanDirectoryResponse> => ipcRenderer.invoke(IPC.KUBECONFIG_SCAN_DEFAULT)
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
    list: (req: ResourceListRequest): Promise<ResourceListResponse> => ipcRenderer.invoke(IPC.RESOURCE_LIST, req)
  },
  clusterStore: {
    list: (): Promise<{ clusters: PersistedClusterEntry[] }> => ipcRenderer.invoke(IPC.CLUSTER_STORE_LIST),
    add: (entry: PersistedClusterEntry): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.CLUSTER_STORE_ADD, entry),
    update: (entry: PersistedClusterEntry): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.CLUSTER_STORE_UPDATE, entry),
    remove: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.CLUSTER_STORE_REMOVE, { id })
  },
  uiState: {
    get: (): Promise<PersistedUiState> => ipcRenderer.invoke(IPC.UI_STATE_GET),
    set: (state: PersistedUiState): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UI_STATE_SET, state)
  },
  metrics: {
    getClusterSummary: (req: ClusterIdRequest): Promise<ClusterMetricsSummary> =>
      ipcRenderer.invoke(IPC.METRICS_GET_CLUSTER_SUMMARY, req),
    getNodeMetrics: (req: ClusterIdRequest): Promise<NodeMetricsResponse> =>
      ipcRenderer.invoke(IPC.METRICS_GET_NODE_METRICS, req)
  },
  app: {
    getInfo: (): Promise<AppInfoResponse> => ipcRenderer.invoke(IPC.APP_GET_INFO),
    getWelcomeState: (): Promise<WelcomeStateResponse> => ipcRenderer.invoke(IPC.APP_GET_WELCOME_STATE),
    setWelcomeSeen: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.APP_SET_WELCOME_SEEN)
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
    rollback: (req: HelmRollbackRequest): Promise<HelmRollbackResponse> => ipcRenderer.invoke(IPC.HELM_ROLLBACK, req)
  },
  update: {
    check: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_CHECK),
    download: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
    install: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
    skipVersion: (req: SkipVersionRequest): Promise<{ ok: true }> =>
      ipcRenderer.invoke(IPC.UPDATE_SKIP_VERSION, req),
    remindLater: (): Promise<{ ok: true }> => ipcRenderer.invoke(IPC.UPDATE_REMIND_LATER),
    getState: (): Promise<UpdateState> => ipcRenderer.invoke(IPC.UPDATE_GET_STATE),
    getSettings: (): Promise<UpdateSettings> => ipcRenderer.invoke(IPC.UPDATE_GET_SETTINGS),
    setSettings: (patch: Partial<UpdateSettings>): Promise<UpdateSettings> =>
      ipcRenderer.invoke(IPC.UPDATE_SET_SETTINGS, patch),
    onStateChanged: (cb: (state: UpdateState) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: UpdateState): void => cb(state)
      ipcRenderer.on(IPC.UPDATE_STATE_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC.UPDATE_STATE_CHANGED, listener)
    }
  }
}

export type MagicLensApi = typeof api

contextBridge.exposeInMainWorld('api', api)
