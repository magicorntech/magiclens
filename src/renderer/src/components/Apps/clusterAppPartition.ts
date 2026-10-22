const CLUSTER_APP_PAGES = new Set(['appArgoCd', 'appPrometheus', 'appGrafana'])

export function clusterAppPartition(clusterId: string, kind: string): string {
  return `persist:cluster-app-${clusterId}-${kind}`
}

/** The keep-alive host exists only while an embedded app page is the front view. */
export function clusterAppHostMounted(selectedPage: string | null | undefined): boolean {
  return selectedPage != null && CLUSTER_APP_PAGES.has(selectedPage)
}
