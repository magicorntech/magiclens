import type {
  V1Container,
  V1ContainerState,
  V1ContainerStatus,
  V1EnvVar,
  V1Pod,
  V1Probe,
  V1SecurityContext,
  V1PodSecurityContext,
  V1Volume
} from '@kubernetes/client-node'
import type {
  PodContainerInfo,
  PodDetailResponse,
  PodEnvVar,
  PodMetricsResponse,
  NamespacePodMetricsResponse,
  PodNetworkResponse,
  PodProbeInfo,
  PodResourceQuantities,
  PodSecurityContextInfo,
  PodVolumeInfo
} from '@shared/types/pod'
import type { ClusterClients } from './clusterManager'
import { parseCpuQuantity, parseMemoryQuantity } from './quantity'
import { derivePodStatus } from './podStatus'
import { namespacePodUsageFromPrometheus, podUsageFromPrometheus } from './metricsService'

function summarizeContainerState(state: V1ContainerState | undefined): {
  state: string
  stateMessage?: string
  stateStartedAt?: string
} {
  if (!state) return { state: 'Unknown' }
  if (state.running) {
    return { state: 'Running', stateStartedAt: state.running.startedAt?.toISOString?.() }
  }
  if (state.waiting) {
    return {
      state: state.waiting.reason ?? 'Waiting',
      stateMessage: state.waiting.message ?? undefined
    }
  }
  if (state.terminated) {
    return {
      state: state.terminated.reason ?? 'Terminated',
      stateMessage: state.terminated.message ?? undefined,
      stateStartedAt: state.terminated.startedAt?.toISOString?.()
    }
  }
  return { state: 'Unknown' }
}

function toIso(value: Date | string | undefined): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function formatProbe(probe: V1Probe | undefined, type: PodProbeInfo['type']): PodProbeInfo | null {
  if (!probe) return null
  let handler = 'Unknown'
  if (probe.httpGet) {
    const scheme = (probe.httpGet.scheme ?? 'HTTP').toUpperCase()
    handler = `${scheme} GET ${probe.httpGet.path ?? '/'}:${probe.httpGet.port}`
  } else if (probe.tcpSocket) {
    handler = `TCP ${probe.tcpSocket.port}`
  } else if (probe.exec) {
    handler = `exec: ${(probe.exec.command ?? []).join(' ')}`
  } else if (probe.grpc) {
    handler = `gRPC :${probe.grpc.port}`
  }
  return {
    type,
    handler,
    initialDelaySeconds: probe.initialDelaySeconds ?? undefined,
    periodSeconds: probe.periodSeconds ?? undefined,
    timeoutSeconds: probe.timeoutSeconds ?? undefined,
    successThreshold: probe.successThreshold ?? undefined,
    failureThreshold: probe.failureThreshold ?? undefined
  }
}

function mapEnv(container: V1Container): PodEnvVar[] {
  const out: PodEnvVar[] = []
  for (const e of (container.env ?? []) as V1EnvVar[]) {
    if (e.valueFrom) {
      const vf = e.valueFrom
      let source = 'valueFrom'
      if (vf.secretKeyRef) source = `secret: ${vf.secretKeyRef.name}/${vf.secretKeyRef.key}`
      else if (vf.configMapKeyRef) source = `configMap: ${vf.configMapKeyRef.name}/${vf.configMapKeyRef.key}`
      else if (vf.fieldRef) source = `field: ${vf.fieldRef.fieldPath}`
      else if (vf.resourceFieldRef) source = `resource: ${vf.resourceFieldRef.resource}`
      out.push({ name: e.name, source })
    } else {
      out.push({ name: e.name, value: e.value ?? '' })
    }
  }
  for (const ef of container.envFrom ?? []) {
    if (ef.configMapRef) out.push({ name: `* ${ef.configMapRef.name}`, source: 'envFrom configMap' })
    if (ef.secretRef) out.push({ name: `* ${ef.secretRef.name}`, source: 'envFrom secret' })
  }
  return out
}

