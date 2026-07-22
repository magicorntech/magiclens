/** Per-cluster VPN profile link: cluster UUID → local VPN profile id */
export type ClusterVpnLinks = Record<string, string>

export interface ClusterVpnLinksResponse {
  links: ClusterVpnLinks
}
