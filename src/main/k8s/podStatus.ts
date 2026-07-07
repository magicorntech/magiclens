import type { V1ContainerStatus, V1Pod } from '@kubernetes/client-node'

const WAITING_ERROR = new Set([
  'CrashLoopBackOff',
  'ErrImagePull',
  'ImagePullBackOff',
  'CreateContainerConfigError',
  'RunContainerError',
  'InvalidImageName',
  'CreateContainerError'
])

const WAITING_PENDING = new Set(['ContainerCreating', 'PodInitializing', 'Init'])

function worstContainerStatus(statuses: V1ContainerStatus[]): {
  statusText: string
  statusColor: string
  statusDetail?: string
} | null {
  for (const cs of statuses) {
    const waiting = cs.state?.waiting
    if (waiting?.reason) {
      const reason = waiting.reason
      const lastReason = cs.lastState?.terminated?.reason
      const detail =
        waiting.message ??
        (lastReason && lastReason !== reason ? `Last termination: ${lastReason}` : undefined)
      return {
        statusText: reason,
        statusColor: WAITING_ERROR.has(reason) ? 'red' : WAITING_PENDING.has(reason) ? 'gold' : 'gold',
        statusDetail: detail
      }
    }

    const terminated = cs.state?.terminated
    if (terminated) {
      const reason = terminated.reason ?? 'Terminated'
      const exitCode = terminated.exitCode ?? 0
      if (reason === 'OOMKilled' || reason === 'Error' || exitCode !== 0) {
        const detail =
          terminated.message ??
          (terminated.signal ? `Signal ${terminated.signal}` : undefined) ??
          (exitCode !== 0 ? `Exit code ${exitCode}` : undefined)
        return {
          statusText: reason,
          statusColor: 'red',
          statusDetail: detail
        }
      }
    }
  }

  return null
}

export function derivePodStatus(pod: V1Pod): {
  statusText: string
  statusColor: string
  statusDetail?: string
} {
  if (pod.metadata?.deletionTimestamp) {
    return {
      statusText: 'Terminating',
      statusColor: 'gold',
      statusDetail: pod.status?.reason ?? pod.status?.message ?? undefined
    }
  }

  const initStatuses = pod.status?.initContainerStatuses ?? []
  const containerStatuses = pod.status?.containerStatuses ?? []

  const initIssue = worstContainerStatus(initStatuses)
  if (initIssue) return initIssue

  const containerIssue = worstContainerStatus(containerStatuses)
  if (containerIssue) return containerIssue

  const phase = pod.status?.phase ?? 'Unknown'
  const podReason = pod.status?.reason
  const podMessage = pod.status?.message

  if (phase === 'Failed' || podReason) {
    return {
      statusText: podReason ?? phase,
      statusColor: 'red',
      statusDetail: podMessage ?? undefined
    }
  }

  const notReady = containerStatuses.some((cs) => !cs.ready)
  if (phase === 'Running' && notReady) {
    return {
      statusText: 'NotReady',
      statusColor: 'gold',
      statusDetail: podMessage ?? 'One or more containers are not ready'
    }
  }

  const phaseColor =
    phase === 'Running' || phase === 'Succeeded'
      ? 'green'
      : phase === 'Pending' || phase === 'Unknown'
        ? 'gold'
        : phase === 'Failed'
          ? 'red'
          : 'default'

  return {
    statusText: phase,
    statusColor: phaseColor,
    statusDetail: podMessage ?? undefined
  }
}
