import { registerAppHandlers } from './app.handlers'
import { registerClusterHandlers } from './cluster.handlers'
import { registerClusterStoreHandlers } from './clusterStore.handlers'
import { registerDiscoveryHandlers } from './discovery.handlers'
import { registerHelmHandlers } from './helm.handlers'
import { registerKubeconfigHandlers } from './kubeconfig.handlers'
import { registerMetricsHandlers } from './metrics.handlers'
import { registerNodeHandlers } from './node.handlers'
import { registerPodHandlers } from './pod.handlers'
import { registerPrometheusHandlers } from './prometheus.handlers'
import { registerPortForwardHandlers } from './portForward.handlers'
import { registerRbacHandlers } from './rbac.handlers'
import { registerResourceHandlers } from './resource.handlers'
import { registerServiceHandlers } from './service.handlers'
import { registerTerminalHandlers } from './terminal.handlers'
import { registerUiStateHandlers } from './uiState.handlers'
import { registerUpdateHandlers } from './update.handlers'
import { registerWorkloadHandlers } from './workload.handlers'

export function registerIpcHandlers(): void {
  registerKubeconfigHandlers()
  registerClusterHandlers()
  registerResourceHandlers()
  registerClusterStoreHandlers()
  registerUiStateHandlers()
  registerMetricsHandlers()
  registerPrometheusHandlers()
  registerRbacHandlers()
  registerAppHandlers()
  registerPodHandlers()
  registerNodeHandlers()
  registerServiceHandlers()
  registerPortForwardHandlers()
  registerTerminalHandlers()
  registerDiscoveryHandlers()
  registerHelmHandlers()
  registerWorkloadHandlers()
  registerUpdateHandlers()
}
