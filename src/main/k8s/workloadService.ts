import type {
  V1Container,
  V1Deployment,
  V1Job,
  V1ReplicaSet
} from '@kubernetes/client-node'
import type { WorkloadKind } from '@shared/types/workload'
import type {
  HpaAttachment,
  PdbAttachment,
  RolloutHistoryResponse,
  RolloutRevision,
  WorkloadContainerInfo,
  WorkloadContextInfo,
  WorkloadScaleInfo
} from '@shared/types/workload'
import {
  kubectlResourceName,
  kubectlRestartCommand,
  kubectlRollbackCommand,
  kubectlScaleCommand
} from '@shared/workloadKubectl'
import type { ClusterClients } from './clusterManager'

const RESTART_ANNOTATION = 'kubectl.kubernetes.io/restartedAt'
const REVISION_ANNOTATION = 'deployment.kubernetes.io/revision'

function labelsToSelector(labels: Record<string, string> | undefined): string | undefined {
  if (!labels || Object.keys(labels).length === 0) return undefined
  return Object.entries(labels)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')
}

function extractContainers(containers: V1Container[] | undefined): WorkloadContainerInfo[] {
  return (containers ?? []).map((c) => ({ name: c.name ?? '', image: c.image ?? '' }))
}

async function detectExtensions(clients: ClusterClients): Promise<{ argoRollouts: boolean; keda: boolean }> {
  try {
    const crds = await clients.apiextensions.listCustomResourceDefinition()
    const names = new Set(crds.items.map((c) => c.metadata?.name))
    return {
      argoRollouts: names.has('rollouts.argoproj.io'),
      keda: names.has('scaledobjects.keda.sh')
    }
  } catch {
    return { argoRollouts: false, keda: false }
  }
}

async function findHpa(
  clients: ClusterClients,
  namespace: string,
  kind: string,
  name: string
): Promise<HpaAttachment | undefined> {
  const res = await clients.autoscaling.listNamespacedHorizontalPodAutoscaler({ namespace })
  const match = res.items.find((hpa) => {
    const ref = hpa.spec?.scaleTargetRef
    return ref?.name === name && ref.kind?.toLowerCase() === kind.toLowerCase()
  })
  if (!match) return undefined
  return {
    name: match.metadata?.name ?? '',
    namespace: match.metadata?.namespace ?? namespace,
    minReplicas: match.spec?.minReplicas,
    maxReplicas: match.spec?.maxReplicas,
    currentReplicas: match.status?.currentReplicas
  }
}

async function findPdbForSelector(
  clients: ClusterClients,
  namespace: string,
  matchLabels: Record<string, string> | undefined
): Promise<PdbAttachment | undefined> {
  if (!matchLabels) return undefined
  const res = await clients.policy.listNamespacedPodDisruptionBudget({ namespace })
  for (const pdb of res.items) {
    const selector = pdb.spec?.selector?.matchLabels
    if (!selector) continue
    const matches = Object.entries(selector).every(([k, v]) => matchLabels[k] === v)
    if (matches) {
      return {
        name: pdb.metadata?.name ?? '',
        namespace: pdb.metadata?.namespace ?? namespace,
        minAvailable: pdb.spec?.minAvailable != null ? String(pdb.spec.minAvailable) : undefined,
        maxUnavailable: pdb.spec?.maxUnavailable != null ? String(pdb.spec.maxUnavailable) : undefined
      }
    }
  }
  return undefined
}

async function listReplicaSetsForDeployment(
  clients: ClusterClients,
  namespace: string,
  deployment: V1Deployment
): Promise<V1ReplicaSet[]> {
  const selector = labelsToSelector(deployment.spec?.selector?.matchLabels)
  const res = await clients.apps.listNamespacedReplicaSet({
    namespace,
    labelSelector: selector
  })
  const depUid = deployment.metadata?.uid
  return res.items.filter((rs) =>
    rs.metadata?.ownerReferences?.some((o) => o.kind === 'Deployment' && o.uid === depUid)
  )
}

