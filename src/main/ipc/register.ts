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
import { registerSearchHandlers } from './search.handlers'
import { registerEnterpriseHandlers } from './enterprise.handlers'
import { registerVpnHandlers } from './vpn.handlers'
import { registerSessionHandlers } from './session.handlers'
import { registerClusterVpnHandlers } from './clusterVpn.handlers'
import { registerClusterGroupsHandlers } from './clusterGroups.handlers'

export function registerIpcHandlers(): void {
  registerSessionHandlers()
  registerKubeconfigHandlers()
  registerClusterHandlers()
  registerResourceHandlers()
  registerClusterStoreHandlers()
  registerClusterVpnHandlers()
  registerClusterGroupsHandlers()
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
  registerSearchHandlers()
  registerEnterpriseHandlers()
  registerVpnHandlers()
}
