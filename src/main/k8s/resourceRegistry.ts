import type { V1ObjectMeta } from '@kubernetes/client-node'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { ClusterClients } from './clusterManager'

export interface ResourceKindConfig {
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

export const resourceRegistry: Record<ResourceKind, ResourceKindConfig> = {
  Nodes: {
    list: async (clients) => {
      const res = await clients.core.listNode()
      return res.items.map((node) => {
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
      })
    }
  },

  Namespaces: {
    list: async (clients) => {
      const res = await clients.core.listNamespace()
      return res.items.map((ns) => {
        const phase = ns.status?.phase ?? 'Unknown'
        return {
          ...baseMeta(ns),
          namespace: '',
          statusText: phase,
          statusColor: phase === 'Active' ? 'green' : 'gold',
          columns: {}
        }
      })
    }
  },

  Pods: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listPodForAllNamespaces()
          : await clients.core.listNamespacedPod({ namespace })
      return res.items.map((pod) => {
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
      })
    }
  },

  Deployments: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.apps.listDeploymentForAllNamespaces()
          : await clients.apps.listNamespacedDeployment({ namespace })
      return res.items.map((dep) => {
        const ready = dep.status?.readyReplicas ?? 0
        const desired = dep.spec?.replicas ?? 0
        return {
          ...baseMeta(dep),
          statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
          statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
          columns: { ready: `${ready}/${desired}` }
        }
      })
    }
  },

  StatefulSets: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.apps.listStatefulSetForAllNamespaces()
          : await clients.apps.listNamespacedStatefulSet({ namespace })
      return res.items.map((sts) => {
        const ready = sts.status?.readyReplicas ?? 0
        const desired = sts.status?.replicas ?? 0
        return {
          ...baseMeta(sts),
          statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
          statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
          columns: { ready: `${ready}/${desired}` }
        }
      })
    }
  },

  DaemonSets: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.apps.listDaemonSetForAllNamespaces()
          : await clients.apps.listNamespacedDaemonSet({ namespace })
      return res.items.map((ds) => {
        const ready = ds.status?.numberReady ?? 0
        const desired = ds.status?.desiredNumberScheduled ?? 0
        return {
          ...baseMeta(ds),
          statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
          statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
          columns: { ready: `${ready}/${desired}` }
        }
      })
    }
  },

  ReplicaSets: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.apps.listReplicaSetForAllNamespaces()
          : await clients.apps.listNamespacedReplicaSet({ namespace })
      return res.items.map((rs) => {
        const ready = rs.status?.readyReplicas ?? 0
        const desired = rs.status?.replicas ?? 0
        return {
          ...baseMeta(rs),
          statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
          statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
          columns: { ready: `${ready}/${desired}` }
        }
      })
    }
  },

  ReplicationControllers: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listReplicationControllerForAllNamespaces()
          : await clients.core.listNamespacedReplicationController({ namespace })
      return res.items.map((rc) => {
        const ready = rc.status?.readyReplicas ?? 0
        const desired = rc.status?.replicas ?? 0
        return {
          ...baseMeta(rc),
          statusText: ready === desired && desired > 0 ? 'Available' : 'Progressing',
          statusColor: ready === desired && desired > 0 ? 'green' : 'gold',
          columns: { ready: `${ready}/${desired}` }
        }
      })
    }
  },

  Jobs: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.batch.listJobForAllNamespaces()
          : await clients.batch.listNamespacedJob({ namespace })
      return res.items.map((job) => {
        const succeeded = job.status?.succeeded ?? 0
        const failed = job.status?.failed ?? 0
        const completed = succeeded > 0 && !job.status?.active
        return {
          ...baseMeta(job),
          statusText: failed > 0 ? 'Failed' : completed ? 'Complete' : 'Running',
          statusColor: failed > 0 ? 'red' : completed ? 'green' : 'gold',
          columns: { completions: `${succeeded}/${job.spec?.completions ?? 1}` }
        }
      })
    }
  },

  CronJobs: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.batch.listCronJobForAllNamespaces()
          : await clients.batch.listNamespacedCronJob({ namespace })
      return res.items.map((cj) => {
        const suspended = cj.spec?.suspend ?? false
        return {
          ...baseMeta(cj),
          statusText: suspended ? 'Suspended' : 'Active',
          statusColor: suspended ? 'default' : 'green',
          columns: { schedule: cj.spec?.schedule ?? '-' }
        }
      })
    }
  },

  Services: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listServiceForAllNamespaces()
          : await clients.core.listNamespacedService({ namespace })
      return res.items.map((svc) => {
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
      })
    }
  },

  EndpointSlices: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.discovery.listEndpointSliceForAllNamespaces()
          : await clients.discovery.listNamespacedEndpointSlice({ namespace })
      return res.items.map((slice) => ({
        ...baseMeta(slice),
        statusText: 'Active',
        statusColor: 'default',
        columns: { addressType: slice.addressType ?? '-', endpoints: String(slice.endpoints?.length ?? 0) }
      }))
    }
  },

  Endpoints: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listEndpointsForAllNamespaces()
          : await clients.core.listNamespacedEndpoints({ namespace })
      return res.items.map((ep) => {
        const addressCount = (ep.subsets ?? []).reduce((sum, s) => sum + (s.addresses?.length ?? 0), 0)
        return {
          ...baseMeta(ep),
          statusText: addressCount > 0 ? 'Active' : 'NoAddresses',
          statusColor: addressCount > 0 ? 'green' : 'default',
          columns: { addresses: String(addressCount) }
        }
      })
    }
  },

  Ingresses: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.networking.listIngressForAllNamespaces()
          : await clients.networking.listNamespacedIngress({ namespace })
      return res.items.map((ing) => {
        const hosts = (ing.spec?.rules ?? []).map((r) => r.host).filter(Boolean).join(',')
        return {
          ...baseMeta(ing),
          statusText: 'Active',
          statusColor: 'blue',
          columns: { hosts: hosts || '-' }
        }
      })
    }
  },

  IngressClasses: {
    list: async (clients) => {
      const res = await clients.networking.listIngressClass()
      return res.items.map((ic) => ({
        ...baseMeta(ic),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { controller: ic.spec?.controller ?? '-' }
      }))
    }
  },

  NetworkPolicies: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.networking.listNetworkPolicyForAllNamespaces()
          : await clients.networking.listNamespacedNetworkPolicy({ namespace })
      return res.items.map((np) => ({
        ...baseMeta(np),
        statusText: 'Active',
        statusColor: 'default',
        columns: { policyTypes: (np.spec?.policyTypes ?? []).join(',') || '-' }
      }))
    }
  },

  ConfigMaps: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listConfigMapForAllNamespaces()
          : await clients.core.listNamespacedConfigMap({ namespace })
      return res.items.map((cm) => ({
        ...baseMeta(cm),
        statusText: 'Active',
        statusColor: 'default',
        columns: { keys: String(Object.keys(cm.data ?? {}).length) }
      }))
    }
  },

  Secrets: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listSecretForAllNamespaces()
          : await clients.core.listNamespacedSecret({ namespace })
      return res.items.map((secret) => ({
        ...baseMeta(secret),
        statusText: 'Active',
        statusColor: 'default',
        columns: { type: secret.type ?? 'Opaque', keys: String(Object.keys(secret.data ?? {}).length) }
      }))
    }
  },

  ResourceQuotas: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listResourceQuotaForAllNamespaces()
          : await clients.core.listNamespacedResourceQuota({ namespace })
      return res.items.map((rq) => ({
        ...baseMeta(rq),
        statusText: 'Active',
        statusColor: 'default',
        columns: { hard: String(Object.keys(rq.spec?.hard ?? {}).length) }
      }))
    }
  },

  LimitRanges: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listLimitRangeForAllNamespaces()
          : await clients.core.listNamespacedLimitRange({ namespace })
      return res.items.map((lr) => ({
        ...baseMeta(lr),
        statusText: 'Active',
        statusColor: 'default',
        columns: { limits: String(lr.spec?.limits?.length ?? 0) }
      }))
    }
  },

  HorizontalPodAutoscalers: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.autoscaling.listHorizontalPodAutoscalerForAllNamespaces()
          : await clients.autoscaling.listNamespacedHorizontalPodAutoscaler({ namespace })
      return res.items.map((hpa) => {
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
      })
    }
  },

  PodDisruptionBudgets: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.policy.listPodDisruptionBudgetForAllNamespaces()
          : await clients.policy.listNamespacedPodDisruptionBudget({ namespace })
      return res.items.map((pdb) => ({
        ...baseMeta(pdb),
        statusText: 'Active',
        statusColor: 'default',
        columns: {
          minAvailable: pdb.spec?.minAvailable !== undefined ? String(pdb.spec.minAvailable) : '-',
          allowedDisruptions: String(pdb.status?.disruptionsAllowed ?? 0)
        }
      }))
    }
  },

  PriorityClasses: {
    list: async (clients) => {
      const res = await clients.scheduling.listPriorityClass()
      return res.items.map((pc) => ({
        ...baseMeta(pc),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { value: String(pc.value), globalDefault: pc.globalDefault ? 'true' : 'false' }
      }))
    }
  },

  RuntimeClasses: {
    list: async (clients) => {
      const res = await clients.node.listRuntimeClass()
      return res.items.map((rc) => ({
        ...baseMeta(rc),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { handler: rc.handler ?? '-' }
      }))
    }
  },

  Leases: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.coordination.listLeaseForAllNamespaces()
          : await clients.coordination.listNamespacedLease({ namespace })
      return res.items.map((lease) => ({
        ...baseMeta(lease),
        statusText: 'Active',
        statusColor: 'default',
        columns: { holder: lease.spec?.holderIdentity ?? '-' }
      }))
    }
  },

  MutatingWebhookConfigurations: {
    list: async (clients) => {
      const res = await clients.admissionregistration.listMutatingWebhookConfiguration()
      return res.items.map((wh) => ({
        ...baseMeta(wh),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { webhooks: String(wh.webhooks?.length ?? 0) }
      }))
    }
  },

  ValidatingWebhookConfigurations: {
    list: async (clients) => {
      const res = await clients.admissionregistration.listValidatingWebhookConfiguration()
      return res.items.map((wh) => ({
        ...baseMeta(wh),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { webhooks: String(wh.webhooks?.length ?? 0) }
      }))
    }
  },

  ValidatingAdmissionPolicies: {
    list: async (clients) => {
      const res = await clients.admissionregistration.listValidatingAdmissionPolicy()
      return res.items.map((policy) => ({
        ...baseMeta(policy),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { validations: String(policy.spec?.validations?.length ?? 0) }
      }))
    }
  },

  ValidatingAdmissionPolicyBindings: {
    list: async (clients) => {
      const res = await clients.admissionregistration.listValidatingAdmissionPolicyBinding()
      return res.items.map((binding) => ({
        ...baseMeta(binding),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { policyName: binding.spec?.policyName ?? '-' }
      }))
    }
  },

  PersistentVolumeClaims: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listPersistentVolumeClaimForAllNamespaces()
          : await clients.core.listNamespacedPersistentVolumeClaim({ namespace })
      return res.items.map((pvc) => {
        const phase = pvc.status?.phase ?? 'Unknown'
        return {
          ...baseMeta(pvc),
          statusText: phase,
          statusColor: phase === 'Bound' ? 'green' : 'gold',
          columns: { capacity: pvc.status?.capacity?.storage ?? '-' }
        }
      })
    }
  },

  PersistentVolumes: {
    list: async (clients) => {
      const res = await clients.core.listPersistentVolume()
      return res.items.map((pv) => {
        const phase = pv.status?.phase ?? 'Unknown'
        return {
          ...baseMeta(pv),
          namespace: '',
          statusText: phase,
          statusColor: phase === 'Bound' ? 'green' : phase === 'Available' ? 'blue' : 'gold',
          columns: { capacity: pv.spec?.capacity?.storage ?? '-' }
        }
      })
    }
  },

  StorageClasses: {
    list: async (clients) => {
      const res = await clients.storage.listStorageClass()
      return res.items.map((sc) => ({
        ...baseMeta(sc),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { provisioner: sc.provisioner ?? '-', reclaimPolicy: sc.reclaimPolicy ?? '-' }
      }))
    }
  },

  ServiceAccounts: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listServiceAccountForAllNamespaces()
          : await clients.core.listNamespacedServiceAccount({ namespace })
      return res.items.map((sa) => ({
        ...baseMeta(sa),
        statusText: 'Active',
        statusColor: 'default',
        columns: { secrets: String(sa.secrets?.length ?? 0) }
      }))
    }
  },

  Roles: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.rbac.listRoleForAllNamespaces()
          : await clients.rbac.listNamespacedRole({ namespace })
      return res.items.map((role) => ({
        ...baseMeta(role),
        statusText: 'Active',
        statusColor: 'default',
        columns: { rules: String(role.rules?.length ?? 0) }
      }))
    }
  },

  ClusterRoles: {
    list: async (clients) => {
      const res = await clients.rbac.listClusterRole()
      return res.items.map((role) => ({
        ...baseMeta(role),
        namespace: '',
        statusText: 'Active',
        statusColor: 'default',
        columns: { rules: String(role.rules?.length ?? 0) }
      }))
    }
  },

  RoleBindings: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.rbac.listRoleBindingForAllNamespaces()
          : await clients.rbac.listNamespacedRoleBinding({ namespace })
      return res.items.map((rb) => ({
        ...baseMeta(rb),
        statusText: rb.roleRef.kind,
        statusColor: 'blue',
        columns: { role: rb.roleRef.name, subjects: String(rb.subjects?.length ?? 0) }
      }))
    }
  },

  ClusterRoleBindings: {
    list: async (clients) => {
      const res = await clients.rbac.listClusterRoleBinding()
      return res.items.map((crb) => ({
        ...baseMeta(crb),
        namespace: '',
        statusText: crb.roleRef.kind,
        statusColor: 'blue',
        columns: { role: crb.roleRef.name, subjects: String(crb.subjects?.length ?? 0) }
      }))
    }
  },

  CustomResourceDefinitions: {
    list: async (clients) => {
      const res = await clients.apiextensions.listCustomResourceDefinition()
      return res.items.map((crd) => {
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
      })
    }
  },

  Events: {
    list: async (clients, namespace) => {
      const res =
        namespace === 'ALL'
          ? await clients.core.listEventForAllNamespaces()
          : await clients.core.listNamespacedEvent({ namespace })
      return res.items.map((event) => ({
        ...baseMeta(event),
        statusText: event.type ?? 'Normal',
        statusColor: event.type === 'Warning' ? 'red' : 'default',
        columns: {
          reason: event.reason ?? '-',
          object: event.involvedObject?.name ?? '-',
          message: event.message ?? '-'
        }
      }))
    }
  }
}
