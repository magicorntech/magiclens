import type { V1ObjectMeta } from '@kubernetes/client-node'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { ClusterClients } from './clusterManager'

/** Group/Version/Resource info needed to build a Kubernetes Watch API path. */
export interface ResourceGvk {
  group: string
  version: string
  plural: string
  namespaced: boolean
}

interface RawList<T> {
  items: T[]
  metadata?: { resourceVersion?: string }
}

export interface ResourceKindConfig<T = any> {
  gvk: ResourceGvk
  /** Fetches the raw Kubernetes list object (used for both listing and seeding a watch). */
  listRaw: (clients: ClusterClients, namespace: string | 'ALL') => Promise<RawList<T>>
  /** Maps a single raw API object (from a list item or a watch event) to a table row. */
  toItem: (obj: T) => ResourceListItem
  /** Convenience: list + map, used by the plain (non-watch) resource:list IPC call. */
  list: (clients: ClusterClients, namespace: string | 'ALL') => Promise<ResourceListItem[]>
}

function baseMeta(obj: { metadata?: V1ObjectMeta }) {
  return {
    id: obj.metadata?.uid ?? `${obj.metadata?.namespace ?? ''}/${obj.metadata?.name ?? ''}`,
    name: obj.metadata?.name ?? '',
    namespace: obj.metadata?.namespace ?? '',
    ageTimestamp: obj.metadata?.creationTimestamp ? new Date(obj.metadata.creationTimestamp).toISOString() : null
  }
}

function defineKind<T>(
  gvk: ResourceGvk,
  listRaw: (clients: ClusterClients, namespace: string | 'ALL') => Promise<RawList<T>>,
  toItem: (obj: T) => ResourceListItem
): ResourceKindConfig<T> {
  return {
    gvk,
    listRaw,
    toItem,
    list: async (clients, namespace) => {
      const res = await listRaw(clients, namespace)
      return res.items.map(toItem)
    }
  }
}

