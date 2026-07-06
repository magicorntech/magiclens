import type { V1ContainerState } from '@kubernetes/client-node'
import type { PodDetailResponse, PodMetricsResponse, PodNetworkResponse } from '@shared/types/pod'
import type { ClusterClients } from './clusterManager'
import { parseCpuQuantity, parseMemoryQuantity } from './quantity'

function summarizeContainerState(state: V1ContainerState | undefined): string {
  if (!state) return 'Unknown'
  if (state.running) return 'Running'
  if (state.waiting) return state.waiting.reason ?? 'Waiting'
  if (state.terminated) return state.terminated.reason ?? 'Terminated'
  return 'Unknown'
}

export async function getPodDetail(
  clients: ClusterClients,
  namespace: string,
  podName: string
): Promise<PodDetailResponse> {
  const pod = await clients.core.readNamespacedPod({ name: podName, namespace })
  const statusByName = new Map((pod.status?.containerStatuses ?? []).map((s) => [s.name, s]))

  const containers = (pod.spec?.containers ?? []).map((c) => {
    const status = statusByName.get(c.name)
    return {
      name: c.name,
      image: c.image ?? '',
      ready: status?.ready ?? false,
      restartCount: status?.restartCount ?? 0,
      state: summarizeContainerState(status?.state),
      ports: (c.ports ?? []).map((p) => ({
        name: p.name,
        containerPort: p.containerPort,
        protocol: p.protocol ?? 'TCP'
      }))
    }
  })

  return {
    containers,
    nodeName: pod.spec?.nodeName ?? '-',
    podIP: pod.status?.podIP ?? '-',
    hostIP: pod.status?.hostIP ?? '-',
    qosClass: pod.status?.qosClass ?? '-',
    labels: pod.metadata?.labels ?? {}
  }
}

export async function getPodMetrics(
  clients: ClusterClients,
  namespace: string,
  podName: string
): Promise<PodMetricsResponse> {
  try {
    const podMetrics = await clients.metrics.getPodMetrics(namespace)
    const match = podMetrics.items.find((item) => item.metadata.name === podName)
    if (!match) {
      return { metricsAvailable: false, containers: [], totalCpuUsageCores: 0, totalMemoryUsageBytes: 0 }
    }
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
  } catch {
    return { metricsAvailable: false, containers: [], totalCpuUsageCores: 0, totalMemoryUsageBytes: 0 }
  }
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
