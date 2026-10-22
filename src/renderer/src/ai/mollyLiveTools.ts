import type { MollyToolName } from '@shared/types/molly'

/** K8s / MagicLens-only system prompt for Gemini Live. */
export const MOLLY_LIVE_SYSTEM = `
You are Molly, MagicLens' voice Kubernetes assistant.
Scope is STRICTLY MagicLens + Kubernetes: clusters, nodes, workloads, ingresses, services, metrics, events, and logs.
READ-ONLY: never delete, create, patch, apply, scale, restart, or mutate any cluster resource. Refuse any delete/write request.
proposeWorkloadAction only proposes a scale, restart, or apply. The app opens the confirm dialog. Do not claim the cluster changed.
NEVER navigate the app. Do not open resource tabs, cluster pages, or any MagicLens view. If the user asks to open Nodes, Pods, or another page, answer with the facts in this conversation only.
Do NOT control the desktop, open arbitrary apps, send WhatsApp, play music, or run shell commands.
Be concise for speech (2–5 sentences). Prefer Turkish when the user speaks Turkish.
ALWAYS call listClusters first if unsure. Pass clusterId as the UUID \`id\` field — never invent ids; display names alone often fail.
Use tools for facts — never invent metrics or resource lists.
When the user asks which resources exist, call listResources for that kind, including CRDs and operator types. Do not say you cannot list them.
When they ask about one resource, call inspectResource with its name. For graphs or metrics also call getNodeMetrics or getPodMetrics. For logs call getPodLogs.
Speak CPU as mCPU or CPU and memory as Mi or Gi. Never say raw byte counts.
For disk fullness or network throughput, call getUsage. For the objects themselves, list PersistentVolumeClaims, PersistentVolumes, StorageClasses, Services, Ingresses, Endpoints, or NetworkPolicies.
For security findings or recommendations, call getSecurity. Start a new scan with startSecurityScan only when the user asks to scan.
Speech-to-text often says ingres, ingiliz, or ingiltere for Ingress — treat that as kind Ingresses.
After tools return, summarize in speech and give 1–3 read-only recommendations. The chat shows the table, chart, document, and logs.
Do not volunteer scans, startup digests, or unsolicited anomaly reports — only answer what the user asked.
`.trim()

type JsonSchema = {
  type: string
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
}

function obj(
  description: string,
  properties: Record<string, JsonSchema>,
  required: string[] = []
): JsonSchema {
  return { type: 'OBJECT', description, properties, required }
}

function str(description: string): JsonSchema {
  return { type: 'STRING', description }
}

