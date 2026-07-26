import { parse } from 'yaml'

export interface ParsedOwnerRef {
  kind: string
  name: string
  controller?: boolean
}

export interface ParsedCondition {
  type: string
  status: string
  reason?: string
  message?: string
  lastTransitionTime?: string
}

export interface ParsedResourceManifest {
  apiVersion?: string
  kind?: string
  name?: string
  namespace?: string
  uid?: string
  creationTimestamp?: string
  labels: Record<string, string>
  annotations: Record<string, string>
  ownerReferences: ParsedOwnerRef[]
  finalizers: string[]
  /** Flattened interesting facts for the Overview section. */
  facts: { label: string; value: string }[]
  conditions: ParsedCondition[]
  /** ConfigMap/Secret data (string values). */
  data: Record<string, string>
  /** Secret type, etc. */
  secretType?: string
  /** Selector labels when present. */
  selector: Record<string, string>
  /** Raw parsed object for kind-specific extras. */
  raw: Record<string, unknown>
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asStringMap(v: unknown): Record<string, string> {
  const r = asRecord(v)
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(r)) {
    if (val === undefined || val === null) continue
    out[k] = typeof val === 'string' ? val : JSON.stringify(val)
  }
  return out
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  return String(v)
}

function pushFact(facts: { label: string; value: string }[], label: string, value: unknown): void {
  const s = str(value)
  if (s !== undefined) facts.push({ label, value: s })
}

function parseConditions(status: Record<string, unknown>): ParsedCondition[] {
  const list = status.conditions
  if (!Array.isArray(list)) return []
  return list.map((c) => {
    const row = asRecord(c)
    return {
      type: str(row.type) ?? 'Unknown',
      status: str(row.status) ?? 'Unknown',
      reason: str(row.reason),
      message: str(row.message),
      lastTransitionTime: str(row.lastTransitionTime)
    }
  })
}

function extractSelector(spec: Record<string, unknown>): Record<string, string> {
  const sel = asRecord(spec.selector)
  if (sel.matchLabels) return asStringMap(sel.matchLabels)
  // Legacy ReplicationController / Service style
  if (!sel.matchExpressions && Object.keys(sel).length > 0 && !sel.matchLabels) {
    return asStringMap(sel)
  }
  return asStringMap(sel.matchLabels)
}