export async function getWorkloadContext(
  clients: ClusterClients,
  kind: WorkloadKind,
  namespace: string,
  name: string
): Promise<WorkloadContextInfo> {
  const extensions = await detectExtensions(clients)
  let containers: WorkloadContainerInfo[] = []
  let replicas: WorkloadScaleInfo | undefined
  let paused: boolean | undefined
  let suspended: boolean | undefined
  let matchLabels: Record<string, string> | undefined
  let hpaKind = ''
  let hpaName = name

  switch (kind) {
    case 'Deployments': {
      const dep = await clients.apps.readNamespacedDeployment({ name, namespace })
      const desired = dep.spec?.replicas ?? 0
      const ready = dep.status?.readyReplicas ?? 0
      containers = extractContainers(dep.spec?.template?.spec?.containers)
      paused = dep.spec?.paused
      matchLabels = dep.spec?.selector?.matchLabels
      hpaKind = 'Deployment'
      replicas = {
        currentReplicas: desired,
        readyReplicas: ready,
        kubectlResource: kubectlResourceName(kind),
        hasOwnerDeployment: false
      }
      break
    }
    case 'StatefulSets': {
      const sts = await clients.apps.readNamespacedStatefulSet({ name, namespace })
      const desired = sts.spec?.replicas ?? 0
      const ready = sts.status?.readyReplicas ?? 0
      containers = extractContainers(sts.spec?.template?.spec?.containers)
      matchLabels = sts.spec?.selector?.matchLabels
      hpaKind = 'StatefulSet'
      const ordinals: number[] = []
      for (let i = 0; i < desired; i++) ordinals.push(i)
      replicas = {
        currentReplicas: desired,
        readyReplicas: ready,
        kubectlResource: kubectlResourceName(kind),
        hasOwnerDeployment: false,
        statefulWarning: true,
        affectedOrdinals: ordinals
      }
      break
    }
    case 'DaemonSets': {
      const ds = await clients.apps.readNamespacedDaemonSet({ name, namespace })
      containers = extractContainers(ds.spec?.template?.spec?.containers)
      matchLabels = ds.spec?.selector?.matchLabels
      break
    }
    case 'ReplicaSets': {
      const rs = await clients.apps.readNamespacedReplicaSet({ name, namespace })
      const desired = rs.spec?.replicas ?? 0
      const ready = rs.status?.readyReplicas ?? 0
      containers = extractContainers(rs.spec?.template?.spec?.containers)
      matchLabels = rs.spec?.selector?.matchLabels
      const owner = rs.metadata?.ownerReferences?.find((o) => o.kind === 'Deployment')
      replicas = {
        currentReplicas: desired,
        readyReplicas: ready,
        kubectlResource: kubectlResourceName(kind),
        hasOwnerDeployment: !!owner,
        ownerDeploymentName: owner?.name
      }
      break
    }
    case 'ReplicationControllers': {
      const rc = await clients.core.readNamespacedReplicationController({ name, namespace })
      const desired = rc.spec?.replicas ?? 0
      const ready = rc.status?.readyReplicas ?? 0
      containers = extractContainers(rc.spec?.template?.spec?.containers)
      matchLabels = rc.spec?.selector
      hpaKind = 'ReplicationController'
      replicas = {
        currentReplicas: desired,
        readyReplicas: ready,
        kubectlResource: kubectlResourceName(kind),
        hasOwnerDeployment: false
      }
      break
    }
    case 'Jobs': {
      const job = await clients.batch.readNamespacedJob({ name, namespace })
      containers = extractContainers(job.spec?.template?.spec?.containers)
      suspended = job.spec?.suspend
      matchLabels = job.spec?.selector?.matchLabels
      break
    }
    case 'CronJobs': {
      const cj = await clients.batch.readNamespacedCronJob({ name, namespace })
      containers = extractContainers(cj.spec?.jobTemplate?.spec?.template?.spec?.containers)
      suspended = cj.spec?.suspend
      break
    }
    case 'HorizontalPodAutoscalers': {
      const hpa = await clients.autoscaling.readNamespacedHorizontalPodAutoscaler({ name, namespace })
      const ref = hpa.spec?.scaleTargetRef
      if (ref?.name) {
        hpaName = ref.name
        hpaKind = ref.kind ?? ''
      }
      return {
        containers: [],
        extensions,
        scaleTargetRef: ref?.name ? { kind: ref.kind ?? '', name: ref.name } : undefined
      }
    }
  }

  const hpa = hpaKind ? await findHpa(clients, namespace, hpaKind, hpaName) : undefined
  const pdb = await findPdbForSelector(clients, namespace, matchLabels)

  return { containers, replicas, paused, suspended, hpa, pdb, extensions }
}

