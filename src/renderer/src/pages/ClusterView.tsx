import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import { useClusterStore } from '../stores/clusterStore'
import { connectCluster } from '../clusterConnect'
import { AppShell } from '../components/Layout/AppShell'
import { ResourceKindTabs } from '../components/ResourceTable/ResourceKindTabs'
import { PortForwardingPage } from '../components/PortForward/PortForwardingPage'
import { DiscoveredApiGroupsPage } from '../components/Discovery/DiscoveredApiGroupsPage'
import { DiscoveredApiVersionsPage } from '../components/Discovery/DiscoveredApiVersionsPage'
import { CustomResourceBrowserPage } from '../components/Discovery/CustomResourceBrowserPage'
import { HelmChartsPage } from '../components/Helm/HelmChartsPage'
import { HelmReleasesPage } from '../components/Helm/HelmReleasesPage'
import type { VirtualPageKey } from '../resourceConfig/kinds.renderer'

interface ClusterViewProps {
  clusterId: string
}

export function ClusterView({ clusterId }: ClusterViewProps): React.JSX.Element {
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const [virtualPage, setVirtualPage] = useState<VirtualPageKey | null>(null)

  // Clusters can be saved without ever having been connected (added via Add Cluster,
  // which no longer connects up front). Opening the tab is when we first try.
  useEffect(() => {
    if (cluster && cluster.status === 'idle') {
      void connectCluster(cluster.id, cluster.source, cluster.contextName)
    }
  }, [cluster?.id, cluster?.status, cluster?.source, cluster?.contextName])

  useEffect(() => {
    if (!cluster) return
    void window.api.clusterStore.update({
      id: cluster.id,
      customName: cluster.customName,
      contextName: cluster.contextName,
      source: cluster.source,
      endpoint: cluster.endpoint,
      logoUrl: cluster.logoUrl,
      isFavorite: cluster.isFavorite,
      selectedNamespace: cluster.selectedNamespace,
      selectedResourceKind: cluster.selectedResourceKind
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster?.selectedNamespace, cluster?.selectedResourceKind])

  if (!cluster) return <Spin />

  if (cluster.status !== 'connected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin description={cluster.status === 'error' ? cluster.errorMessage : 'Connecting...'} />
      </div>
    )
  }

  const selectedNamespace = cluster.selectedNamespace

  function handleNamespaceChange(namespace: string): void {
    setSelectedNamespace(clusterId, namespace)
  }

  function handleSelectKind(kind: ResourceKind): void {
    setVirtualPage(null)
    openResourceKind(clusterId, kind)
  }

  function handleNavigateToResource(focus: ResourceFocus): void {
    setVirtualPage(null)
    navigateToResource(clusterId, focus)
  }

  function renderVirtualPage(page: VirtualPageKey): React.JSX.Element {
    switch (page) {
      case 'portForwarding':
        return <PortForwardingPage clusterId={clusterId} />
      case 'discoveredApiGroups':
        return <DiscoveredApiGroupsPage clusterId={clusterId} />
      case 'discoveredApiVersions':
        return <DiscoveredApiVersionsPage clusterId={clusterId} />
      case 'dynamicCustomResources':
        return <CustomResourceBrowserPage clusterId={clusterId} namespace={selectedNamespace} mode="all" />
      case 'operatorResources':
        return <CustomResourceBrowserPage clusterId={clusterId} namespace={selectedNamespace} mode="installed" />
      case 'helmCharts':
        return <HelmChartsPage clusterId={clusterId} />
      case 'helmReleases':
        return <HelmReleasesPage clusterId={clusterId} onNavigateToResource={handleNavigateToResource} />
    }
  }

  return (
    <AppShell
      cluster={cluster}
      onNamespaceChange={handleNamespaceChange}
      onSelectKind={handleSelectKind}
      selectedVirtualPage={virtualPage}
      onSelectVirtualPage={setVirtualPage}
    >
      {virtualPage ? (
        renderVirtualPage(virtualPage)
      ) : (
        <ResourceKindTabs
          clusterId={clusterId}
          namespace={cluster.selectedNamespace}
          openResourceKinds={cluster.openResourceKinds}
          selectedResourceKind={cluster.selectedResourceKind}
        />
      )}
    </AppShell>
  )
}
