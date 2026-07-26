import type { V1Pod, V1Toleration } from '@kubernetes/client-node'
import type { ClusterNodeShellSettings } from '@shared/types/clusterSettings'
import { DEFAULT_NODE_SHELL_IMAGE, mergeClusterSettings } from '@shared/types/clusterSettings'
import { listClusters } from '../persistence/clusterStore'
import type { ClusterClients } from './clusterManager'

const DEBUG_NAMESPACE = 'default'
const DEBUG_CONTAINER = 'debugger'
const POD_READY_TIMEOUT_MS = 120_000
const POD_DELETE_TIMEOUT_MS = 60_000
/** Bump to force recreate of existing node-debug pods after shell/image fixes. */
const DEBUG_REVISION = '5'

/**
 * Host shell — same model as `kubectl debug node`: host root is mounted at `/host`,
 * then we `chroot /host` (do NOT combine with `nsenter -m`, which leaves the container
 * mount namespace and makes `/host` disappear).
 */
export const NODE_HOST_SHELL_COMMAND = [
  '/bin/sh',
  '-c',
  'chroot /host sh -c "command -v bash >/dev/null 2>&1 && exec bash -l || exec sh -l"'
]

function debugPodName(nodeName: string): string {
  const suffix = nodeName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
  return `magiclens-debug-${suffix}`.slice(0, 63)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isNotFound(err: unknown): boolean {
  const status = (err as { code?: number; statusCode?: number; body?: string } | null) ?? null
  if (status?.code === 404 || status?.statusCode === 404) return true
  const body = typeof status?.body === 'string' ? status.body : String(err)
  return body.includes('"code":404') || body.includes('NotFound') || body.includes('not found')
}

function isAlreadyExists(err: unknown): boolean {
  const status = (err as { code?: number; statusCode?: number; body?: string } | null) ?? null
  if (status?.code === 409 || status?.statusCode === 409) return true
  const body = typeof status?.body === 'string' ? status.body : String(err)
  return body.includes('AlreadyExists') || body.includes('"code":409')
}

function resolveNodeShellSettings(clusterId: string): ClusterNodeShellSettings {
  const entry = listClusters().find((c) => c.id === clusterId)
  return mergeClusterSettings(entry?.settings).nodeShell
}

function parseTolerations(raw: string): V1Toleration[] {
  try {
    const parsed = JSON.parse(raw || '[]') as unknown
    if (Array.isArray(parsed)) return parsed as V1Toleration[]
  } catch {
    // fall through
  }
  return [{ operator: 'Exists' }]
}

function parseNodeSelector(raw: string): Record<string, string> | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // key=value,key=value
  }
  const out: Record<string, string> = {}
  for (const part of trimmed.split(',')) {
    const [k, ...rest] = part.split('=')
    if (k?.trim() && rest.length) out[k.trim()] = rest.join('=').trim()
  }
  return Object.keys(out).length ? out : undefined
}

function describePodFailure(pod: V1Pod): string {
  const parts: string[] = []
  const phase = pod.status?.phase
  if (phase) parts.push(`phase=${phase}`)
  if (pod.status?.reason) parts.push(`reason=${pod.status.reason}`)
  if (pod.status?.message) parts.push(pod.status.message)

  for (const cs of pod.status?.containerStatuses ?? []) {
    const waiting = cs.state?.waiting
    const terminated = cs.state?.terminated
    if (waiting) {
      parts.push(
        `container/${cs.name} waiting: ${waiting.reason ?? 'Unknown'}${waiting.message ? ` — ${waiting.message}` : ''}`
      )
    }
    if (terminated) {
      parts.push(
        `container/${cs.name} terminated: ${terminated.reason ?? 'Unknown'} (exit ${terminated.exitCode})${
          terminated.message ? ` — ${terminated.message}` : ''
        }`
      )
    }
  }

  for (const cs of pod.status?.initContainerStatuses ?? []) {
    const waiting = cs.state?.waiting
    const terminated = cs.state?.terminated
    if (waiting?.reason) {
      parts.push(`init/${cs.name} waiting: ${waiting.reason}${waiting.message ? ` — ${waiting.message}` : ''}`)
    }
    if (terminated?.reason) {
      parts.push(
        `init/${cs.name} terminated: ${terminated.reason} (exit ${terminated.exitCode})`
      )
    }
  }

  return parts.join('; ') || 'unknown failure'
}

