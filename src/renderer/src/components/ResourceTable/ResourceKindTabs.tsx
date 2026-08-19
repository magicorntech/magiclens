import { useEffect, useMemo, useState } from 'react'
import { Modal, Splitter, message } from 'antd'
import { Columns2, PanelLeft, PanelRight } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { useClusterStore } from '../../stores/clusterStore'
import { sortResourceKinds } from '../../utils/resourceTabPreferences'
import { RESOURCE_TAB_SPLIT_PANEL_MIN_PX } from '../../constants/clusterSplitLimits'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { ResourceTable } from './ResourceTable'
import { ResourceKindTabBar, type ResourceTabContextActions } from './ResourceKindTabBar'
import { EmptyState } from './EmptyErrorStates'

interface ResourceKindTabsProps {
  clusterId: string
  namespace: string
  openResourceKinds: ResourceKind[]
  selectedResourceKind: ResourceKind | null
  openVirtualPages?: VirtualPageKey[]
  selectedVirtualPage?: VirtualPageKey | null
  renderVirtualPage?: (page: VirtualPageKey) => React.ReactNode
}

export function ResourceKindTabs({
  clusterId,
  namespace,
  openResourceKinds,
  selectedResourceKind,
  openVirtualPages = [],
  selectedVirtualPage = null,
  renderVirtualPage
}: ResourceKindTabsProps): React.JSX.Element {
  const setSelectedResourceKind = useClusterStore((s) => s.setSelectedResourceKind)
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const closeResourceKind = useClusterStore((s) => s.closeResourceKind)
  const closeAllResourceKinds = useClusterStore((s) => s.closeAllResourceKinds)
  const openVirtualPage = useClusterStore((s) => s.openVirtualPage)
  const closeVirtualPage = useClusterStore((s) => s.closeVirtualPage)
  const reorderVirtualPages = useClusterStore((s) => s.reorderVirtualPages)
  const reorderResourceKinds = useClusterStore((s) => s.reorderResourceKinds)
  const getResourceTabPrefs = useClusterStore((s) => s.getResourceTabPrefs)
  const updateResourceTabPrefs = useClusterStore((s) => s.updateResourceTabPrefs)
  const isClusterActive = useClusterStore((s) => s.activeClusterId === clusterId)
  const layoutMode = useLayoutMode()
  const allowResourceSplit = canUseSplitLayouts(layoutMode)

  const [, forceRender] = useState(0)

  const prefs = getResourceTabPrefs(clusterId)
  const orderedKinds = useMemo(
    () => sortResourceKinds(openResourceKinds, prefs.pinned),
    [openResourceKinds, prefs.pinned]
  )

  const showingVirtual = selectedVirtualPage != null && openVirtualPages.includes(selectedVirtualPage)
  const activeKind = showingVirtual ? null : (selectedResourceKind ?? orderedKinds[0] ?? null)

  useEffect(() => {
    if (showingVirtual) return
    if (!selectedResourceKind && orderedKinds.length > 0) {
      setSelectedResourceKind(clusterId, orderedKinds[0])
    }
  }, [clusterId, selectedResourceKind, orderedKinds, setSelectedResourceKind, showingVirtual])

  useEffect(() => {
    if (orderedKinds.length > 0 && orderedKinds.join(',') !== openResourceKinds.join(',')) {
      reorderResourceKinds(clusterId, orderedKinds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!allowResourceSplit && prefs.splitView) {
      updateResourceTabPrefs(clusterId, { splitView: false })
    }
  }, [allowResourceSplit, clusterId, prefs.splitView, updateResourceTabPrefs])

  if (orderedKinds.length === 0 && openVirtualPages.length === 0) {
    return <EmptyState />
  }

  const splitLeftKind = prefs.splitLeftKind ?? selectedResourceKind ?? orderedKinds[0]
  const splitRightKind =
    prefs.splitRightKind ??
    (splitLeftKind ? orderedKinds.find((k) => k !== splitLeftKind) : undefined) ??
    orderedKinds[0]

  const closableKinds = orderedKinds.filter((kind) => !prefs.pinned.includes(kind))
  const splitTabKinds = [splitLeftKind, splitRightKind].filter((k): k is ResourceKind => !!k)
  const closableSplitKinds = splitTabKinds.filter((kind) => !prefs.pinned.includes(kind))

  function refreshPrefs(): void {
    forceRender((n) => n + 1)
  }

  function togglePin(kind: ResourceKind): void {
    const nextPinned = prefs.pinned.includes(kind)
      ? prefs.pinned.filter((k) => k !== kind)
      : [...prefs.pinned, kind]
    updateResourceTabPrefs(clusterId, { pinned: nextPinned })
    reorderResourceKinds(clusterId, sortResourceKinds(openResourceKinds, nextPinned))
    refreshPrefs()
  }

  function toggleFavorite(kind: ResourceKind): void {
    const nextFavorites = prefs.favorites.includes(kind)
      ? prefs.favorites.filter((k) => k !== kind)
      : [...prefs.favorites, kind]
    updateResourceTabPrefs(clusterId, { favorites: nextFavorites })
    refreshPrefs()
  }

  function handleReorderPinned(nextPinned: ResourceKind[]): void {
    const unpinned = orderedKinds.filter((k) => !prefs.pinned.includes(k))
    // `orderedKinds` derives pinned order from `prefs.pinned` (see sortResourceKinds), not from
    // openResourceKinds — so persisting only the tab order would be discarded on the next render.
    // `nextPinned` covers just the open pinned tabs; keep pinned-but-closed kinds so they stay pinned.
    const closedPinned = prefs.pinned.filter((k) => !nextPinned.includes(k))
    updateResourceTabPrefs(clusterId, { pinned: [...nextPinned, ...closedPinned] })
    reorderResourceKinds(clusterId, [...nextPinned, ...unpinned])
    refreshPrefs()
  }

  /**
   * Unpinned resource tabs and virtual-page tabs live in one draggable group, so a reorder
   * yields a mixed id list. Persist it as the cross-type display order, then push each type's
   * relative order back into its own store array so the rest of the app stays consistent.
   */
  function handleReorderMergedTabs(nextIds: string[]): void {
    updateResourceTabPrefs(clusterId, { tabOrder: nextIds })

    const pinned = orderedKinds.filter((k) => prefs.pinned.includes(k))
    const nextUnpinned = nextIds
      .filter((id) => id.startsWith('kind:'))
      .map((id) => id.slice('kind:'.length) as ResourceKind)
    reorderResourceKinds(clusterId, [...pinned, ...nextUnpinned])

    const nextVirtual = nextIds
      .filter((id) => id.startsWith('virtual:'))
      .map((id) => id.slice('virtual:'.length) as VirtualPageKey)
    reorderVirtualPages(clusterId, nextVirtual)

    refreshPrefs()
  }

  function handleTabSelect(kind: ResourceKind): void {
    if (prefs.splitView) {
      if (prefs.focusedSplitPane === 'left') {
        updateResourceTabPrefs(clusterId, { splitLeftKind: kind })
      } else {
        updateResourceTabPrefs(clusterId, { splitRightKind: kind })
      }
      refreshPrefs()
    }
    setSelectedResourceKind(clusterId, kind)
  }

  function handlePaneTabSelect(kind: ResourceKind, pane: 'left' | 'right'): void {
    updateResourceTabPrefs(clusterId, {
      focusedSplitPane: pane,
      ...(pane === 'left' ? { splitLeftKind: kind } : { splitRightKind: kind })
    })
    setSelectedResourceKind(clusterId, kind)
    refreshPrefs()
  }

  function handleCloseTab(kind: ResourceKind): void {
    if (prefs.pinned.includes(kind)) {
      message.info('Unpin this tab before closing it')
      return
    }
    closeResourceKind(clusterId, kind)
    refreshPrefs()
  }

  function handleCloseOthers(keep: ResourceKind): void {
    const toClose = orderedKinds.filter((k) => k !== keep && !prefs.pinned.includes(k))
    if (toClose.length === 0) {
      message.info('No other closable tabs')
      return
    }
    for (const kind of toClose) closeResourceKind(clusterId, kind)
    setSelectedResourceKind(clusterId, keep)
    refreshPrefs()
  }

  function handleCloseToRight(from: ResourceKind): void {
    const index = orderedKinds.indexOf(from)
    if (index < 0) return
    const toClose = orderedKinds.slice(index + 1).filter((k) => !prefs.pinned.includes(k))
    if (toClose.length === 0) {
      message.info('No closable tabs to the right')
      return
    }
    for (const kind of toClose) closeResourceKind(clusterId, kind)
    refreshPrefs()
  }

  function handleCloseAllTabs(): void {
    if (closableKinds.length === 0) {
      message.info('All open tabs are pinned')
      return
    }
    Modal.confirm({
      title: 'Close all resource tabs?',
      content: `Close ${closableKinds.length} tab(s)? Pinned tabs will stay open.`,
      okText: 'Close all',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        closeAllResourceKinds(clusterId)
        refreshPrefs()
      }
    })
  }

  function handleCloseSplitTabs(): void {
    if (closableSplitKinds.length === 0) {
      message.info('Split tabs are pinned')
      return
    }
    Modal.confirm({
      title: 'Close both split tabs?',
      content: `Close ${closableSplitKinds.map(String).join(' and ')}? Pinned tabs stay open.`,
      okText: 'Close',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        for (const kind of closableSplitKinds) closeResourceKind(clusterId, kind)
        updateResourceTabPrefs(clusterId, { splitView: false })
        refreshPrefs()
      }
    })
  }

  function toggleSplitView(): void {
    if (prefs.splitView) {
      const focusedNs =
        prefs.focusedSplitPane === 'left'
          ? (prefs.splitLeftNamespace ?? namespace)
          : (prefs.splitRightNamespace ?? namespace)
      setSelectedNamespace(clusterId, focusedNs)
      updateResourceTabPrefs(clusterId, { splitView: false })
      refreshPrefs()
      return
    }
    if (orderedKinds.length < 2) {
      message.info('Open at least two resource tabs to split')
      return
    }
    const left = selectedResourceKind ?? orderedKinds[0]
    const right = orderedKinds.find((k) => k !== left) ?? orderedKinds[1]
    updateResourceTabPrefs(clusterId, {
      splitView: true,
      splitLeftKind: left,
      splitRightKind: right,
      splitLeftNamespace: namespace,
      splitRightNamespace: namespace,
      focusedSplitPane: 'left'
    })
    refreshPrefs()
  }

  function openInPane(kind: ResourceKind, pane: 'left' | 'right'): void {
    const patch =
      pane === 'left'
        ? {
            splitView: true as const,
            splitLeftKind: kind,
            focusedSplitPane: 'left' as const,
            splitLeftNamespace: prefs.splitLeftNamespace ?? namespace,
            splitRightNamespace: prefs.splitRightNamespace ?? namespace,
            splitRightKind: prefs.splitRightKind ?? orderedKinds.find((k) => k !== kind) ?? kind
          }
        : {
            splitView: true as const,
            splitRightKind: kind,
            focusedSplitPane: 'right' as const,
            splitLeftNamespace: prefs.splitLeftNamespace ?? namespace,
            splitRightNamespace: prefs.splitRightNamespace ?? namespace,
            splitLeftKind: prefs.splitLeftKind ?? orderedKinds.find((k) => k !== kind) ?? kind
          }
    updateResourceTabPrefs(clusterId, patch)
    setSelectedResourceKind(clusterId, kind)
    refreshPrefs()
  }

  function handlePaneNamespaceChange(pane: 'left' | 'right', ns: string): void {
    updateResourceTabPrefs(
      clusterId,
      pane === 'left' ? { splitLeftNamespace: ns } : { splitRightNamespace: ns }
    )
    if (prefs.focusedSplitPane === pane) {
      setSelectedNamespace(clusterId, ns)
    }
    refreshPrefs()
  }

  function focusPane(pane: 'left' | 'right'): void {
    if (!splitLeftKind || !splitRightKind) return
    const paneNs =
      pane === 'left'
        ? (prefs.splitLeftNamespace ?? namespace)
        : (prefs.splitRightNamespace ?? namespace)
    updateResourceTabPrefs(clusterId, { focusedSplitPane: pane })
    setSelectedNamespace(clusterId, paneNs)
    setSelectedResourceKind(clusterId, pane === 'left' ? splitLeftKind : splitRightKind)
    refreshPrefs()
  }

  const tabActiveKey =
    showingVirtual
      ? null
      : prefs.splitView && allowResourceSplit
        ? prefs.focusedSplitPane === 'left'
          ? splitLeftKind
          : splitRightKind
        : activeKind

  const contextActions: ResourceTabContextActions = {
    onClose: handleCloseTab,
    onCloseOthers: handleCloseOthers,
    onCloseAll: handleCloseAllTabs,
    onCloseToRight: handleCloseToRight,
    onCloseSplitTabs: handleCloseSplitTabs,
    onTogglePin: togglePin,
    onToggleFavorite: toggleFavorite,
    onToggleSplit: toggleSplitView,
    onOpenInLeftPane: (kind) => openInPane(kind, 'left'),
    onOpenInRightPane: (kind) => openInPane(kind, 'right'),
    allowSplit: allowResourceSplit && orderedKinds.length >= 1,
    splitActive: Boolean(prefs.splitView && allowResourceSplit),
    canCloseAll: closableKinds.length > 0,
    canCloseSplitTabs: Boolean(prefs.splitView && closableSplitKinds.length > 0),
    pinnedKinds: prefs.pinned,
    favoriteKinds: prefs.favorites,
    orderedKinds
  }

  const tabBarExtra =
    allowResourceSplit && (prefs.splitView || orderedKinds.length >= 2) ? (
      <div className="ml-resource-tab-extra ml-action-bar ml-action-bar--end">
        <div className="ml-action-group ml-action-group--end ml-resource-tab-extra__tools">
          {prefs.splitView ? (
            <>
              <button
                type="button"
                className={`ml-icon-btn ml-resource-tab-tool${prefs.focusedSplitPane === 'left' ? ' ml-icon-btn--active' : ''}`}
                onClick={() => focusPane('left')}
                aria-label="Focus left pane"
                title="Left pane"
              >
                <Icon icon={PanelLeft} variant="micro" />
              </button>
              <button
                type="button"
                className={`ml-icon-btn ml-resource-tab-tool${prefs.focusedSplitPane === 'right' ? ' ml-icon-btn--active' : ''}`}
                onClick={() => focusPane('right')}
                aria-label="Focus right pane"
                title="Right pane"
              >
                <Icon icon={PanelRight} variant="micro" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={`ml-icon-btn ml-resource-tab-tool${prefs.splitView ? ' ml-icon-btn--active' : ''}`}
            onClick={toggleSplitView}
            aria-label={prefs.splitView ? 'Exit split view' : 'Split view'}
            title={prefs.splitView ? 'Exit split view' : 'Split view'}
          >
            <Icon icon={Columns2} variant="micro" />
          </button>
        </div>
      </div>
    ) : null

  const splitToggleExtra = (
    <div className="ml-resource-tab-extra ml-action-bar ml-action-bar--end">
      <div className="ml-action-group ml-action-group--end ml-resource-tab-extra__tools">
        <button
          type="button"
          className="ml-icon-btn ml-resource-tab-tool ml-icon-btn--active"
          onClick={toggleSplitView}
          aria-label="Exit split view"
          title="Exit split view"
        >
          <Icon icon={Columns2} variant="micro" />
        </button>
      </div>
    </div>
  )

  const leftNamespace = prefs.splitLeftNamespace ?? namespace
  const rightNamespace = prefs.splitRightNamespace ?? namespace

  const sharedTabBarProps = {
    orderedKinds,
    pinnedKinds: prefs.pinned,
    favoriteKinds: prefs.favorites,
    tabOrder: prefs.tabOrder,
    onReorderPinned: handleReorderPinned,
    onReorderMergedTabs: handleReorderMergedTabs,
    onTogglePin: togglePin,
    onToggleFavorite: toggleFavorite,
    onClose: handleCloseTab,
    contextActions
  }

  const isSplit = Boolean(prefs.splitView && allowResourceSplit && splitLeftKind && splitRightKind && !showingVirtual)

  if (isSplit) {
    return (
      <div className="resource-kind-tabs-root resource-kind-tabs-root--split">
        <div className="resource-kind-tabs-content">
          <Splitter style={{ height: '100%' }}>
            <Splitter.Panel
              defaultSize="50%"
              min={RESOURCE_TAB_SPLIT_PANEL_MIN_PX}
              className={prefs.focusedSplitPane === 'left' ? 'ml-split-pane--focused' : 'ml-split-pane'}
            >
              <div className="ml-split-pane-inner" onMouseDown={() => focusPane('left')}>
                <ResourceKindTabBar
                  {...sharedTabBarProps}
                  className="ml-resource-tab-bar--pane"
                  activeKind={splitLeftKind}
                  openVirtualPages={[]}
                  activeVirtualPage={null}
                  onSelectKind={(kind) => handlePaneTabSelect(kind, 'left')}
                  extra={splitToggleExtra}
                />
                <div className="ml-split-pane-body">
                  <ResourceTable
                    clusterId={clusterId}
                    namespace={leftNamespace}
                    kind={splitLeftKind}
                    isActive={isClusterActive}
                    onNamespaceChange={(ns) => handlePaneNamespaceChange('left', ns)}
                  />
                </div>
              </div>
            </Splitter.Panel>
            <Splitter.Panel
              defaultSize="50%"
              min={RESOURCE_TAB_SPLIT_PANEL_MIN_PX}
              className={prefs.focusedSplitPane === 'right' ? 'ml-split-pane--focused' : 'ml-split-pane'}
            >
              <div className="ml-split-pane-inner" onMouseDown={() => focusPane('right')}>
                <ResourceKindTabBar
                  {...sharedTabBarProps}
                  className="ml-resource-tab-bar--pane"
                  activeKind={splitRightKind}
                  openVirtualPages={[]}
                  activeVirtualPage={null}
                  onSelectKind={(kind) => handlePaneTabSelect(kind, 'right')}
                  extra={splitToggleExtra}
                />
                <div className="ml-split-pane-body">
                  <ResourceTable
                    clusterId={clusterId}
                    namespace={rightNamespace}
                    kind={splitRightKind}
                    isActive={isClusterActive}
                    onNamespaceChange={(ns) => handlePaneNamespaceChange('right', ns)}
                  />
                </div>
              </div>
            </Splitter.Panel>
          </Splitter>
        </div>
      </div>
    )
  }

  function renderResourceContent(): React.ReactNode {
    if (showingVirtual && selectedVirtualPage && renderVirtualPage) {
      return renderVirtualPage(selectedVirtualPage)
    }
    if (activeKind) {
      return (
        <ResourceTable
          clusterId={clusterId}
          namespace={namespace}
          kind={activeKind}
          isActive={isClusterActive}
        />
      )
    }
    return <EmptyState />
  }

  return (
    <div className="resource-kind-tabs-root">
      <ResourceKindTabBar
        {...sharedTabBarProps}
        activeKind={tabActiveKey ?? null}
        openVirtualPages={openVirtualPages}
        activeVirtualPage={showingVirtual ? selectedVirtualPage : null}
        onSelectKind={handleTabSelect}
        onSelectVirtualPage={(page) => openVirtualPage(clusterId, page)}
        onCloseVirtualPage={(page) => closeVirtualPage(clusterId, page)}
        extra={tabBarExtra}
      />
      <div className="resource-kind-tabs-content">{renderResourceContent()}</div>
    </div>
  )
}
