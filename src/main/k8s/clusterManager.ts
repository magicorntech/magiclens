import {
  AdmissionregistrationV1Api,
  ApiextensionsV1Api,
  ApisApi,
  AppsV1Api,
  AutoscalingV2Api,
  BatchV1Api,
  CoordinationV1Api,
  CoreApi,
  CoreV1Api,
  CustomObjectsApi,
  DiscoveryV1Api,
  KubeConfig,
  KubernetesObjectApi,
  Metrics,
  NetworkingV1Api,
  NodeV1Api,
  PolicyV1Api,
  RbacAuthorizationV1Api,
  SchedulingV1Api,
  StorageV1Api,
  VersionApi
} from '@kubernetes/client-node'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { buildKubeConfig } from './kubeconfigParser'

export interface ClusterClients {
  kc: KubeConfig
  core: CoreV1Api
  apps: AppsV1Api
  networking: NetworkingV1Api
  batch: BatchV1Api
  version: VersionApi
  metrics: Metrics
  autoscaling: AutoscalingV2Api
  policy: PolicyV1Api
  scheduling: SchedulingV1Api
  node: NodeV1Api
  coordination: CoordinationV1Api
  admissionregistration: AdmissionregistrationV1Api
  discovery: DiscoveryV1Api
  storage: StorageV1Api
  rbac: RbacAuthorizationV1Api
  apiextensions: ApiextensionsV1Api
  /** Root-level discovery: GET /api (core) and GET /apis (named groups). */
  coreApiRoot: CoreApi
  apisRoot: ApisApi
  /** Generic per-group-version discovery: GET /apis/{group}/{version}. */
  customObjects: CustomObjectsApi
  /** Fully generic CRUD across any GVK — powers the dynamic/CRD/operator resource browser. */
  objects: KubernetesObjectApi
}

class ClusterManager {
  private clients = new Map<string, ClusterClients>()

  connect(clusterId: string, source: KubeconfigSource, contextName: string): ClusterClients {
    const kc = buildKubeConfig(source, contextName)
    const clients: ClusterClients = {
      kc,
      core: kc.makeApiClient(CoreV1Api),
      apps: kc.makeApiClient(AppsV1Api),
      networking: kc.makeApiClient(NetworkingV1Api),
      batch: kc.makeApiClient(BatchV1Api),
      version: kc.makeApiClient(VersionApi),
      metrics: new Metrics(kc),
      autoscaling: kc.makeApiClient(AutoscalingV2Api),
      policy: kc.makeApiClient(PolicyV1Api),
      scheduling: kc.makeApiClient(SchedulingV1Api),
      node: kc.makeApiClient(NodeV1Api),
      coordination: kc.makeApiClient(CoordinationV1Api),
      admissionregistration: kc.makeApiClient(AdmissionregistrationV1Api),
      discovery: kc.makeApiClient(DiscoveryV1Api),
      storage: kc.makeApiClient(StorageV1Api),
      rbac: kc.makeApiClient(RbacAuthorizationV1Api),
      apiextensions: kc.makeApiClient(ApiextensionsV1Api),
      coreApiRoot: kc.makeApiClient(CoreApi),
      apisRoot: kc.makeApiClient(ApisApi),
      customObjects: kc.makeApiClient(CustomObjectsApi),
      objects: KubernetesObjectApi.makeApiClient(kc)
    }
    this.clients.set(clusterId, clients)
    return clients
  }

  get(clusterId: string): ClusterClients {
    const clients = this.clients.get(clusterId)
    if (!clients) {
      throw new Error(`No connected client for cluster ${clusterId}`)
    }
    return clients
  }

  disconnect(clusterId: string): void {
    this.clients.delete(clusterId)
  }
}

export const clusterManager = new ClusterManager()