function mapResources(container: V1Container): {
  requests?: PodResourceQuantities
  limits?: PodResourceQuantities
} {
  const r = container.resources
  const pick = (m: Record<string, string> | undefined): PodResourceQuantities | undefined => {
    if (!m) return undefined
    const q: PodResourceQuantities = {}
    if (m.cpu) q.cpu = m.cpu
    if (m.memory) q.memory = m.memory
    if (m['ephemeral-storage']) q.ephemeralStorage = m['ephemeral-storage']
    return Object.keys(q).length ? q : undefined
  }
  return {
    requests: pick(r?.requests as Record<string, string> | undefined),
    limits: pick(r?.limits as Record<string, string> | undefined)
  }
}

function mapSecurityContext(
  sc: V1SecurityContext | V1PodSecurityContext | undefined
): PodSecurityContextInfo | undefined {
  if (!sc) return undefined
  const containerSc = sc as V1SecurityContext
  const out: PodSecurityContextInfo = {
    runAsUser: sc.runAsUser ?? undefined,
    runAsGroup: sc.runAsGroup ?? undefined,
    fsGroup: (sc as V1PodSecurityContext).fsGroup ?? undefined,
    runAsNonRoot: sc.runAsNonRoot ?? undefined,
    readOnlyRootFilesystem: containerSc.readOnlyRootFilesystem ?? undefined,
    privileged: containerSc.privileged ?? undefined,
    allowPrivilegeEscalation: containerSc.allowPrivilegeEscalation ?? undefined,
    seccompProfile: sc.seccompProfile?.type ?? undefined,
    capabilitiesAdd: containerSc.capabilities?.add ?? undefined,
    capabilitiesDrop: containerSc.capabilities?.drop ?? undefined
  }
  const hasAny = Object.values(out).some((v) => v !== undefined)
  return hasAny ? out : undefined
}

function mapVolumes(pod: V1Pod): PodVolumeInfo[] {
  return (pod.spec?.volumes ?? []).map((v: V1Volume) => {
    let type = 'Unknown'
    let detail: string | undefined
    if (v.persistentVolumeClaim) {
      type = 'PersistentVolumeClaim'
      detail = v.persistentVolumeClaim.claimName
    } else if (v.configMap) {
      type = 'ConfigMap'
      detail = v.configMap.name
    } else if (v.secret) {
      type = 'Secret'
      detail = v.secret.secretName
    } else if (v.emptyDir) {
      type = 'EmptyDir'
      detail = v.emptyDir.medium || 'default'
    } else if (v.hostPath) {
      type = 'HostPath'
      detail = v.hostPath.path
    } else if (v.projected) {
      type = 'Projected'
      detail = `${v.projected.sources?.length ?? 0} sources`
    } else if (v.downwardAPI) {
      type = 'DownwardAPI'
    } else if (v.nfs) {
      type = 'NFS'
      detail = `${v.nfs.server}:${v.nfs.path}`
    } else if (v.csi) {
      type = 'CSI'
      detail = v.csi.driver
    }
    return { name: v.name, type, detail }
  })
}

function affinitySummary(pod: V1Pod): string[] {
  const out: string[] = []
  const aff = pod.spec?.affinity
  if (aff?.nodeAffinity) {
    if (aff.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution) out.push('nodeAffinity: required')
    if ((aff.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution?.length ?? 0) > 0)
      out.push('nodeAffinity: preferred')
  }
  if (aff?.podAffinity) out.push('podAffinity')
  if (aff?.podAntiAffinity) out.push('podAntiAffinity')
  if ((pod.spec?.topologySpreadConstraints?.length ?? 0) > 0)
    out.push(`topologySpread: ${pod.spec?.topologySpreadConstraints?.length}`)
  return out
}