async function waitForPodRunning(
  clients: ClusterClients,
  namespace: string,
  podName: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastDetail = ''
  while (Date.now() < deadline) {
    const pod = await clients.core.readNamespacedPod({ name: podName, namespace })
    const phase = pod.status?.phase
    lastDetail = describePodFailure(pod)

    if (phase === 'Running') {
      const ready = pod.status?.containerStatuses?.every((c) => c.ready) ?? false
      if (ready) return
    }

    // Surface pull/crash failures early instead of waiting the full timeout.
    const waitingReasons = (pod.status?.containerStatuses ?? [])
      .map((c) => c.state?.waiting?.reason)
      .filter(Boolean)
    const pullFailed = waitingReasons.some(
      (r) => r === 'ErrImagePull' || r === 'ImagePullBackOff' || r === 'InvalidImageName'
    )
    if (phase === 'Failed' || phase === 'Succeeded' || pullFailed) {
      throw new Error(`Debug pod ${namespace}/${podName} failed (${lastDetail})`)
    }

    await sleep(500)
  }
  throw new Error(
    `Timed out waiting for debug pod ${namespace}/${podName} to become ready (${lastDetail || 'no status yet'})`
  )
}

async function waitForPodGone(
  clients: ClusterClients,
  namespace: string,
  podName: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await clients.core.readNamespacedPod({ name: podName, namespace })
      await sleep(400)
    } catch (err) {
      if (isNotFound(err)) return
      throw err
    }
  }
  throw new Error(`Timed out waiting for debug pod ${namespace}/${podName} to be deleted`)
}

export const NODE_DEBUG_NAMESPACE = DEBUG_NAMESPACE

export async function deleteDebugPod(
  clients: ClusterClients,
  namespace: string,
  podName: string
): Promise<void> {
  try {
    await clients.core.deleteNamespacedPod({
      name: podName,
      namespace,
      gracePeriodSeconds: 0,
      propagationPolicy: 'Background'
    })
  } catch (err) {
    if (isNotFound(err)) return
    throw err
  }
  await waitForPodGone(clients, namespace, podName, POD_DELETE_TIMEOUT_MS)
}

function buildDebugPod(nodeName: string, podName: string, settings: ClusterNodeShellSettings): V1Pod {
  const image = settings.image.trim() || DEFAULT_NODE_SHELL_IMAGE
  const nodeSelector = parseNodeSelector(settings.nodeSelector)
  const resources =
    settings.cpuLimit || settings.memoryLimit
      ? {
          limits: {
            ...(settings.cpuLimit ? { cpu: settings.cpuLimit } : {}),
            ...(settings.memoryLimit ? { memory: settings.memoryLimit } : {})
          }
        }
      : undefined

  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      labels: {
        'app.kubernetes.io/managed-by': 'magiclens',
        'magiclens.io/node-debug': 'true',
        'magiclens.io/debug-revision': DEBUG_REVISION
      },
      ...(settings.cleanupTtlSec > 0
        ? {
            annotations: {
              'magiclens.io/cleanup-ttl-seconds': String(settings.cleanupTtlSec)
            }
          }
        : {})
    },
    spec: {
      nodeName,
      hostPID: true,
      hostNetwork: true,
      hostIPC: true,
      restartPolicy: 'Never',
      ...(nodeSelector ? { nodeSelector } : {}),
      tolerations: parseTolerations(settings.tolerationsJson),
      ...(settings.pullSecret
        ? { imagePullSecrets: [{ name: settings.pullSecret.trim() }] }
        : {}),
      containers: [
        {
          name: DEBUG_CONTAINER,
          image,
          imagePullPolicy: settings.pullPolicy,
          // Portable keep-alive (works on alpine + busybox; avoids `sleep infinity` quirks)
          command: ['/bin/sh', '-c', 'while true; do sleep 3600; done'],
          securityContext: {
            // chroot /host requires privileged (same as kubectl --profile=sysadmin)
            privileged: settings.privileged !== false,
            runAsUser: 0,
            runAsNonRoot: false,
            allowPrivilegeEscalation: true
          },
          ...(resources ? { resources } : {}),
          volumeMounts: [{ name: 'host-root', mountPath: '/host' }]
        }
      ],
      volumes: [{ name: 'host-root', hostPath: { path: '/' } }]
    }
  }
}