function extractKindFacts(kind: string | undefined, spec: Record<string, unknown>, status: Record<string, unknown>): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = []
  const k = kind ?? ''

  if (['Deployment', 'StatefulSet', 'ReplicaSet', 'ReplicationController'].includes(k)) {
    pushFact(facts, 'Desired replicas', spec.replicas ?? status.replicas)
    pushFact(facts, 'Ready replicas', status.readyReplicas)
    pushFact(facts, 'Available replicas', status.availableReplicas)
    pushFact(facts, 'Updated replicas', status.updatedReplicas)
    pushFact(facts, 'Current replicas', status.currentReplicas ?? status.replicas)
    const strategy = asRecord(spec.strategy)
    pushFact(facts, 'Strategy', strategy.type)
    if (strategy.rollingUpdate) {
      const ru = asRecord(strategy.rollingUpdate)
      pushFact(facts, 'Max unavailable', ru.maxUnavailable)
      pushFact(facts, 'Max surge', ru.maxSurge)
      pushFact(facts, 'Partition', ru.partition)
    }
    pushFact(facts, 'Observed generation', status.observedGeneration)
    pushFact(facts, 'Collision count', status.collisionCount)
  }

  if (k === 'DaemonSet') {
    pushFact(facts, 'Desired', status.desiredNumberScheduled)
    pushFact(facts, 'Current', status.currentNumberScheduled)
    pushFact(facts, 'Ready', status.numberReady)
    pushFact(facts, 'Available', status.numberAvailable)
    pushFact(facts, 'Updated', status.updatedNumberScheduled)
    pushFact(facts, 'Misscheduled', status.numberMisscheduled)
    const us = asRecord(spec.updateStrategy)
    pushFact(facts, 'Update strategy', us.type)
    const ru = asRecord(us.rollingUpdate)
    pushFact(facts, 'Max unavailable', ru.maxUnavailable)
  }

  if (k === 'StatefulSet') {
    pushFact(facts, 'Service name', spec.serviceName)
    pushFact(facts, 'Pod management', spec.podManagementPolicy)
    pushFact(facts, 'Update strategy', asRecord(spec.updateStrategy).type)
  }

  if (k === 'Job') {
    pushFact(facts, 'Completions', spec.completions)
    pushFact(facts, 'Parallelism', spec.parallelism)
    pushFact(facts, 'Backoff limit', spec.backoffLimit)
    pushFact(facts, 'Active', status.active)
    pushFact(facts, 'Succeeded', status.succeeded)
    pushFact(facts, 'Failed', status.failed)
    pushFact(facts, 'Start time', status.startTime)
    pushFact(facts, 'Completion time', status.completionTime)
  }

  if (k === 'CronJob') {
    pushFact(facts, 'Schedule', spec.schedule)
    pushFact(facts, 'Timezone', spec.timeZone)
    pushFact(facts, 'Suspend', spec.suspend)
    pushFact(facts, 'Concurrency', spec.concurrencyPolicy)
    pushFact(facts, 'Last schedule', status.lastScheduleTime)
    pushFact(facts, 'Last successful', status.lastSuccessfulTime)
    pushFact(facts, 'Successful history', spec.successfulJobsHistoryLimit)
    pushFact(facts, 'Failed history', spec.failedJobsHistoryLimit)
  }

  if (k === 'Service') {
    pushFact(facts, 'Type', spec.type)
    pushFact(facts, 'Cluster IP', spec.clusterIP)
    pushFact(facts, 'External IPs', Array.isArray(spec.externalIPs) ? (spec.externalIPs as string[]).join(', ') : undefined)
    pushFact(facts, 'Session affinity', spec.sessionAffinity)
    pushFact(facts, 'LoadBalancer IP', asRecord(status.loadBalancer).ingress ? 'assigned' : undefined)
    if (Array.isArray(spec.ports)) {
      const ports = (spec.ports as Record<string, unknown>[])
        .map((p) => `${p.port}${p.targetPort ? `→${p.targetPort}` : ''}/${p.protocol ?? 'TCP'}`)
        .join(', ')
      pushFact(facts, 'Ports', ports)
    }
  }

  if (k === 'Ingress') {
    pushFact(facts, 'Ingress class', spec.ingressClassName)
    const lbs = asRecord(status.loadBalancer).ingress
    if (Array.isArray(lbs)) {
      pushFact(
        facts,
        'Address',
        (lbs as Record<string, unknown>[]).map((i) => i.ip ?? i.hostname).filter(Boolean).join(', ')
      )
    }
  }

  if (k === 'ConfigMap') {
    // key count handled by caller from root data
  }

  if (k === 'Secret') {
    // type handled by caller from root
  }

  if (k === 'PersistentVolumeClaim') {
    pushFact(facts, 'Storage class', spec.storageClassName)
    pushFact(facts, 'Access modes', Array.isArray(spec.accessModes) ? (spec.accessModes as string[]).join(', ') : undefined)
    pushFact(facts, 'Volume mode', spec.volumeMode)
    pushFact(facts, 'Volume name', spec.volumeName ?? status.phase)
    pushFact(facts, 'Phase', status.phase)
    const req = asRecord(asRecord(spec.resources).requests)
    pushFact(facts, 'Request', req.storage)
    const cap = asRecord(status.capacity)
    pushFact(facts, 'Capacity', cap.storage)
  }

  if (k === 'PersistentVolume') {
    pushFact(facts, 'Storage class', spec.storageClassName)
    pushFact(facts, 'Reclaim policy', spec.persistentVolumeReclaimPolicy)
    pushFact(facts, 'Phase', status.phase)
    pushFact(facts, 'Capacity', asRecord(spec.capacity).storage)
    pushFact(facts, 'Access modes', Array.isArray(spec.accessModes) ? (spec.accessModes as string[]).join(', ') : undefined)
  }

  if (k === 'HorizontalPodAutoscaler') {
    const scaleTarget = asRecord(spec.scaleTargetRef)
    pushFact(facts, 'Target', `${scaleTarget.kind}/${scaleTarget.name}`)
    pushFact(facts, 'Min replicas', spec.minReplicas)
    pushFact(facts, 'Max replicas', spec.maxReplicas)
    pushFact(facts, 'Current replicas', status.currentReplicas)
    pushFact(facts, 'Desired replicas', status.desiredReplicas)
    pushFact(facts, 'Last scale time', status.lastScaleTime)
  }

  if (k === 'PodDisruptionBudget') {
    pushFact(facts, 'Min available', spec.minAvailable)
    pushFact(facts, 'Max unavailable', spec.maxUnavailable)
    pushFact(facts, 'Current healthy', status.currentHealthy)
    pushFact(facts, 'Desired healthy', status.desiredHealthy)
    pushFact(facts, 'Expected pods', status.expectedPods)
    pushFact(facts, 'Disruptions allowed', status.disruptionsAllowed)
  }

  if (k === 'ResourceQuota') {
    const hard = asStringMap(spec.hard ?? status.hard)
    const used = asStringMap(status.used)
    for (const key of Object.keys(hard)) {
      pushFact(facts, key, `${used[key] ?? '0'} / ${hard[key]}`)
    }
  }

  if (k === 'LimitRange') {
    // summarized in dedicated section via raw
    pushFact(facts, 'Limits', Array.isArray(spec.limits) ? String((spec.limits as unknown[]).length) : undefined)
  }

  if (k === 'PriorityClass') {
    pushFact(facts, 'Value', spec.value)
    pushFact(facts, 'Global default', spec.globalDefault)
    pushFact(facts, 'Preemption', spec.preemptionPolicy)
    pushFact(facts, 'Description', spec.description)
  }

  if (k === 'RuntimeClass') {
    pushFact(facts, 'Handler', spec.handler)
  }

  if (k === 'Lease') {
    const holder = asRecord(spec)
    pushFact(facts, 'Holder', holder.holderIdentity)
    pushFact(facts, 'Lease duration', holder.leaseDurationSeconds)
    pushFact(facts, 'Acquire time', holder.acquireTime)
    pushFact(facts, 'Renew time', holder.renewTime)
  }

  if (k === 'Namespace') {
    pushFact(facts, 'Phase', status.phase)
  }

  if (k === 'Node') {
    pushFact(facts, 'Pod CIDR', spec.podCIDR)
    pushFact(facts, 'Provider ID', spec.providerID)
    pushFact(facts, 'Unschedulable', spec.unschedulable)
    const ni = asRecord(status.nodeInfo)
    pushFact(facts, 'Kubelet', ni.kubeletVersion)
    pushFact(facts, 'OS', `${ni.operatingSystem ?? ''} ${ni.osImage ?? ''}`.trim())
    pushFact(facts, 'Runtime', ni.containerRuntimeVersion)
    pushFact(facts, 'Architecture', ni.architecture)
    const addresses = status.addresses
    if (Array.isArray(addresses)) {
      for (const a of addresses as Record<string, unknown>[]) {
        pushFact(facts, str(a.type) ?? 'Address', a.address)
      }
    }
  }

  if (k === 'ServiceAccount') {
    pushFact(facts, 'Automount token', spec.automountServiceAccountToken)
  }

  if (k.endsWith('WebhookConfiguration')) {
    const hooks = spec.webhooks
    pushFact(facts, 'Webhooks', Array.isArray(hooks) ? String(hooks.length) : undefined)
  }

  if (k === 'NetworkPolicy') {
    pushFact(facts, 'Policy types', Array.isArray(spec.policyTypes) ? (spec.policyTypes as string[]).join(', ') : undefined)
  }

  if (k === 'StorageClass') {
    pushFact(facts, 'Provisioner', spec.provisioner)
    pushFact(facts, 'Reclaim policy', spec.reclaimPolicy)
    pushFact(facts, 'Volume binding', spec.volumeBindingMode)
    pushFact(facts, 'Allow expansion', spec.allowVolumeExpansion)
  }

  return facts
}

