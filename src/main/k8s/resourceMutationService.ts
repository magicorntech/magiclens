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