function podUsable(pod: V1Pod, desiredImage: string): boolean {
  const phase = pod.status?.phase
  const existingImage = pod.spec?.containers?.[0]?.image
  const existingRevision = pod.metadata?.labels?.['magiclens.io/debug-revision']
  return (
    phase === 'Running' &&
    existingImage === desiredImage &&
    existingRevision === DEBUG_REVISION &&
    (pod.status?.containerStatuses?.every((c) => c.ready) ?? false)
  )
}

function podNeedsRecreate(pod: V1Pod, desiredImage: string): boolean {
  const phase = pod.status?.phase
  if (phase === 'Failed' || phase === 'Succeeded') return true
  const existingImage = pod.spec?.containers?.[0]?.image
  const existingRevision = pod.metadata?.labels?.['magiclens.io/debug-revision']
  return existingImage !== desiredImage || existingRevision !== DEBUG_REVISION
}

/** Ensures a privileged debug pod exists on the node, ready for host shell access. */
export async function ensureNodeDebugPod(
  clients: ClusterClients,
  nodeName: string,
  clusterId: string
): Promise<{ namespace: string; podName: string; containerName: string }> {
  const settings = resolveNodeShellSettings(clusterId)
  const podName = debugPodName(nodeName)
  const namespace = DEBUG_NAMESPACE
  const desiredImage = settings.image.trim() || DEFAULT_NODE_SHELL_IMAGE

  let existing: V1Pod | null = null
  try {
    existing = await clients.core.readNamespacedPod({ name: podName, namespace })
  } catch (err) {
    if (!isNotFound(err)) throw err
  }

  if (existing) {
    if (podUsable(existing, desiredImage)) {
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
    if (podNeedsRecreate(existing, desiredImage)) {
      await deleteDebugPod(clients, namespace, podName)
    } else {
      // Pending / ContainerCreating — wait for it
      await waitForPodRunning(clients, namespace, podName, POD_READY_TIMEOUT_MS)
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
  }

  try {
    await clients.core.createNamespacedPod({
      namespace,
      body: buildDebugPod(nodeName, podName, settings)
    })
  } catch (err) {
    if (!isAlreadyExists(err)) throw err
    // Race: another attempt created it, or deletion hadn't finished — reuse if good.
    const raced = await clients.core.readNamespacedPod({ name: podName, namespace })
    if (podUsable(raced, desiredImage)) {
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
    if (podNeedsRecreate(raced, desiredImage) || raced.metadata?.deletionTimestamp) {
      await deleteDebugPod(clients, namespace, podName)
      await clients.core.createNamespacedPod({
        namespace,
        body: buildDebugPod(nodeName, podName, settings)
      })
    } else {
      await waitForPodRunning(clients, namespace, podName, POD_READY_TIMEOUT_MS)
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
  }

  await waitForPodRunning(clients, namespace, podName, POD_READY_TIMEOUT_MS)
  return { namespace, podName, containerName: DEBUG_CONTAINER }
}
