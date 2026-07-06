import type { ServiceDetailResponse } from '@shared/types/service'
import type { ClusterClients } from './clusterManager'

export async function getServiceDetail(
  clients: ClusterClients,
  namespace: string,
  serviceName: string
): Promise<ServiceDetailResponse> {
  const svc = await clients.core.readNamespacedService({ name: serviceName, namespace })
  return {
    type: svc.spec?.type ?? 'ClusterIP',
    clusterIP: svc.spec?.clusterIP ?? '-',
    ports: (svc.spec?.ports ?? []).map((p) => ({
      name: p.name,
      port: p.port,
      targetPort: p.targetPort !== undefined ? String(p.targetPort) : String(p.port),
      protocol: p.protocol ?? 'TCP'
    }))
  }
}

export async function resolveServiceBackingPod(
  clients: ClusterClients,
  namespace: string,
  serviceName: string,
  port: number
): Promise<{ podName: string; targetPort: number }> {
  const svc = await clients.core.readNamespacedService({ name: serviceName, namespace })
  const svcPort = (svc.spec?.ports ?? []).find((p) => p.port === port)
  if (!svcPort) {
    throw new Error(`Service port ${port} was not found on ${serviceName}`)
  }

  const selector = svc.spec?.selector
  if (!selector || Object.keys(selector).length === 0) {
    throw new Error('This service has no label selector, so a backing pod cannot be resolved automatically')
  }

  const labelSelector = Object.entries(selector)
    .map(([key, value]) => `${key}=${value}`)
    .join(',')
  const podsRes = await clients.core.listNamespacedPod({ namespace, labelSelector })
  const target = podsRes.items.find((p) => p.status?.phase === 'Running' && p.metadata?.name)
  if (!target?.metadata?.name) {
    throw new Error('No running pods were found behind this service')
  }

  const targetPort = svcPort.targetPort
  let numericTargetPort: number
  if (typeof targetPort === 'number') {
    numericTargetPort = targetPort
  } else if (typeof targetPort === 'string') {
    const containerPort = (target.spec?.containers ?? [])
      .flatMap((c) => c.ports ?? [])
      .find((p) => p.name === targetPort)
    numericTargetPort = containerPort?.containerPort ?? svcPort.port
  } else {
    numericTargetPort = svcPort.port
  }

  return { podName: target.metadata.name, targetPort: numericTargetPort }
}
