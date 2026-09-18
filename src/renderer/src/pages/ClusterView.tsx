import { useEffect, useMemo, useState } from 'react'
import { Button, Result, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import { useClusterStore } from '../stores/clusterStore'
import { connectCluster } from '../clusterConnect'
import { cssBackgroundImage, normalizeBackgroundPanelOpacity, resolveClusterBackgroundUrl } from '../clusterBackgrounds'
import { AppShell } from '../components/Layout/AppShell'
import { ResourceKindTabs } from '../components/ResourceTable/ResourceKindTabs'
import { PortForwardingPage } from '../components/PortForward/PortForwardingPage'
import { DiscoveredApiGroupsPage } from '../components/Discovery/DiscoveredApiGroupsPage'
import { DiscoveredApiVersionsPage } from '../components/Discovery/DiscoveredApiVersionsPage'
import { CustomResourceBrowserPage } from '../components/Discovery/CustomResourceBrowserPage'
import { HelmPackageEditor } from '../components/Helm/HelmPackageEditor'
import { ArgoDashboardPage } from '../components/ArgoCD/ArgoDashboardPage'
import { ArgoApplicationsPage } from '../components/ArgoCD/ArgoApplicationsPage'
import { ArgoApplicationSetsPage } from '../components/ArgoCD/ArgoApplicationSetsPage'
import { ArgoProjectsPage } from '../components/ArgoCD/ArgoProjectsPage'
import { ArgoClustersPage, ArgoRepositoriesPage } from '../components/ArgoCD/ArgoSettingsPages'
import { TopologyPage } from '../components/Topology/TopologyPage'
import { VisualizerPage } from '../components/Visualizer/VisualizerPage'
import { TimelinePage } from '../components/Timeline/TimelinePage'
import { ClusterAppPage } from '../components/Apps/ClusterAppPage'
import { WorkloadsOverviewPage } from '../components/Overview/WorkloadsOverviewPage'
import { ApplicationsOverviewPage } from '../components/Overview/ApplicationsOverviewPage'
import { ConfigOverviewPage } from '../components/Overview/ConfigOverviewPage'
import { NetworkOverviewPage } from '../components/Overview/NetworkOverviewPage'
import { StorageOverviewPage } from '../components/Overview/StorageOverviewPage'
import { OverviewDetailShell } from '../components/Overview/OverviewDetailShell'
import type { VirtualPageKey } from '../resourceConfig/kinds.renderer'

interface ClusterViewProps {
  clusterId: string
  splitPane?: 'left' | 'right'
}

export function ClusterView({ clusterId, splitPane }: ClusterViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const openVirtualPage = useClusterStore((s) => s.openVirtualPage)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const clearPendingNavigation = useClusterStore((s) => s.clearPendingNavigation)
  const [helmReleaseFocus, setHelmReleaseFocus] = useState<{ namespace: string; name: string } | null>(null)
  const [dynamicResourceFocus, setDynamicResourceFocus] = useState<
    import('@shared/types/navigation').DynamicResourceFocus | null
  >(null)

  const backgroundUrl = useMemo(
    () =>
      cluster
        ? resolveClusterBackgroundUrl({
            backgroundId: cluster.backgroundId,
            backgroundCustomUrl: cluster.backgroundCustomUrl
          })
        : undefined,
    [cluster?.backgroundId, cluster?.backgroundCustomUrl]
  )
  const panelOpacity = normalizeBackgroundPanelOpacity(cluster?.backgroundPanelOpacity)

  useEffect(() => {
    if (!cluster?.pendingNavigation) return
    const pending = cluster.pendingNavigation
    if (pending.virtualPage) openVirtualPage(clusterId, pending.virtualPage)
    if (pending.helmRelease) setHelmReleaseFocus(pending.helmRelease)
    if (pending.dynamicResource) setDynamicResourceFocus(pending.dynamicResource)
    clearPendingNavigation(clusterId)
  }, [cluster?.pendingNavigation, clusterId, clearPendingNavigation, openVirtualPage])

  useEffect(() => {
    if (cluster?.status !== 'idle') return
    void connectCluster(cluster.id, cluster.source, cluster.contextName)
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
      backgroundId: cluster.backgroundId,
      backgroundCustomUrl: cluster.backgroundCustomUrl,
      backgroundPanelOpacity: cluster.backgroundPanelOpacity,
      prometheusUrl: cluster.prometheusUrl,
      isFavorite: cluster.isFavorite,
      selectedNamespace: cluster.selectedNamespace,
      selectedResourceKind: cluster.selectedResourceKind
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster?.selectedNamespace, cluster?.selectedResourceKind])

  function wrapWithBackground(children: React.ReactNode): React.JSX.Element {
    return (
      <div
        className={`ml-cluster-view${backgroundUrl ? ' ml-cluster-view--has-bg' : ''}`}
        style={
          backgroundUrl
            ? ({ ['--ml-bg-panel-mix' as string]: `${panelOpacity}%` } as React.CSSProperties)
            : undefined
        }
      >
        {backgroundUrl ? (
          <div
            className="ml-cluster-view__bg"
            style={{ backgroundImage: cssBackgroundImage(backgroundUrl) }}
            aria-hidden
          />
        ) : null}
        <div className="ml-cluster-view__fg">{children}</div>
      </div>
    )
  }

  if (!cluster) return <Spin />

  if (cluster.status === 'disconnected') {
    return wrapWithBackground(
      <div className="ml-cluster-view__center">
        <Result
          status="info"
          title={t('clusterView.disconnectedTitle')}
          subTitle={t('clusterView.disconnectedBody')}
          extra={
            <Button
              type="primary"
              onClick={() => void connectCluster(cluster.id, cluster.source, cluster.contextName)}
            >
              {t('clusterView.connect')}
            </Button>
          }
        />
      </div>
    )
  }

  if (cluster.status !== 'connected') {
    const description =
      cluster.status === 'connecting' && cluster.errorMessage
        ? cluster.errorMessage
        : cluster.status === 'error'
          ? cluster.errorMessage
          : t('clusterView.connecting')
    return wrapWithBackground(
      <div className="ml-cluster-view__center">
        <Spin description={description} />
      </div>
    )
  }

  const selectedNamespace = cluster.selectedNamespace

  function handleNamespaceChange(namespace: string): void {
    setSelectedNamespace(clusterId, namespace)
  }

  function handleOpenResourceKind(kind: ResourceKind): void {
    openResourceKind(clusterId, kind)
  }

  function handleNavigateToResource(focus: ResourceFocus): void {
    navigateToResource(clusterId, focus)
  }

  function handleSelectKind(kind: ResourceKind): void {
    handleOpenResourceKind(kind)
  }

  function handleSelectVirtualPage(key: VirtualPageKey): void {
    openVirtualPage(clusterId, key)
  }

  function renderVirtualPage(page: VirtualPageKey): React.JSX.Element {
    switch (page) {
      case 'applications':
        return (
          <OverviewDetailShell
            clusterId={clusterId}
            isActive
            onOpenResourceKind={handleOpenResourceKind}
          >
            {(handlers) => (
              <ApplicationsOverviewPage
                clusterId={clusterId}
                namespace={selectedNamespace}
                onNavigateToResource={handlers.onNavigateToResource}
              />
            )}
          </OverviewDetailShell>
        )
      case 'workloadsOverview':
        return (
          <OverviewDetailShell
            clusterId={clusterId}
            isActive
            onOpenResourceKind={handleOpenResourceKind}
          >
            {(handlers) => (
              <WorkloadsOverviewPage
                clusterId={clusterId}
                isActive
                {...handlers}
              />
            )}
          </OverviewDetailShell>
        )
      case 'configOverview':
        return (
          <OverviewDetailShell
            clusterId={clusterId}
            isActive
            onOpenResourceKind={handleOpenResourceKind}
          >
            {(handlers) => (
              <ConfigOverviewPage
                clusterId={clusterId}
                isActive
                {...handlers}
              />
            )}
          </OverviewDetailShell>
        )
      case 'networkOverview':
        return (
          <OverviewDetailShell
            clusterId={clusterId}
            isActive
            onOpenResourceKind={handleOpenResourceKind}
          >
            {(handlers) => (
              <NetworkOverviewPage
                clusterId={clusterId}
                isActive
                {...handlers}
              />
            )}
          </OverviewDetailShell>
        )
      case 'storageOverview':
        return (
          <OverviewDetailShell
            clusterId={clusterId}
            isActive
            onOpenResourceKind={handleOpenResourceKind}
          >
            {(handlers) => (
              <StorageOverviewPage
                clusterId={clusterId}
                isActive
                {...handlers}
              />
            )}
          </OverviewDetailShell>
        )
      case 'topology':
        return (
          <TopologyPage
            clusterId={clusterId}
            namespace={selectedNamespace}
            onNamespaceChange={handleNamespaceChange}
          />
        )
      case 'visualizer':
        return <VisualizerPage clusterId={clusterId} />
      case 'eventTimeline':
        return <TimelinePage clusterId={clusterId} onNavigateToResource={handleNavigateToResource} />
      case 'portForwarding':
        return <PortForwardingPage clusterId={clusterId} />
      case 'discoveredApiGroups':
        return <DiscoveredApiGroupsPage clusterId={clusterId} />
      case 'discoveredApiVersions':
        return <DiscoveredApiVersionsPage clusterId={clusterId} />
      case 'dynamicCustomResources':
      case 'operatorResources':
        return (
          <CustomResourceBrowserPage
            clusterId={clusterId}
            namespace={selectedNamespace}
            initialMode={page === 'operatorResources' ? 'installed' : 'all'}
            initialFocus={dynamicResourceFocus}
            onFocusConsumed={() => setDynamicResourceFocus(null)}
          />
        )
      case 'argoDashboard':
        return (
          <ArgoDashboardPage
            clusterId={clusterId}
            onOpenPage={handleSelectVirtualPage}
          />
        )
      case 'argoApplications':
        return <ArgoApplicationsPage clusterId={clusterId} />
      case 'argoApplicationSets':
        return <ArgoApplicationSetsPage clusterId={clusterId} />
      case 'argoProjects':
        return <ArgoProjectsPage clusterId={clusterId} />
      case 'argoRepositories':
        return <ArgoRepositoriesPage clusterId={clusterId} />
      case 'argoClusters':
        return <ArgoClustersPage clusterId={clusterId} />
      case 'appArgoCd':
      case 'appPrometheus':
      case 'appGrafana':
        return <ClusterAppPage clusterId={clusterId} page={page} />
      case 'helmCharts':
      case 'helmReleases':
        return (
          <HelmPackageEditor
            clusterId={clusterId}
            initialTab={page === 'helmReleases' ? 'releases' : 'charts'}
            onNavigateToResource={handleNavigateToResource}
            initialRelease={helmReleaseFocus}
            onReleaseFocusConsumed={() => setHelmReleaseFocus(null)}
          />
        )
    }
  }

  return wrapWithBackground(
    <AppShell
      cluster={cluster}
      splitPane={splitPane}
      onNamespaceChange={handleNamespaceChange}
      onSelectKind={handleSelectKind}
      selectedVirtualPage={cluster.selectedVirtualPage}
      onSelectVirtualPage={handleSelectVirtualPage}
    >
      <ResourceKindTabs
        clusterId={clusterId}
        namespace={cluster.selectedNamespace}
        openResourceKinds={cluster.openResourceKinds}
        selectedResourceKind={cluster.selectedResourceKind}
        openVirtualPages={cluster.openVirtualPages}
        selectedVirtualPage={cluster.selectedVirtualPage}
        renderVirtualPage={renderVirtualPage}
      />
    </AppShell>
  )
}
