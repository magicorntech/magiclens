/** Per-cluster settings persisted on PersistedClusterEntry.settings */

export type ClusterEnvironment = 'dev' | 'staging' | 'prod' | 'other' | ''

export interface ClusterGeneralSettings {
  tags: string[]
  environment: ClusterEnvironment
  notes: string
}

export interface ClusterProxySettings {
  httpProxy: string
  httpsProxy: string
  noProxy: string
  username: string
  password: string
  failoverEnabled: boolean
}

export interface ClusterTerminalSettings {
  defaultShell: string
  workingDirectory: 'home' | 'custom'
  customWorkingDirectory: string
  defaultNamespace: string
  syncKubectlContext: boolean
  keepHistory: boolean
  autoComplete: boolean
  extraEnv: string
  validateRbac: boolean
  multiTab: boolean
}

export interface ClusterNamespacesSettings {
  /** Extra namespaces to pin in the selector (beyond cluster list). */
  pinned: string[]
  defaultNamespace: string
  rbacFilter: boolean
  labelGrouping: boolean
}

export interface ClusterMetricsSettings {
  source: 'auto' | 'prometheus' | 'custom'
  endpointUrl: string
  scrapeIntervalSec: number
  queryTimeoutSec: number
  https: boolean
  authType: 'none' | 'basic' | 'bearer'
  authUser: string
  authPassword: string
  authBearer: string
  pathPrefix: string
  hideUnused: boolean
}

export interface ClusterLensMetricsSettings {
  enabled: boolean
  kubeStateMetrics: boolean
  nodeExporter: boolean
  autoInstall: boolean
  autoUpgrade: boolean
}

export type NodeShellPullPolicy = 'IfNotPresent' | 'Always' | 'Never'

export interface ClusterNodeShellSettings {
  image: string
  pullPolicy: NodeShellPullPolicy
  pullSecret: string
  cpuLimit: string
  memoryLimit: string
  privileged: boolean
  runAsRoot: boolean
  nodeSelector: string
  tolerationsJson: string
  cleanupTtlSec: number
}

export interface ClusterSecuritySettings {
  showRbacViewer: boolean
  encryptKubeconfigAtRest: boolean
  clientAuditLog: boolean
}

export interface ClusterNetworkSettings {
  clusterDomain: string
  serviceCidr: string
  podCidr: string
  dnsNotes: string
}

export interface ClusterStorageSettings {
  defaultStorageClass: string
  volumeSnapshots: boolean
  showCsiDrivers: boolean
}

export interface ClusterIntegrationsSettings {
  grafanaUrl: string
  lokiUrl: string
  jaegerUrl: string
  alertmanagerUrl: string
  webhookUrl: string
}

export interface ClusterPerformanceSettings {
  apiRateLimit: number
  cacheEnabled: boolean
  refreshIntervalSec: number
  concurrency: number
}

export interface ClusterUiSettings {
  tableDensity: 'comfortable' | 'compact'
  defaultView: string
  favoritesFirst: boolean
}

export interface ClusterDebugSettings {
  kubectlProxy: boolean
  apiInspector: boolean
  clientLogs: boolean
  experimental: boolean
  featureFlags: string
}

export interface ClusterSettings {
  general: ClusterGeneralSettings
  proxy: ClusterProxySettings
  terminal: ClusterTerminalSettings
  namespaces: ClusterNamespacesSettings
  metrics: ClusterMetricsSettings
  lensMetrics: ClusterLensMetricsSettings
  nodeShell: ClusterNodeShellSettings
  security: ClusterSecuritySettings
  network: ClusterNetworkSettings
  storage: ClusterStorageSettings
  integrations: ClusterIntegrationsSettings
  performance: ClusterPerformanceSettings
  ui: ClusterUiSettings
  debug: ClusterDebugSettings
}

export const DEFAULT_NODE_SHELL_IMAGE = 'alpine:3.19'

