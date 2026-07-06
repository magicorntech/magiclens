import type { V1CustomResourceDefinition } from '@kubernetes/client-node'
import type { CustomResourceKind } from '@shared/types/discovery'
import type { ClusterClients } from './clusterManager'
import { dynamicResourceHasInstances } from './dynamicResourceService'

function servedVersion(crd: V1CustomResourceDefinition): string {
  const versions = crd.spec.versions ?? []
  return (versions.find((v) => v.storage) ?? versions.find((v) => v.served) ?? versions[0])?.name ?? 'v1'
}

function toKind(crd: V1CustomResourceDefinition): CustomResourceKind {
  const group = crd.spec.group
  const version = servedVersion(crd)
  const names = crd.spec.names
  return {
    group,
    version,
    apiVersion: `${group}/${version}`,
    kind: names.kind,
    plural: names.plural,
    singular: names.singular || names.plural,
    namespaced: crd.spec.scope === 'Namespaced',
    shortNames: names.shortNames ?? [],
    categories: names.categories ?? [],
    crdName: crd.metadata?.name ?? names.plural
  }
}

/** Reads live CustomResourceDefinition objects from the cluster — every kind a CRD or operator
 * has installed shows up here automatically, with no hardcoded list to maintain. */
export async function listCustomResourceKinds(
  clients: ClusterClients,
  onlyWithInstances = false
): Promise<CustomResourceKind[]> {
  const res = await clients.apiextensions.listCustomResourceDefinition()
  const kinds = res.items.map(toKind)
  if (!onlyWithInstances) {
    return kinds
  }
  const flags = await Promise.all(kinds.map((k) => dynamicResourceHasInstances(clients, k.apiVersion, k.kind)))
  return kinds.filter((_, i) => flags[i])
}
