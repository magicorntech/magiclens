export const OPEN_CLUSTER_SETTINGS_EVENT = 'ml-open-cluster-settings'

export function openClusterSettings(clusterId: string, section = 'integrations'): void {
  window.dispatchEvent(
    new CustomEvent(OPEN_CLUSTER_SETTINGS_EVENT, { detail: { clusterId, section } })
  )
}