function mapContainer(
  c: V1Container,
  status: V1ContainerStatus | undefined,
  isInit: boolean
): PodContainerInfo {
  const stateInfo = summarizeContainerState(status?.state)
  const { requests, limits } = mapResources(c)
  const probes: PodProbeInfo[] = []
  const liveness = formatProbe(c.livenessProbe, 'liveness')
  const readiness = formatProbe(c.readinessProbe, 'readiness')
  const startup = formatProbe(c.startupProbe, 'startup')
  if (liveness) probes.push(liveness)
  if (readiness) probes.push(readiness)
  if (startup) probes.push(startup)

  return {
    name: c.name,
    image: c.image ?? '',
    imagePullPolicy: c.imagePullPolicy ?? undefined,
    ready: status?.ready ?? false,
    started: status?.started ?? undefined,
    restartCount: status?.restartCount ?? 0,
    state: stateInfo.state,
    stateMessage: stateInfo.stateMessage,
    stateStartedAt: stateInfo.stateStartedAt,
    lastTerminatedReason: status?.lastState?.terminated?.reason ?? undefined,
    lastTerminatedExitCode: status?.lastState?.terminated?.exitCode ?? undefined,
    lastTerminatedAt: toIso(status?.lastState?.terminated?.finishedAt),
    ports: (c.ports ?? []).map((p) => ({
      name: p.name,
      containerPort: p.containerPort,
      protocol: p.protocol ?? 'TCP'
    })),
    isInit,
    requests,
    limits,
    env: mapEnv(c),
    mounts: (c.volumeMounts ?? []).map((m) => ({
      name: m.name,
      mountPath: m.mountPath,
      readOnly: m.readOnly ?? false,
      subPath: m.subPath ?? undefined
    })),
    probes,
    command: c.command ?? undefined,
    args: c.args ?? undefined,
    securityContext: mapSecurityContext(c.securityContext)
  }
}

export async function getPodDetail(
  clients: ClusterClients,
  namespace: string,
  podName: string
): Promise<PodDetailResponse> {
  const pod = await clients.core.readNamespacedPod({ name: podName, namespace })
  const statusByName = new Map((pod.status?.containerStatuses ?? []).map((s) => [s.name, s]))
  const initStatusByName = new Map((pod.status?.initContainerStatuses ?? []).map((s) => [s.name, s]))

  const containers = (pod.spec?.containers ?? []).map((c) =>
    mapContainer(c, statusByName.get(c.name), false)
  )
  const initContainers = (pod.spec?.initContainers ?? []).map((c) =>
    mapContainer(c, initStatusByName.get(c.name), true)
  )

  const readyCount = (pod.status?.containerStatuses ?? []).filter((s) => s.ready).length
  const totalCount = pod.spec?.containers?.length ?? 0
  const totalRestarts = [
    ...(pod.status?.containerStatuses ?? []),
    ...(pod.status?.initContainerStatuses ?? [])
  ].reduce((sum, s) => sum + (s.restartCount ?? 0), 0)

  const podStatus = derivePodStatus(pod)

  return {
    uid: pod.metadata?.uid ?? '-',
    creationTimestamp: toIso(pod.metadata?.creationTimestamp),
    phase: pod.status?.phase ?? 'Unknown',
    statusText: podStatus.statusText,
    statusColor: podStatus.statusColor,
    statusDetail: podStatus.statusDetail,
    ready: `${readyCount}/${totalCount}`,
    totalRestarts,
    nodeName: pod.spec?.nodeName ?? '-',
    podIP: pod.status?.podIP ?? '-',
    hostIP: pod.status?.hostIP ?? '-',
    qosClass: pod.status?.qosClass ?? '-',
    serviceAccount: pod.spec?.serviceAccountName ?? pod.spec?.serviceAccount ?? 'default',
    priorityClass: pod.spec?.priorityClassName ?? undefined,
    restartPolicy: pod.spec?.restartPolicy ?? undefined,
    labels: pod.metadata?.labels ?? {},
    annotations: pod.metadata?.annotations ?? {},
    ownerReferences: (pod.metadata?.ownerReferences ?? []).map((o) => ({
      kind: o.kind,
      name: o.name,
      controller: o.controller ?? false
    })),
    conditions: (pod.status?.conditions ?? []).map((c) => ({
      type: c.type,
      status: c.status,
      reason: c.reason ?? undefined,
      message: c.message ?? undefined,
      lastTransitionTime: toIso(c.lastTransitionTime)
    })),
    nodeSelector: pod.spec?.nodeSelector ?? {},
    tolerations: (pod.spec?.tolerations ?? []).map((t) => ({
      key: t.key ?? undefined,
      operator: t.operator ?? undefined,
      value: t.value ?? undefined,
      effect: t.effect ?? undefined,
      tolerationSeconds: t.tolerationSeconds ?? undefined
    })),
    affinitySummary: affinitySummary(pod),
    securityContext: mapSecurityContext(pod.spec?.securityContext),
    volumes: mapVolumes(pod),
    containers,
    initContainers
  }
}