/** Gemini Live functionDeclarations — same read-only tools as Molly text agent. */
export const MOLLY_LIVE_TOOLS: Array<{
  functionDeclarations: Array<{
    name: MollyToolName
    description: string
    parameters: JsonSchema
  }>
}> = [
  {
    functionDeclarations: [
      {
        name: 'listClusters',
        description: 'List MagicLens clusters and which are connected.',
        parameters: obj('No args', {})
      },
      {
        name: 'getClusterHealth',
        description: 'Cluster health. Speak the cpu and memory text (mCPU, Mi, Gi), never raw bytes.',
        parameters: obj('Cluster health', { clusterId: str('Cluster id') }, ['clusterId'])
      },
      {
        name: 'getNodeMetrics',
        description: 'Per-node CPU and memory. Speak cpu and memory text fields (mCPU, Mi, Gi), never raw bytes.',
        parameters: obj('Node metrics', { clusterId: str('Cluster id') }, ['clusterId'])
      },
      {
        name: 'getPodMetrics',
        description: 'Pod CPU and memory in a namespace. Speak cpu and memory text (mCPU, Mi, Gi), never raw bytes.',
        parameters: obj(
          'Pod metrics',
          {
            clusterId: str('Cluster id'),
            namespace: str('Namespace'),
            name: str('Optional pod name')
          },
          ['clusterId', 'namespace']
        )
      },
      {
        name: 'getEvents',
        description: 'Recent Warning/Normal events for a cluster.',
        parameters: obj(
          'Events',
          {
            clusterId: str('Cluster id'),
            namespace: str('Optional namespace filter')
          },
          ['clusterId']
        )
      },
      {
        name: 'getPodLogs',
        description:
          'Read pod logs still on the node. tailLines 1-400, since as ISO time or 30m/2h/1d, query filters lines. The chat shows the text.',
        parameters: obj(
          'Pod logs',
          {
            clusterId: str('Cluster id'),
            namespace: str('Namespace'),
            podName: str('Pod name'),
            container: str('Optional container'),
            tailLines: str('How many lines, 1-400'),
            since: str('ISO time or relative window like 30m, 2h, 1d'),
            query: str('Only lines containing this text')
          },
          ['clusterId', 'namespace', 'podName']
        )
      },
      {
        name: 'listResources',
        description:
          'List any Kubernetes kind the cluster knows, including CRDs, via the live Discovery API. Each row has age and created. since filters created-in window (2h, 30m, 1d, or ISO).',
        parameters: obj(
          'Resource list',
          {
            clusterId: str('Cluster id'),
            kind: str('Any Kubernetes kind, plural, or short name, including CRDs'),
            namespace: str('Namespace, or ALL'),
            since: str('Only resources created in this window, e.g. 2h or 30m')
          },
          ['clusterId', 'kind']
        )
      },
      {
        name: 'inspectResource',
        description:
          'Read one resource of any discovered kind: document, events, pod logs and CPU when relevant, and recommendations. Omit name to list the kind.',
        parameters: obj(
          'Inspect',
          {
            clusterId: str('Cluster id'),
            kind: str('Any Kubernetes kind, plural, or short name, including CRDs'),
            namespace: str('Namespace, or ALL when listing'),
            name: str('Resource name. Empty lists the kind.')
          },
          ['clusterId', 'kind']
        )
      },
      {
        name: 'getUsage',
        description:
          'Disk fullness for PVCs, and network receive/transmit plus disk for a pod or node. Read-only.',
        parameters: obj(
          'Usage',
          {
            clusterId: str('Cluster id'),
            namespace: str('Namespace, or ALL for every PVC'),
            podName: str('Optional pod for network and container disk'),
            nodeName: str('Optional node for network and filesystem')
          },
          ['clusterId']
        )
      },
      {
        name: 'getSecurity',
        description: 'Read the latest MagicLens security scan: score, findings, and recommendations.',
        parameters: obj('Security read', { clusterId: str('Cluster id') }, ['clusterId'])
      },
      {
        name: 'startSecurityScan',
        description: 'Start a new MagicLens security scan and return the fresh recommendations.',
        parameters: obj('Security scan', { clusterId: str('Cluster id') }, ['clusterId'])
      },
      {
        name: 'summarizeAnomalies',
        description: 'Scan a cluster for actionable anomalies (CPU/mem pressure, failed pods, warnings).',
        parameters: obj('Anomalies', { clusterId: str('Cluster id') }, ['clusterId'])
      },
      {
        name: 'proposeWorkloadAction',
        description:
          'Propose a scale, restart, or apply. This only proposes; the app opens the confirm dialog. It does not change the cluster.',
        parameters: obj(
          'Workload proposal',
          {
            clusterId: str('Cluster id'),
            kind: str('Workload kind, such as Deployments'),
            namespace: str('Namespace'),
            name: str('Resource name'),
            action: str('scale, restart, or apply'),
            replicas: str('Requested replica count for scale'),
            yaml: str('Manifest text for apply')
          },
          ['clusterId', 'kind', 'namespace', 'name', 'action']
        )
      }
    ]
  }
]

/** @deprecated Prefer shared/mollyModels — kept for older imports. */
export { MOLLY_LIVE_MODELS_AUTO as MOLLY_LIVE_MODELS } from '@shared/mollyModels'