export async function scaleWorkload(
  clients: ClusterClients,
  kind: WorkloadKind,
  namespace: string,
  name: string,
  replicas: number
): Promise<{ kubectlCommand: string }> {
  const kubectlCommand = kubectlScaleCommand(kind, name, namespace, replicas)
  switch (kind) {
    case 'Deployments':
      await clients.apps.replaceNamespacedDeploymentScale({ name, namespace, body: { spec: { replicas } } })
      break
    case 'StatefulSets':
      await clients.apps.replaceNamespacedStatefulSetScale({ name, namespace, body: { spec: { replicas } } })
      break
    case 'ReplicaSets':
      await clients.apps.replaceNamespacedReplicaSetScale({ name, namespace, body: { spec: { replicas } } })
      break
    case 'ReplicationControllers':
      await clients.core.replaceNamespacedReplicationControllerScale({ name, namespace, body: { spec: { replicas } } })
      break
    default:
      throw new Error(`Scale is not supported for ${kind}`)
  }
  return { kubectlCommand }
}

export async function restartWorkload(
  clients: ClusterClients,
  kind: WorkloadKind,
  namespace: string,
  name: string
): Promise<{ kubectlCommand: string }> {
  const kubectlCommand = kubectlRestartCommand(kind, name, namespace)
  const patch = {
    spec: {
      template: {
        metadata: {
          annotations: {
            [RESTART_ANNOTATION]: new Date().toISOString()
          }
        }
      }
    }
  }
  switch (kind) {
    case 'Deployments':
      await clients.apps.patchNamespacedDeployment({ name, namespace, body: patch })
      break
    case 'StatefulSets':
      await clients.apps.patchNamespacedStatefulSet({ name, namespace, body: patch })
      break
    case 'DaemonSets':
      await clients.apps.patchNamespacedDaemonSet({ name, namespace, body: patch })
      break
    default:
      throw new Error(`Restart is not supported for ${kind}`)
  }
  return { kubectlCommand }
}

export async function setDeploymentPaused(
  clients: ClusterClients,
  namespace: string,
  name: string,
  paused: boolean
): Promise<{ kubectlCommand: string }> {
  await clients.apps.patchNamespacedDeployment({ name, namespace, body: { spec: { paused } } })
  const verb = paused ? 'pause' : 'resume'
  return { kubectlCommand: `kubectl rollout ${verb} deployment ${name} -n ${namespace}` }
}

