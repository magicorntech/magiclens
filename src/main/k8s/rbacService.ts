import fetch from 'node-fetch'
import type { ResourceKind } from '@shared/resourceKinds'
import { BUILTIN_RBAC } from '@shared/k8sRbacMap'
import type {
  RbacCanIRequest,
  RbacCanIResponse,
  RbacVerb,
  ResourcePermissionsRequest,
  ResourcePermissionsResponse
} from '@shared/types/rbac'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import type { ClusterClients } from './clusterManager'

function resolveRbacMeta(target: ResourceMutationTarget): { group: string; resource: string; namespaced: boolean } {
  if (target.type === 'builtin') {
    const meta = BUILTIN_RBAC[target.kind as ResourceKind]
    if (!meta) throw new Error(`Unknown resource kind: ${target.kind}`)
    return meta
  }
  return {
    group: target.apiVersion.includes('/') ? target.apiVersion.split('/')[0] : '',
    resource: target.plural,
    namespaced: target.namespaced
  }
}

interface SelfSubjectAccessReviewResponse {
  status?: { allowed?: boolean; reason?: string }
}

interface SsarAttributes {
  verb: RbacVerb
  group?: string
  resource: string
  namespace?: string
  name?: string
  subresource?: string
}

async function runSelfSubjectAccessReview(
  clients: ClusterClients,
  attrs: SsarAttributes
): Promise<RbacCanIResponse> {
  const cluster = clients.kc.getCurrentCluster()
  if (!cluster?.server) {
    return { allowed: false, reason: 'Cluster not configured', ssarError: true }
  }

  const resourceAttributes: Record<string, string> = {
    verb: attrs.verb,
    resource: attrs.resource
  }
  if (attrs.group) resourceAttributes.group = attrs.group
  if (attrs.namespace) resourceAttributes.namespace = attrs.namespace
  if (attrs.name) resourceAttributes.name = attrs.name
  if (attrs.subresource) resourceAttributes.subresource = attrs.subresource

  const url = `${cluster.server}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`
  const body = JSON.stringify({
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: { resourceAttributes }
  })

  const opts = await clients.kc.applyToFetchOptions({})
  opts.method = 'POST'
  opts.headers = { ...(opts.headers as Record<string, string>), 'Content-Type': 'application/json' }
  opts.body = body

  const res = await fetch(url, opts)
  if (!res.ok) {
    return { allowed: false, reason: `${res.status} ${res.statusText}`, ssarError: true }
  }
  const json = (await res.json()) as SelfSubjectAccessReviewResponse
  return {
    allowed: json.status?.allowed === true,
    reason: json.status?.reason
  }
}

async function checkVerb(
  clients: ClusterClients,
  meta: { group: string; resource: string; namespaced: boolean },
  namespace: string,
  name: string | undefined,
  verb: RbacVerb,
  subresource?: string
): Promise<RbacCanIResponse> {
  const ns = meta.namespaced ? namespace : undefined
  const base: Omit<SsarAttributes, 'name'> = {
    verb,
    group: meta.group || undefined,
    resource: meta.resource,
    namespace: ns,
    subresource
  }

  if (name) {
    const named = await runSelfSubjectAccessReview(clients, { ...base, name })
    if (named.allowed || named.ssarError) return named
    // Namespace-scoped roles often authorize the verb without a resource name in SSAR.
    return runSelfSubjectAccessReview(clients, base)
  }

  return runSelfSubjectAccessReview(clients, base)
}

function anyAllowed(...results: RbacCanIResponse[]): boolean {
  return results.some((r) => r.allowed)
}

function anySsarError(...results: RbacCanIResponse[]): boolean {
  return results.some((r) => r.ssarError)
}

function mergeVerb(...results: RbacCanIResponse[]): boolean {
  if (anyAllowed(...results)) return true
  if (anySsarError(...results)) return true
  return false
}

export async function rbacCanI(clients: ClusterClients, req: RbacCanIRequest): Promise<RbacCanIResponse> {
  const meta = resolveRbacMeta(req.target)
  return checkVerb(clients, meta, req.namespace, req.name, req.verb, req.subresource)
}

export async function getResourcePermissions(
  clients: ClusterClients,
  req: ResourcePermissionsRequest
): Promise<ResourcePermissionsResponse> {
  const meta = resolveRbacMeta(req.target)
  const [getRes, updateRes, patchRes, deleteRes, scaleUpdateRes, scalePatchRes, deletePodsRes, createJobsRes] =
    await Promise.all([
      checkVerb(clients, meta, req.namespace, req.name, 'get'),
      checkVerb(clients, meta, req.namespace, req.name, 'update'),
      checkVerb(clients, meta, req.namespace, req.name, 'patch'),
      checkVerb(clients, meta, req.namespace, req.name, 'delete'),
      checkVerb(clients, meta, req.namespace, req.name, 'update', 'scale'),
      checkVerb(clients, meta, req.namespace, req.name, 'patch', 'scale'),
      checkVerb(
        clients,
        { group: '', resource: 'pods', namespaced: true },
        req.namespace,
        undefined,
        'delete'
      ),
      checkVerb(
        clients,
        { group: 'batch', resource: 'jobs', namespaced: true },
        req.namespace,
        undefined,
        'create'
      )
    ])

  const verified = !anySsarError(
    getRes,
    updateRes,
    patchRes,
    deleteRes,
    scaleUpdateRes,
    scalePatchRes,
    deletePodsRes,
    createJobsRes
  )

  const canUpdate = mergeVerb(updateRes)
  const canPatch = mergeVerb(patchRes, updateRes)
  const canScale = mergeVerb(scaleUpdateRes, scalePatchRes, patchRes, updateRes)

  return {
    canGet: mergeVerb(getRes),
    canUpdate,
    canPatch,
    canDelete: mergeVerb(deleteRes),
    canScale,
    canDeletePods: mergeVerb(deletePodsRes),
    canCreateJobs: mergeVerb(createJobsRes),
    verified
  }
}