export const defaultClusterSettings = (): ClusterSettings => ({
  general: {
    tags: [],
    environment: '',
    notes: ''
  },
  proxy: {
    httpProxy: '',
    httpsProxy: '',
    noProxy: '',
    username: '',
    password: '',
    failoverEnabled: false
  },
  terminal: {
    defaultShell: '/bin/bash',
    workingDirectory: 'home',
    customWorkingDirectory: '',
    defaultNamespace: '',
    syncKubectlContext: true,
    keepHistory: true,
    autoComplete: true,
    extraEnv: '',
    validateRbac: false,
    multiTab: true
  },
  namespaces: {
    pinned: [],
    defaultNamespace: '',
    rbacFilter: false,
    labelGrouping: false
  },
  metrics: {
    source: 'auto',
    endpointUrl: '',
    scrapeIntervalSec: 30,
    queryTimeoutSec: 15,
    https: true,
    authType: 'none',
    authUser: '',
    authPassword: '',
    authBearer: '',
    pathPrefix: '',
    hideUnused: false
  },
  lensMetrics: {
    enabled: false,
    kubeStateMetrics: true,
    nodeExporter: true,
    autoInstall: false,
    autoUpgrade: false
  },
  nodeShell: {
    image: DEFAULT_NODE_SHELL_IMAGE,
    pullPolicy: 'IfNotPresent',
    pullSecret: '',
    cpuLimit: '200m',
    memoryLimit: '128Mi',
    privileged: true,
    runAsRoot: true,
    nodeSelector: '',
    tolerationsJson: '[{"operator":"Exists"}]',
    cleanupTtlSec: 3600
  },
  security: {
    showRbacViewer: true,
    encryptKubeconfigAtRest: true,
    clientAuditLog: false
  },
  network: {
    clusterDomain: 'cluster.local',
    serviceCidr: '',
    podCidr: '',
    dnsNotes: ''
  },
  storage: {
    defaultStorageClass: '',
    volumeSnapshots: false,
    showCsiDrivers: true
  },
  integrations: {
    grafanaUrl: '',
    lokiUrl: '',
    jaegerUrl: '',
    alertmanagerUrl: '',
    webhookUrl: ''
  },
  performance: {
    apiRateLimit: 50,
    cacheEnabled: true,
    refreshIntervalSec: 5,
    concurrency: 8
  },
  ui: {
    tableDensity: 'comfortable',
    defaultView: '',
    favoritesFirst: true
  },
  debug: {
    kubectlProxy: false,
    apiInspector: false,
    clientLogs: false,
    experimental: false,
    featureFlags: ''
  }
})

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Deep-merge partial settings onto defaults (arrays replaced, not concat). */
export function mergeClusterSettings(partial?: Partial<ClusterSettings> | null): ClusterSettings {
  const base = defaultClusterSettings()
  if (!partial || !isPlainObject(partial)) return base
  const out: ClusterSettings = { ...base }
  ;(Object.keys(base) as (keyof ClusterSettings)[]).forEach((key) => {
    const patch = partial[key]
    if (patch && isPlainObject(patch)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(out as any)[key] = { ...(base as any)[key], ...patch }
    }
  })
  if (!out.nodeShell.image?.trim()) {
    out.nodeShell.image = DEFAULT_NODE_SHELL_IMAGE
  }
  return out
}

export type ClusterSettingsSectionId =
  | 'general'
  | 'proxy'
  | 'terminal'
  | 'namespaces'
  | 'metrics'
  | 'lensMetrics'
  | 'nodeShell'
  | 'security'
  | 'network'
  | 'storage'
  | 'integrations'
  | 'performance'
  | 'ui'
  | 'debug'

export const CLUSTER_SETTINGS_SECTIONS: ClusterSettingsSectionId[] = [
  'general',
  'proxy',
  'terminal',
  'namespaces',
  'metrics',
  'lensMetrics',
  'nodeShell',
  'security',
  'network',
  'storage',
  'integrations',
  'performance',
  'ui',
  'debug'
]
