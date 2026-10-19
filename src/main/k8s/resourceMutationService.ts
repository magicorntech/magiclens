import { PatchStrategy } from '@kubernetes/client-node'
import type { KubernetesObject } from '@kubernetes/client-node'
import { parse, parseAllDocuments, stringify } from 'yaml'
import type { AppliedResourceRef } from '@shared/types/resourceMutation'
import type { ClusterClients } from './clusterManager'

/** Fields the API server manages itself — must be stripped before re-applying an edited manifest,
 * otherwise a stale resourceVersion/uid/managedFields can cause the request to be rejected. */
function sanitizeForApply(obj: KubernetesObject): KubernetesObject {
  const clone = structuredClone(obj) as KubernetesObject & { status?: unknown }
  if (clone.metadata) {
    delete clone.metadata.resourceVersion
    delete clone.metadata.uid
    delete clone.metadata.creationTimestamp
    delete clone.metadata.generation
    delete clone.metadata.managedFields
    delete clone.metadata.selfLink
  }
  delete clone.status
  return clone
}

function refOf(result: KubernetesObject, fallback: { apiVersion: string; kind: string; name: string }): AppliedResourceRef {
  return {
    apiVersion: result.apiVersion ?? fallback.apiVersion,
    kind: result.kind ?? fallback.kind,
    name: result.metadata?.name ?? fallback.name,
    namespace: result.metadata?.namespace ?? ''
  }
}

export async function readResourceManifest(
  clients: ClusterClients,
  apiVersion: string,
  kind: string,
  name: string,
  namespace: string
): Promise<string> {
  const obj = await clients.objects.read({
    apiVersion,
    kind,
    metadata: namespace ? { name, namespace } : { name }
  })
  return stringify(obj)
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const status = err as { statusCode?: number; code?: number; response?: { statusCode?: number } }
  const code = status.statusCode ?? status.code ?? status.response?.statusCode
  if (code === 404) return true
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('NotFound') || message.includes('404')
}

/** Stable YAML for a side-by-side diff. Server-managed fields are removed on both sides. */
export function normalizedManifestYaml(yamlText: string): string {
  const docs = parseAllDocuments(yamlText)
    .map((doc) => doc.toJS() as KubernetesObject | null)
    .filter((doc): doc is KubernetesObject => Boolean(doc?.apiVersion && doc.kind && doc.metadata?.name))
  if (docs.length === 0) throw new Error('Manifest must include apiVersion, kind, and metadata.name')
  return docs.map((doc) => stringify(sanitizeForApply(doc)).trimEnd()).join('\n---\n')
}

async function readLive(clients: ClusterClients, obj: KubernetesObject): Promise<KubernetesObject | null> {
  try {
    const namespace = obj.metadata?.namespace
    const name = obj.metadata?.name ?? ''
    return await clients.objects.read({
      apiVersion: obj.apiVersion,
      kind: obj.kind,
      metadata: namespace ? { name, namespace } : { name }
    })
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

/** Compares the editor with the live object and asks the API server to admit the change without saving it. */
export async function previewResourceManifest(
  clients: ClusterClients,
  yamlText: string,
  mode: 'edit' | 'create'
): Promise<{ original: string; modified: string; unchanged: boolean; dryRunOk: boolean; dryRunMessage: string }> {
  const modified = normalizedManifestYaml(yamlText)
  const docs = parseAllDocuments(yamlText)
    .map((doc) => doc.toJS() as KubernetesObject | null)
    .filter((doc): doc is KubernetesObject => Boolean(doc?.apiVersion && doc.kind && doc.metadata?.name))

  let original = ''
  if (mode === 'edit' && docs[0]) {
    const live = await readLive(clients, docs[0])
    original = live ? stringify(sanitizeForApply(live)).trimEnd() : ''
  }

  try {
    if (mode === 'create') {
      for (const doc of docs) {
        await clients.objects.create(sanitizeForApply(doc), undefined, 'All', 'magiclens-edit')
      }
    } else {
      await clients.objects.patch(
        sanitizeForApply(docs[0]!),
        undefined,
        'All',
        'magiclens-edit',
        true,
        PatchStrategy.ServerSideApply
      )
    }
    return {
      original,
      modified,
      unchanged: original === modified,
      dryRunOk: true,
      dryRunMessage: mode === 'create' ? `Server would create ${docs.length} resource(s).` : 'Server accepted this change.'
    }
  } catch (err) {
    return {
      original,
      modified,
      unchanged: original === modified,
      dryRunOk: false,
      dryRunMessage: err instanceof Error ? err.message : String(err)
    }
  }
}

/** Applies an edited manifest via server-side apply — merges rather than requiring an exact
 * resourceVersion match, so concurrent edits from elsewhere don't block the save. */
export async function applyResourceManifest(
  clients: ClusterClients,
  yamlText: string
): Promise<{ yaml: string; ref: AppliedResourceRef }> {
  const parsed = parse(yamlText) as KubernetesObject | null
  if (!parsed || !parsed.apiVersion || !parsed.kind) {
    throw new Error('Manifest must include apiVersion and kind')
  }
  if (!parsed.metadata?.name) {
    throw new Error('Manifest must include metadata.name')
  }
  const result = await clients.objects.patch(
    sanitizeForApply(parsed),
    undefined,
    undefined,
    'magiclens-edit',
    true,
    PatchStrategy.ServerSideApply
  )
  return { yaml: stringify(result), ref: refOf(result, { apiVersion: parsed.apiVersion, kind: parsed.kind, name: parsed.metadata.name }) }
}

/** Creates one or more resources from `---`-separated YAML documents. Continues past individual
 * document failures so a multi-resource paste doesn't abort halfway with no feedback. */
export async function createResourceManifests(
  clients: ClusterClients,
  yamlText: string
): Promise<{ created: AppliedResourceRef[]; errors: string[] }> {
  const docs = parseAllDocuments(yamlText)
  const created: AppliedResourceRef[] = []
  const errors: string[] = []

  for (const doc of docs) {
    const parsed = doc.toJS() as KubernetesObject | null
    if (!parsed) continue
    if (!parsed.apiVersion || !parsed.kind) {
      errors.push('A document is missing apiVersion/kind and was skipped')
      continue
    }
    if (!parsed.metadata?.name) {
      errors.push(`${parsed.kind}: missing metadata.name`)
      continue
    }
    try {
      const result = await clients.objects.create(parsed)
      created.push(refOf(result, { apiVersion: parsed.apiVersion, kind: parsed.kind, name: parsed.metadata.name }))
    } catch (err) {
      errors.push(`${parsed.kind}/${parsed.metadata.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { created, errors }
}

export async function deleteResourceObject(
  clients: ClusterClients,
  apiVersion: string,
  kind: string,
  name: string,
  namespace: string
): Promise<void> {
  await clients.objects.delete({
    apiVersion,
    kind,
    metadata: namespace ? { name, namespace } : { name }
  })
}
