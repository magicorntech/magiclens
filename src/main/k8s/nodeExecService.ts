import type { V1Pod } from '@kubernetes/client-node'
import type { ClusterClients } from './clusterManager'

const DEBUG_NAMESPACE = 'default'
const DEBUG_CONTAINER = 'debugger'
const DEBUG_IMAGE = 'busybox:1.36'
const POD_READY_TIMEOUT_MS = 120_000

/** Shell on the host via nsenter + chroot — same idea as `kubectl debug node`. */
export const NODE_HOST_SHELL_COMMAND = [
  '/bin/sh',
  '-c',
  'nsenter -t 1 -m -u -i -n -p -w -- chroot /host sh -c "command -v bash >/dev/null 2>&1 && exec bash -l || exec sh -l"'
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

async function waitForPodRunning(
  clients: ClusterClients,
  namespace: string,
  podName: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const pod = await clients.core.readNamespacedPod({ name: podName, namespace })
    const phase = pod.status?.phase
    if (phase === 'Running') {
      const ready = pod.status?.containerStatuses?.every((c) => c.ready) ?? false
      if (ready) return
    }
    if (phase === 'Failed' || phase === 'Succeeded') {
      throw new Error(`Debug pod ${namespace}/${podName} entered phase ${phase}`)
    }
    await sleep(500)
  }
  throw new Error(`Timed out waiting for debug pod ${namespace}/${podName} to become ready`)
}

function buildDebugPod(nodeName: string, podName: string): V1Pod {
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      labels: {
        'app.kubernetes.io/managed-by': 'magiclens',
        'magiclens.io/node-debug': 'true'
      }
    },
    spec: {
      nodeName,
      hostPID: true,
      hostNetwork: true,
      hostIPC: true,
      restartPolicy: 'Never',
      tolerations: [{ operator: 'Exists' }],
      containers: [
        {
          name: DEBUG_CONTAINER,
          image: DEBUG_IMAGE,
          command: ['sleep', 'infinity'],
          securityContext: { privileged: true },
          volumeMounts: [{ name: 'host-root', mountPath: '/host' }]
        }
      ],
      volumes: [{ name: 'host-root', hostPath: { path: '/' } }]
    }
  }
}

/** Ensures a privileged debug pod exists on the node, ready for host shell access. */
export async function ensureNodeDebugPod(
  clients: ClusterClients,
  nodeName: string
): Promise<{ namespace: string; podName: string; containerName: string }> {
  const podName = debugPodName(nodeName)
  const namespace = DEBUG_NAMESPACE

  let existing: V1Pod | null = null
  try {
    existing = await clients.core.readNamespacedPod({ name: podName, namespace })
  } catch {
    // Pod does not exist yet.
  }

  if (existing) {
    const phase = existing.status?.phase
    if (phase === 'Running') {
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
    if (phase === 'Failed' || phase === 'Succeeded') {
      await clients.core.deleteNamespacedPod({ name: podName, namespace })
      await sleep(500)
    } else {
      await waitForPodRunning(clients, namespace, podName, POD_READY_TIMEOUT_MS)
      return { namespace, podName, containerName: DEBUG_CONTAINER }
    }
  }

  await clients.core.createNamespacedPod({
    namespace,
    body: buildDebugPod(nodeName, podName)
  })
  await waitForPodRunning(clients, namespace, podName, POD_READY_TIMEOUT_MS)
  return { namespace, podName, containerName: DEBUG_CONTAINER }
}