export const resourceRegistry: Record<ResourceKind, ResourceKindConfig> = {
  Nodes: defineKind(
    { group: '', version: 'v1', plural: 'nodes', namespaced: false },
    (clients) => clients.core.listNode(),
    (node) => {
      const readyCond = node.status?.conditions?.find((c) => c.type === 'Ready')
      const isReady = readyCond?.status === 'True'
      return {
        ...baseMeta(node),
        namespace: '',
        statusText: isReady ? 'Ready' : 'NotReady',
        statusColor: isReady ? 'green' : 'red',
        columns: {
          roles: node.metadata?.labels?.['kubernetes.io/role'] ?? 'worker',
          version: node.status?.nodeInfo?.kubeletVersion ?? '-'
        }
      }
    }
  ),

  Namespaces: defineKind(
    { group: '', version: 'v1', plural: 'namespaces', namespaced: false },
    (clients) => clients.core.listNamespace(),
    (ns) => {
      const phase = ns.status?.phase ?? 'Unknown'
      return {
        ...baseMeta(ns),
        namespace: '',
        statusText: phase,
        statusColor: phase === 'Active' ? 'green' : 'gold',
        columns: {}
      }
    }
  ),

  Pods: defineKind(
    { group: '', version: 'v1', plural: 'pods', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL' ? clients.core.listPodForAllNamespaces() : clients.core.listNamespacedPod({ namespace }),
    (pod) => {
      const containers = pod.status?.containerStatuses ?? []
      const readyCount = containers.filter((c) => c.ready).length
      const restarts = containers.reduce((sum, c) => sum + (c.restartCount ?? 0), 0)
      const phase = pod.status?.phase ?? 'Unknown'
      return {
        ...baseMeta(pod),
        statusText: phase,
        statusColor:
          phase === 'Running' ? 'green' : phase === 'Pending' ? 'gold' : phase === 'Failed' ? 'red' : 'default',
        columns: {
          ready: `${readyCount}/${containers.length}`,
          restarts: String(restarts),
          node: pod.spec?.nodeName ?? '-'
        }
      }
    }
  ),

  Deployments: defineKind(
    { group: 'apps', version: 'v1', plural: 'deployments', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.apps.listDeploymentForAllNamespaces()
        : clients.apps.listNamespacedDeployment({ namespace }),
    (dep) => {
      const ready = dep.status?.readyReplicas ?? 0
      const desired = dep.spec?.replicas ?? 0
      return {
        ...baseMeta(dep),
        statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
        statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
        columns: { ready: `${ready}/${desired}` }
      }
    }
  ),

  StatefulSets: defineKind(
    { group: 'apps', version: 'v1', plural: 'statefulsets', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.apps.listStatefulSetForAllNamespaces()
        : clients.apps.listNamespacedStatefulSet({ namespace }),
    (sts) => {
      const ready = sts.status?.readyReplicas ?? 0
      const desired = sts.status?.replicas ?? 0
      return {
        ...baseMeta(sts),
        statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
        statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
        columns: { ready: `${ready}/${desired}` }
      }
    }
  ),

  DaemonSets: defineKind(
    { group: 'apps', version: 'v1', plural: 'daemonsets', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.apps.listDaemonSetForAllNamespaces()
        : clients.apps.listNamespacedDaemonSet({ namespace }),
    (ds) => {
      const ready = ds.status?.numberReady ?? 0
      const desired = ds.status?.desiredNumberScheduled ?? 0
      return {
        ...baseMeta(ds),
        statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
        statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
        columns: { ready: `${ready}/${desired}` }
      }
    }
  ),

  ReplicaSets: defineKind(
    { group: 'apps', version: 'v1', plural: 'replicasets', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.apps.listReplicaSetForAllNamespaces()
        : clients.apps.listNamespacedReplicaSet({ namespace }),
    (rs) => {
      const ready = rs.status?.readyReplicas ?? 0
      const desired = rs.status?.replicas ?? 0
      return {
        ...baseMeta(rs),
        statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
        statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
        columns: { ready: `${ready}/${desired}` }
      }
    }
  ),

  ReplicationControllers: defineKind(
    { group: '', version: 'v1', plural: 'replicationcontrollers', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listReplicationControllerForAllNamespaces()
        : clients.core.listNamespacedReplicationController({ namespace }),
    (rc) => {
      const ready = rc.status?.readyReplicas ?? 0
      const desired = rc.status?.replicas ?? 0
      return {
        ...baseMeta(rc),
        statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
        statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
        columns: { ready: `${ready}/${desired}` }
      }
    }
  ),

  Jobs: defineKind(
    { group: 'batch', version: 'v1', plural: 'jobs', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL' ? clients.batch.listJobForAllNamespaces() : clients.batch.listNamespacedJob({ namespace }),
    (job) => {
      const succeeded = job.status?.succeeded ?? 0
      const failed = job.status?.failed ?? 0
      const completed = succeeded > 0 && !job.status?.active
      return {
        ...baseMeta(job),
        statusText: failed > 0 ? 'Failed' : completed ? 'Complete' : 'Running',
        statusColor: failed > 0 ? 'red' : completed ? 'green' : 'gold',
        columns: { completions: `${succeeded}/${job.spec?.completions ?? 1}` }
      }
    }
  ),

  CronJobs: defineKind(
    { group: 'batch', version: 'v1', plural: 'cronjobs', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.batch.listCronJobForAllNamespaces()
        : clients.batch.listNamespacedCronJob({ namespace }),
    (cj) => {
      const suspended = cj.spec?.suspend ?? false
      return {
        ...baseMeta(cj),
        statusText: suspended ? 'Suspended' : 'Active',
        statusColor: suspended ? 'default' : 'green',
        columns: { schedule: cj.spec?.schedule ?? '-' }
      }
    }
  ),

  Services: defineKind(
    { group: '', version: 'v1', plural: 'services', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listServiceForAllNamespaces()
        : clients.core.listNamespacedService({ namespace }),
    (svc) => {
      const ports = (svc.spec?.ports ?? []).map((p) => p.port).join(',')
      return {
        ...baseMeta(svc),
        statusText: svc.spec?.type ?? 'ClusterIP',
        statusColor: 'blue',
        columns: {
          type: svc.spec?.type ?? 'ClusterIP',
          clusterIP: svc.spec?.clusterIP ?? '-',
          ports: ports || '-'
        }
      }
    }
  ),

  EndpointSlices: defineKind(
    { group: 'discovery.k8s.io', version: 'v1', plural: 'endpointslices', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.discovery.listEndpointSliceForAllNamespaces()
        : clients.discovery.listNamespacedEndpointSlice({ namespace }),
    (slice) => ({
      ...baseMeta(slice),
      statusText: 'Active',
      statusColor: 'default',
      columns: { addressType: slice.addressType ?? '-', endpoints: String(slice.endpoints?.length ?? 0) }
    })
  ),

  Endpoints: defineKind(
    { group: '', version: 'v1', plural: 'endpoints', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listEndpointsForAllNamespaces()
        : clients.core.listNamespacedEndpoints({ namespace }),
    (ep) => {
      const addressCount = (ep.subsets ?? []).reduce((sum, s) => sum + (s.addresses?.length ?? 0), 0)
      return {
        ...baseMeta(ep),
        statusText: addressCount > 0 ? 'Active' : 'NoAddresses',
        statusColor: addressCount > 0 ? 'green' : 'default',
        columns: { addresses: String(addressCount) }
      }
    }
  ),

  Ingresses: defineKind(
    { group: 'networking.k8s.io', version: 'v1', plural: 'ingresses', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.networking.listIngressForAllNamespaces()
        : clients.networking.listNamespacedIngress({ namespace }),
    (ing) => {
      const hosts = (ing.spec?.rules ?? [])
        .map((r) => r.host)
        .filter(Boolean)
        .join(',')
      return {
        ...baseMeta(ing),
        statusText: 'Active',
        statusColor: 'blue',
        columns: { hosts: hosts || '-' }
      }
    }
  ),

  IngressClasses: defineKind(
    { group: 'networking.k8s.io', version: 'v1', plural: 'ingressclasses', namespaced: false },
    (clients) => clients.networking.listIngressClass(),
    (ic) => ({
      ...baseMeta(ic),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { controller: ic.spec?.controller ?? '-' }
    })
  ),

  NetworkPolicies: defineKind(
    { group: 'networking.k8s.io', version: 'v1', plural: 'networkpolicies', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.networking.listNetworkPolicyForAllNamespaces()
        : clients.networking.listNamespacedNetworkPolicy({ namespace }),
    (np) => ({
      ...baseMeta(np),
      statusText: 'Active',
      statusColor: 'default',
      columns: { policyTypes: (np.spec?.policyTypes ?? []).join(',') || '-' }
    })
  ),

  ConfigMaps: defineKind(
    { group: '', version: 'v1', plural: 'configmaps', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listConfigMapForAllNamespaces()
        : clients.core.listNamespacedConfigMap({ namespace }),
    (cm) => ({
      ...baseMeta(cm),
      statusText: 'Active',
      statusColor: 'default',
      columns: { keys: String(Object.keys(cm.data ?? {}).length) }
    })
  ),

  Secrets: defineKind(
    { group: '', version: 'v1', plural: 'secrets', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listSecretForAllNamespaces()
        : clients.core.listNamespacedSecret({ namespace }),
    (secret) => ({
      ...baseMeta(secret),
      statusText: 'Active',
      statusColor: 'default',
      columns: { type: secret.type ?? 'Opaque', keys: String(Object.keys(secret.data ?? {}).length) }
    })
  ),

  ResourceQuotas: defineKind(
    { group: '', version: 'v1', plural: 'resourcequotas', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listResourceQuotaForAllNamespaces()
        : clients.core.listNamespacedResourceQuota({ namespace }),
    (rq) => ({
      ...baseMeta(rq),
      statusText: 'Active',
      statusColor: 'default',
      columns: { hard: String(Object.keys(rq.spec?.hard ?? {}).length) }
    })
  ),

  LimitRanges: defineKind(
    { group: '', version: 'v1', plural: 'limitranges', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listLimitRangeForAllNamespaces()
        : clients.core.listNamespacedLimitRange({ namespace }),
    (lr) => ({
      ...baseMeta(lr),
      statusText: 'Active',
      statusColor: 'default',
      columns: { limits: String(lr.spec?.limits?.length ?? 0) }
    })
  ),

  HorizontalPodAutoscalers: defineKind(
    { group: 'autoscaling', version: 'v2', plural: 'horizontalpodautoscalers', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.autoscaling.listHorizontalPodAutoscalerForAllNamespaces()
        : clients.autoscaling.listNamespacedHorizontalPodAutoscaler({ namespace }),
    (hpa) => {
      const current = hpa.status?.currentReplicas ?? 0
      const desired = hpa.status?.desiredReplicas ?? 0
      return {
        ...baseMeta(hpa),
        statusText: current === desired ? 'Stable' : 'Scaling',
        statusColor: current === desired ? 'green' : 'gold',
        columns: {
          target: hpa.spec?.scaleTargetRef ? `${hpa.spec.scaleTargetRef.kind}/${hpa.spec.scaleTargetRef.name}` : '-',
          minMax: `${hpa.spec?.minReplicas ?? '-'} / ${hpa.spec?.maxReplicas ?? '-'}`,
          replicas: `${current}/${desired}`
        }
      }
    }
  ),

  PodDisruptionBudgets: defineKind(
    { group: 'policy', version: 'v1', plural: 'poddisruptionbudgets', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.policy.listPodDisruptionBudgetForAllNamespaces()
        : clients.policy.listNamespacedPodDisruptionBudget({ namespace }),
    (pdb) => ({
      ...baseMeta(pdb),
      statusText: 'Active',
      statusColor: 'default',
      columns: {
        minAvailable: pdb.spec?.minAvailable !== undefined ? String(pdb.spec.minAvailable) : '-',
        allowedDisruptions: String(pdb.status?.disruptionsAllowed ?? 0)
      }
    })
  ),

  PriorityClasses: defineKind(
    { group: 'scheduling.k8s.io', version: 'v1', plural: 'priorityclasses', namespaced: false },
    (clients) => clients.scheduling.listPriorityClass(),
    (pc) => ({
      ...baseMeta(pc),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { value: String(pc.value), globalDefault: pc.globalDefault ? 'true' : 'false' }
    })
  ),

  RuntimeClasses: defineKind(
    { group: 'node.k8s.io', version: 'v1', plural: 'runtimeclasses', namespaced: false },
    (clients) => clients.node.listRuntimeClass(),
    (rc) => ({
      ...baseMeta(rc),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { handler: rc.handler ?? '-' }
    })
  ),

  Leases: defineKind(
    { group: 'coordination.k8s.io', version: 'v1', plural: 'leases', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.coordination.listLeaseForAllNamespaces()
        : clients.coordination.listNamespacedLease({ namespace }),
    (lease) => ({
      ...baseMeta(lease),
      statusText: 'Active',
      statusColor: 'default',
      columns: { holder: lease.spec?.holderIdentity ?? '-' }
    })
  ),

  MutatingWebhookConfigurations: defineKind(
    { group: 'admissionregistration.k8s.io', version: 'v1', plural: 'mutatingwebhookconfigurations', namespaced: false },
    (clients) => clients.admissionregistration.listMutatingWebhookConfiguration(),
    (wh) => ({
      ...baseMeta(wh),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { webhooks: String(wh.webhooks?.length ?? 0) }
    })
  ),

  ValidatingWebhookConfigurations: defineKind(
    {
      group: 'admissionregistration.k8s.io',
      version: 'v1',
      plural: 'validatingwebhookconfigurations',
      namespaced: false
    },
    (clients) => clients.admissionregistration.listValidatingWebhookConfiguration(),
    (wh) => ({
      ...baseMeta(wh),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { webhooks: String(wh.webhooks?.length ?? 0) }
    })
  ),

  ValidatingAdmissionPolicies: defineKind(
    { group: 'admissionregistration.k8s.io', version: 'v1', plural: 'validatingadmissionpolicies', namespaced: false },
    (clients) => clients.admissionregistration.listValidatingAdmissionPolicy(),
    (policy) => ({
      ...baseMeta(policy),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { validations: String(policy.spec?.validations?.length ?? 0) }
    })
  ),

  ValidatingAdmissionPolicyBindings: defineKind(
    {
      group: 'admissionregistration.k8s.io',
      version: 'v1',
      plural: 'validatingadmissionpolicybindings',
      namespaced: false
    },
    (clients) => clients.admissionregistration.listValidatingAdmissionPolicyBinding(),
    (binding) => ({
      ...baseMeta(binding),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { policyName: binding.spec?.policyName ?? '-' }
    })
  ),

  PersistentVolumeClaims: defineKind(
    { group: '', version: 'v1', plural: 'persistentvolumeclaims', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listPersistentVolumeClaimForAllNamespaces()
        : clients.core.listNamespacedPersistentVolumeClaim({ namespace }),
    (pvc) => {
      const phase = pvc.status?.phase ?? 'Unknown'
      return {
        ...baseMeta(pvc),
        statusText: phase,
        statusColor: phase === 'Bound' ? 'green' : 'gold',
        columns: { capacity: pvc.status?.capacity?.storage ?? '-' }
      }
    }
  ),

  PersistentVolumes: defineKind(
    { group: '', version: 'v1', plural: 'persistentvolumes', namespaced: false },
    (clients) => clients.core.listPersistentVolume(),
    (pv) => {
      const phase = pv.status?.phase ?? 'Unknown'
      return {
        ...baseMeta(pv),
        namespace: '',
        statusText: phase,
        statusColor: phase === 'Bound' ? 'green' : phase === 'Available' ? 'blue' : 'gold',
        columns: { capacity: pv.spec?.capacity?.storage ?? '-' }
      }
    }
  ),

  StorageClasses: defineKind(
    { group: 'storage.k8s.io', version: 'v1', plural: 'storageclasses', namespaced: false },
    (clients) => clients.storage.listStorageClass(),
    (sc) => ({
      ...baseMeta(sc),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { provisioner: sc.provisioner ?? '-', reclaimPolicy: sc.reclaimPolicy ?? '-' }
    })
  ),

  ServiceAccounts: defineKind(
    { group: '', version: 'v1', plural: 'serviceaccounts', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listServiceAccountForAllNamespaces()
        : clients.core.listNamespacedServiceAccount({ namespace }),
    (sa) => ({
      ...baseMeta(sa),
      statusText: 'Active',
      statusColor: 'default',
      columns: { secrets: String(sa.secrets?.length ?? 0) }
    })
  ),

  Roles: defineKind(
    { group: 'rbac.authorization.k8s.io', version: 'v1', plural: 'roles', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL' ? clients.rbac.listRoleForAllNamespaces() : clients.rbac.listNamespacedRole({ namespace }),
    (role) => ({
      ...baseMeta(role),
      statusText: 'Active',
      statusColor: 'default',
      columns: { rules: String(role.rules?.length ?? 0) }
    })
  ),

  ClusterRoles: defineKind(
    { group: 'rbac.authorization.k8s.io', version: 'v1', plural: 'clusterroles', namespaced: false },
    (clients) => clients.rbac.listClusterRole(),
    (role) => ({
      ...baseMeta(role),
      namespace: '',
      statusText: 'Active',
      statusColor: 'default',
      columns: { rules: String(role.rules?.length ?? 0) }
    })
  ),

  RoleBindings: defineKind(
    { group: 'rbac.authorization.k8s.io', version: 'v1', plural: 'rolebindings', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.rbac.listRoleBindingForAllNamespaces()
        : clients.rbac.listNamespacedRoleBinding({ namespace }),
    (rb) => ({
      ...baseMeta(rb),
      statusText: rb.roleRef.kind,
      statusColor: 'blue',
      columns: { role: rb.roleRef.name, subjects: String(rb.subjects?.length ?? 0) }
    })
  ),

  ClusterRoleBindings: defineKind(
    { group: 'rbac.authorization.k8s.io', version: 'v1', plural: 'clusterrolebindings', namespaced: false },
    (clients) => clients.rbac.listClusterRoleBinding(),
    (crb) => ({
      ...baseMeta(crb),
      namespace: '',
      statusText: crb.roleRef.kind,
      statusColor: 'blue',
      columns: { role: crb.roleRef.name, subjects: String(crb.subjects?.length ?? 0) }
    })
  ),

  CustomResourceDefinitions: defineKind(
    { group: 'apiextensions.k8s.io', version: 'v1', plural: 'customresourcedefinitions', namespaced: false },
    (clients) => clients.apiextensions.listCustomResourceDefinition(),
    (crd) => {
      const established = crd.status?.conditions?.find((c) => c.type === 'Established')
      const isEstablished = established?.status === 'True'
      return {
        ...baseMeta(crd),
        namespace: '',
        statusText: isEstablished ? 'Established' : 'Pending',
        statusColor: isEstablished ? 'green' : 'gold',
        columns: {
          group: crd.spec.group,
          kind: crd.spec.names.kind,
          scope: crd.spec.scope
        }
      }
    }
  ),

  Events: defineKind(
    { group: '', version: 'v1', plural: 'events', namespaced: true },
    (clients, namespace) =>
      namespace === 'ALL'
        ? clients.core.listEventForAllNamespaces()
        : clients.core.listNamespacedEvent({ namespace }),
    (event) => ({
      ...baseMeta(event),
      statusText: event.type ?? 'Normal',
      statusColor: event.type === 'Warning' ? 'red' : 'default',
      columns: {
        reason: event.reason ?? '-',
        object: event.involvedObject?.name ?? '-',
        message: event.message ?? '-'
      }
    })
  )
}

/** The real Kubernetes `kind:` value (singular, PascalCase) for each internal resource kind —
 * needed to build a manifest for read/patch/create/delete via the generic KubernetesObjectApi. */
export const K8S_KIND_NAME: Record<ResourceKind, string> = {
  Nodes: 'Node',
  Namespaces: 'Namespace',
  Pods: 'Pod',
  Deployments: 'Deployment',
  StatefulSets: 'StatefulSet',
  DaemonSets: 'DaemonSet',
  ReplicaSets: 'ReplicaSet',
  ReplicationControllers: 'ReplicationController',
  Jobs: 'Job',
  CronJobs: 'CronJob',
  Services: 'Service',
  EndpointSlices: 'EndpointSlice',
  Endpoints: 'Endpoints',
  Ingresses: 'Ingress',
  IngressClasses: 'IngressClass',
  NetworkPolicies: 'NetworkPolicy',
  ConfigMaps: 'ConfigMap',
  Secrets: 'Secret',
  ResourceQuotas: 'ResourceQuota',
  LimitRanges: 'LimitRange',
  HorizontalPodAutoscalers: 'HorizontalPodAutoscaler',
  PodDisruptionBudgets: 'PodDisruptionBudget',
  PriorityClasses: 'PriorityClass',
  RuntimeClasses: 'RuntimeClass',
  Leases: 'Lease',
  MutatingWebhookConfigurations: 'MutatingWebhookConfiguration',
  ValidatingWebhookConfigurations: 'ValidatingWebhookConfiguration',
  ValidatingAdmissionPolicies: 'ValidatingAdmissionPolicy',
  ValidatingAdmissionPolicyBindings: 'ValidatingAdmissionPolicyBinding',
  PersistentVolumeClaims: 'PersistentVolumeClaim',
  PersistentVolumes: 'PersistentVolume',
  StorageClasses: 'StorageClass',
  ServiceAccounts: 'ServiceAccount',
  Roles: 'Role',
  ClusterRoles: 'ClusterRole',
  RoleBindings: 'RoleBinding',
  ClusterRoleBindings: 'ClusterRoleBinding',
  CustomResourceDefinitions: 'CustomResourceDefinition',
  Events: 'Event'
}

/** Builds the `apiVersion` string (e.g. "v1", "apps/v1") for a built-in resource kind's GVK. */
export function apiVersionOf(gvk: ResourceGvk): string {
  return gvk.group ? `${gvk.group}/${gvk.version}` : gvk.version
}

/** Builds the Kubernetes Watch API path for a built-in resource kind. */
export function buildWatchPath(gvk: ResourceGvk, namespace: string | 'ALL'): string {
  const base = gvk.group === '' ? `/api/${gvk.version}` : `/apis/${gvk.group}/${gvk.version}`
  if (!gvk.namespaced || namespace === 'ALL') return `${base}/${gvk.plural}`
  return `${base}/namespaces/${encodeURIComponent(namespace)}/${gvk.plural}`
}