export async function getDeploymentRolloutHistory(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<RolloutHistoryResponse> {
  const dep = await clients.apps.readNamespacedDeployment({ name, namespace })
  const currentRevision = Number(dep.metadata?.annotations?.[REVISION_ANNOTATION] ?? 0)
  const replicaSets = await listReplicaSetsForDeployment(clients, namespace, dep)
  const revisions: RolloutRevision[] = replicaSets
    .map((rs) => {
      const revision = Number(rs.metadata?.annotations?.[REVISION_ANNOTATION] ?? 0)
      const images = extractContainers(rs.spec?.template?.spec?.containers).map((c) => c.image)
      return {
        revision,
        replicaSetName: rs.metadata?.name ?? '',
        replicas: rs.spec?.replicas ?? 0,
        readyReplicas: rs.status?.readyReplicas ?? 0,
        createdAt: rs.metadata?.creationTimestamp
          ? new Date(rs.metadata.creationTimestamp).toISOString()
          : null,
        isCurrent: revision === currentRevision,
        images
      }
    })
    .filter((r) => r.revision > 0)
    .sort((a, b) => b.revision - a.revision)
  return { currentRevision, revisions }
}

export async function rollbackDeployment(
  clients: ClusterClients,
  namespace: string,
  name: string,
  revision: number
): Promise<{ kubectlCommand: string }> {
  const dep = await clients.apps.readNamespacedDeployment({ name, namespace })
  const replicaSets = await listReplicaSetsForDeployment(clients, namespace, dep)
  const target = replicaSets.find((rs) => rs.metadata?.annotations?.[REVISION_ANNOTATION] === String(revision))
  if (!target?.spec?.template) {
    throw new Error(`Revision ${revision} not found`)
  }
  await clients.apps.patchNamespacedDeployment({
    name,
    namespace,
    body: { spec: { template: target.spec.template } }
  })
  return { kubectlCommand: kubectlRollbackCommand(name, namespace, revision) }
}

export async function changeWorkloadImage(
  clients: ClusterClients,
  kind: WorkloadKind,
  namespace: string,
  name: string,
  containerName: string,
  image: string
): Promise<{ kubectlCommand: string }> {
  const patch = {
    spec: {
      template: {
        spec: {
          containers: [{ name: containerName, image }]
        }
      }
    }
  }
  switch (kind) {
    case 'Deployments':
      await clients.apps.patchNamespacedDeployment({ name, namespace, body: patch })
      break
    case 'StatefulSets':
      await clients.apps.patchNamespacedStatefulSet({ name, namespace, body: patch })
      break
    case 'DaemonSets':
      await clients.apps.patchNamespacedDaemonSet({ name, namespace, body: patch })
      break
    default:
      throw new Error(`Change image is not supported for ${kind}`)
  }
  const kubectlCommand = `kubectl set image ${kubectlResourceName(kind)}/${name} ${containerName}=${image} -n ${namespace}`
  return { kubectlCommand }
}

export async function setJobSuspended(
  clients: ClusterClients,
  namespace: string,
  name: string,
  suspend: boolean
): Promise<{ kubectlCommand: string }> {
  await clients.batch.patchNamespacedJob({ name, namespace, body: { spec: { suspend } } })
  return { kubectlCommand: `kubectl patch job ${name} -n ${namespace} -p '{"spec":{"suspend":${suspend}}}'` }
}

export async function rerunJob(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<{ kubectlCommand: string; createdName: string }> {
  const job = await clients.batch.readNamespacedJob({ name, namespace })
  if (!job.spec?.template) throw new Error('Job has no pod template')
  const ts = Date.now()
  const createdName = `${name}-rerun-${ts}`
  const body: V1Job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: { name: createdName, namespace },
    spec: structuredClone(job.spec)
  }
  await clients.batch.createNamespacedJob({ namespace, body })
  return { kubectlCommand: `kubectl create job ${createdName} --from=job/${name} -n ${namespace}`, createdName }
}

export async function setCronJobSuspended(
  clients: ClusterClients,
  namespace: string,
  name: string,
  suspend: boolean
): Promise<{ kubectlCommand: string }> {
  await clients.batch.patchNamespacedCronJob({ name, namespace, body: { spec: { suspend } } })
  return { kubectlCommand: `kubectl patch cronjob ${name} -n ${namespace} -p '{"spec":{"suspend":${suspend}}}'` }
}

export async function triggerCronJob(
  clients: ClusterClients,
  namespace: string,
  name: string
): Promise<{ kubectlCommand: string; createdName: string }> {
  const cj = await clients.batch.readNamespacedCronJob({ name, namespace })
  const jobSpec = cj.spec?.jobTemplate?.spec
  if (!jobSpec?.template) throw new Error('CronJob has no job template')
  const ts = Date.now()
  const createdName = `${name}-manual-${ts}`
  const body: V1Job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: createdName,
      namespace,
      ownerReferences: cj.metadata?.uid
        ? [
            {
              apiVersion: 'batch/v1',
              kind: 'CronJob',
              name,
              uid: cj.metadata.uid,
              controller: true,
              blockOwnerDeletion: true
            }
          ]
        : undefined
    },
    spec: structuredClone(jobSpec)
  }
  await clients.batch.createNamespacedJob({ namespace, body })
  return {
    kubectlCommand: `kubectl create job --from=cronjob/${name} ${createdName} -n ${namespace}`,
    createdName
  }
}

export async function deleteWorkloadPods(
  clients: ClusterClients,
  kind: WorkloadKind,
  namespace: string,
  name: string
): Promise<{ kubectlCommand: string; deletedCount?: number }> {
  let labelSelector: string | undefined
  switch (kind) {
    case 'Deployments': {
      const dep = await clients.apps.readNamespacedDeployment({ name, namespace })
      labelSelector = labelsToSelector(dep.spec?.selector?.matchLabels)
      break
    }
    case 'StatefulSets': {
      const sts = await clients.apps.readNamespacedStatefulSet({ name, namespace })
      labelSelector = labelsToSelector(sts.spec?.selector?.matchLabels)
      break
    }
    case 'DaemonSets': {
      const ds = await clients.apps.readNamespacedDaemonSet({ name, namespace })
      labelSelector = labelsToSelector(ds.spec?.selector?.matchLabels)
      break
    }
    case 'ReplicaSets': {
      const rs = await clients.apps.readNamespacedReplicaSet({ name, namespace })
      labelSelector = labelsToSelector(rs.spec?.selector?.matchLabels)
      break
    }
    case 'ReplicationControllers': {
      const rc = await clients.core.readNamespacedReplicationController({ name, namespace })
      labelSelector = labelsToSelector(rc.spec?.selector)
      break
    }
    default:
      throw new Error(`Delete pods is not supported for ${kind}`)
  }
  if (!labelSelector) throw new Error('Workload has no pod label selector')
  const pods = await clients.core.listNamespacedPod({ namespace, labelSelector })
  const kubectlCommand = `kubectl delete pods -n ${namespace} -l ${labelSelector}`
  if (pods.items.length === 0) return { kubectlCommand, deletedCount: 0 }
  await clients.core.deleteCollectionNamespacedPod({ namespace, labelSelector })
  return { kubectlCommand, deletedCount: pods.items.length }
}
