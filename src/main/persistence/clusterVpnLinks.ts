import Store from 'electron-store'
import type { ClusterVpnLinks } from '@shared/types/clusterVpn'
import { getSessionScope } from './sessionScope'

interface StoreSchema {
  scopes?: Record<string, ClusterVpnLinks>
}

const store = new Store<StoreSchema>({
  name: 'cluster-vpn-links',
  defaults: { scopes: {} }
})

function scopeLinks(): ClusterVpnLinks {
  const scopes = store.get('scopes') ?? {}
  return scopes[getSessionScope()] ?? {}
}

function writeScopeLinks(links: ClusterVpnLinks): void {
  const scopes = { ...(store.get('scopes') ?? {}) }
  scopes[getSessionScope()] = links
  store.set('scopes', scopes)
}

export function getClusterVpnLinks(): ClusterVpnLinks {
  return { ...scopeLinks() }
}

export function setClusterVpnLink(clusterId: string, vpnProfileId: string | null): ClusterVpnLinks {
  const links = { ...scopeLinks() }
  if (vpnProfileId) links[clusterId] = vpnProfileId
  else delete links[clusterId]
  writeScopeLinks(links)
  return links
}

export function removeClusterVpnLink(clusterId: string): void {
  const links = { ...scopeLinks() }
  delete links[clusterId]
  writeScopeLinks(links)
}