export async function getPodMetrics(
  clients: ClusterClients,
  clusterId: string,
  namespace: string,
  podName: string
): Promise<PodMetricsResponse> {
  try {
    const podMetrics = await clients.metrics.getPodMetrics(namespace)
    const match = podMetrics.items.find((item) => item.metadata.name === podName)
    if (match) {
      const containers = match.containers.map((c) => ({
        name: c.name,
        cpuUsageCores: parseCpuQuantity(c.usage.cpu),
        memoryUsageBytes: parseMemoryQuantity(c.usage.memory)
      }))
      return {
        metricsAvailable: true,
        containers,
        totalCpuUsageCores: containers.reduce((sum, c) => sum + c.cpuUsageCores, 0),
        totalMemoryUsageBytes: containers.reduce((sum, c) => sum + c.memoryUsageBytes, 0)
      }
    }
  } catch {
    // fall through to Prometheus
  }

  const fromProm = await podUsageFromPrometheus(clusterId, namespace, podName)
  if (fromProm) {
    return {
      metricsAvailable: true,
      containers: fromProm.containers,
      totalCpuUsageCores: fromProm.containers.reduce((sum, c) => sum + c.cpuUsageCores, 0),
      totalMemoryUsageBytes: fromProm.containers.reduce((sum, c) => sum + c.memoryUsageBytes, 0)
    }
  }

  return { metricsAvailable: false, containers: [], totalCpuUsageCores: 0, totalMemoryUsageBytes: 0 }
}

export async function getNamespacePodMetrics(
  clients: ClusterClients,
  clusterId: string,
  namespace: string
): Promise<NamespacePodMetricsResponse> {
  try {
    const podMetrics = await clients.metrics.getPodMetrics(namespace)
    const pods = podMetrics.items.map((item) => {
      const containers = item.containers.map((c) => ({
        name: c.name,
        cpuUsageCores: parseCpuQuantity(c.usage.cpu),
        memoryUsageBytes: parseMemoryQuantity(c.usage.memory)
      }))
      return {
        podName: item.metadata?.name ?? '',
        cpuUsageCores: containers.reduce((sum, c) => sum + c.cpuUsageCores, 0),
        memoryUsageBytes: containers.reduce((sum, c) => sum + c.memoryUsageBytes, 0)
      }
    })
    return { metricsAvailable: true, pods: pods.filter((p) => p.podName) }
  } catch {
    // fall through to Prometheus
  }

  const fromProm = await namespacePodUsageFromPrometheus(clusterId, namespace)
  if (fromProm) return { metricsAvailable: true, pods: fromProm }
  return { metricsAvailable: false, pods: [] }
}

function selectorMatchesLabels(selector: Record<string, string> | undefined, labels: Record<string, string>): boolean {
  if (!selector || Object.keys(selector).length === 0) return false
  return Object.entries(selector).every(([key, value]) => labels[key] === value)
}

export async function getPodNetwork(
  clients: ClusterClients,
  namespace: string,
  podName: string
): Promise<PodNetworkResponse> {
  const pod = await clients.core.readNamespacedPod({ name: podName, namespace })
  const labels = pod.metadata?.labels ?? {}

  const servicesRes = await clients.core.listNamespacedService({ namespace })
  const services = servicesRes.items
    .filter((svc) => selectorMatchesLabels(svc.spec?.selector, labels))
    .map((svc) => ({
      name: svc.metadata?.name ?? '',
      type: svc.spec?.type ?? 'ClusterIP',
      clusterIP: svc.spec?.clusterIP ?? '-',
      ports: (svc.spec?.ports ?? []).map((p) => ({
        name: p.name,
        port: p.port,
        targetPort: p.targetPort !== undefined ? String(p.targetPort) : String(p.port),
        protocol: p.protocol ?? 'TCP'
      }))
    }))

  return { services }
}