export function parseResourceManifest(yamlText: string): ParsedResourceManifest | null {
  try {
    const obj = parse(yamlText) as Record<string, unknown> | null
    if (!obj || typeof obj !== 'object') return null
    const metadata = asRecord(obj.metadata)
    const spec = asRecord(obj.spec)
    // ConfigMap/Secret put data at top level
    const topData = asStringMap(obj.data)
    const status = asRecord(obj.status)
    const kind = str(obj.kind)

    const facts = extractKindFacts(kind, { ...spec, type: obj.type, data: obj.data }, status)

    // ConfigMap data lives at root
    if (kind === 'ConfigMap' && Object.keys(topData).length) {
      facts.unshift({ label: 'Keys', value: String(Object.keys(topData).length) })
    }
    if (kind === 'Secret') {
      const secretData = asStringMap(obj.data)
      facts.unshift({ label: 'Keys', value: String(Object.keys(secretData).length) })
      if (!facts.some((f) => f.label === 'Type')) pushFact(facts, 'Type', obj.type)
    }

    return {
      apiVersion: str(obj.apiVersion),
      kind,
      name: str(metadata.name),
      namespace: str(metadata.namespace),
      uid: str(metadata.uid),
      creationTimestamp: str(metadata.creationTimestamp),
      labels: asStringMap(metadata.labels),
      annotations: asStringMap(metadata.annotations),
      ownerReferences: Array.isArray(metadata.ownerReferences)
        ? (metadata.ownerReferences as Record<string, unknown>[]).map((o) => ({
            kind: str(o.kind) ?? 'Unknown',
            name: str(o.name) ?? '—',
            controller: Boolean(o.controller)
          }))
        : [],
      finalizers: Array.isArray(metadata.finalizers) ? (metadata.finalizers as string[]) : [],
      facts,
      conditions: parseConditions(status),
      data: kind === 'Secret' || kind === 'ConfigMap' ? asStringMap(obj.data) : {},
      secretType: kind === 'Secret' ? str(obj.type) : undefined,
      selector: extractSelector(spec),
      raw: obj
    }
  } catch {
    return null
  }
}
