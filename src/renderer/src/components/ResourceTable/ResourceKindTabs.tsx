import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Splitter, Tabs, Tooltip, message } from 'antd'
import { Columns2, ListX } from 'lucide-react'
import type { TabsProps } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import { useClusterStore } from '../../stores/clusterStore'
import { sortResourceKinds } from '../../utils/resourceTabPreferences'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { ResourceTable } from './ResourceTable'
import { ResourceTabLabel } from './ResourceTabLabel'
import { EmptyState } from './EmptyErrorStates'

interface ResourceKindTabsProps {
  clusterId: string
  namespace: string
  openResourceKinds: ResourceKind[]
  selectedResourceKind: ResourceKind | null
}

export function ResourceKindTabs({
  clusterId,
  namespace,
  openResourceKinds,
  selectedResourceKind
}: ResourceKindTabsProps): React.JSX.Element {
  const setSelectedResourceKind = useClusterStore((s) => s.setSelectedResourceKind)
  const closeResourceKind = useClusterStore((s) => s.closeResourceKind)
  const closeAllResourceKinds = useClusterStore((s) => s.closeAllResourceKinds)
  const reorderResourceKinds = useClusterStore((s) => s.reorderResourceKinds)
  const getResourceTabPrefs = useClusterStore((s) => s.getResourceTabPrefs)
  const updateResourceTabPrefs = useClusterStore((s) => s.updateResourceTabPrefs)
  const isClusterActive = useClusterStore((s) => s.activeClusterId === clusterId)
  const layoutMode = useLayoutMode()
  const allowResourceSplit = canUseSplitLayouts(layoutMode)

  const [, forceRender] = useState(0)
  const dragKindRef = useRef<ResourceKind | null>(null)

  const prefs = getResourceTabPrefs(clusterId)
  const orderedKinds = useMemo(
    () => sortResourceKinds(openResourceKinds, prefs.pinned),
    [openResourceKinds, prefs.pinned]
  )

  const activeKind = selectedResourceKind ?? orderedKinds[0]

  useEffect(() => {
    if (!selectedResourceKind && orderedKinds.length > 0) {
      setSelectedResourceKind(clusterId, orderedKinds[0])
    }
  }, [clusterId, selectedResourceKind, orderedKinds, setSelectedResourceKind])

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

  if (orderedKinds.length === 0) {
    return <EmptyState />
  }

  const splitLeftKind = prefs.splitLeftKind ?? selectedResourceKind ?? orderedKinds[0]
  const splitRightKind =
    prefs.splitRightKind ?? orderedKinds.find((k) => k !== splitLeftKind) ?? orderedKinds[0]

  const closableKinds = orderedKinds.filter((kind) => !prefs.pinned.includes(kind))

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

  function handleReorder(targetKind: ResourceKind): void {
    const dragKind = dragKindRef.current
    dragKindRef.current = null
    if (!dragKind || dragKind === targetKind) return
    const kinds = [...orderedKinds]
    const from = kinds.indexOf(dragKind)
    const to = kinds.indexOf(targetKind)
    if (from < 0 || to < 0) return
    kinds.splice(from, 1)
    kinds.splice(to, 0, dragKind)
    reorderResourceKinds(clusterId, sortResourceKinds(kinds, prefs.pinned))
  }

  function handleTabChange(key: string): void {
    const kind = key as ResourceKind
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

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove'): void {
    if (action !== 'remove') return
    const kind = targetKey as ResourceKind
    if (prefs.pinned.includes(kind)) {
      message.info('Unpin this tab before closing it')
      return
    }
    closeResourceKind(clusterId, kind)
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

  function toggleSplitView(): void {
    if (prefs.splitView) {
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
      focusedSplitPane: 'left'
    })
    refreshPrefs()
  }

  const tabActiveKey = prefs.splitView && allowResourceSplit
    ? prefs.focusedSplitPane === 'left'
      ? splitLeftKind
      : splitRightKind
    : activeKind

  const items: TabsProps['items'] = orderedKinds.map((kind) => ({
    key: kind,
    label: (
      <ResourceTabLabel
        kind={kind}
        pinned={prefs.pinned.includes(kind)}
        favorite={prefs.favorites.includes(kind)}
        draggable
        onDragStart={(k) => {
          dragKindRef.current = k
        }}
        onDrop={handleReorder}
        onTogglePin={togglePin}
        onToggleFavorite={toggleFavorite}
      />
    ),
    closable: !prefs.pinned.includes(kind),
    children: null
  }))

  const tabBarExtra = (
    <div className="ml-resource-tab-extra">
      {prefs.splitView && allowResourceSplit && (
        <>
          <button
            type="button"
            className={`ml-btn ml-btn--ghost ml-btn--sm${prefs.focusedSplitPane === 'left' ? ' ml-btn--active' : ''}`}
            onClick={() => {
              updateResourceTabPrefs(clusterId, { focusedSplitPane: 'left' })
              refreshPrefs()
            }}
          >
            Left
          </button>
          <button
            type="button"
            className={`ml-btn ml-btn--ghost ml-btn--sm${prefs.focusedSplitPane === 'right' ? ' ml-btn--active' : ''}`}
            onClick={() => {
              updateResourceTabPrefs(clusterId, { focusedSplitPane: 'right' })
              refreshPrefs()
            }}
          >
            Right
          </button>
        </>
      )}
      {closableKinds.length >= 2 && (
        <Tooltip title="Close all unpinned tabs">
          <button
            type="button"
            className="ml-btn ml-btn--ghost ml-btn--sm"
            onClick={handleCloseAllTabs}
            aria-label="Close all tabs"
          >
            <Icon icon={ListX} variant="detail" />
            <span>Close all</span>
          </button>
        </Tooltip>
      )}
      {allowResourceSplit && (
        <Tooltip title={prefs.splitView ? 'Close split view' : 'Split resource tabs side by side'}>
          <button
            type="button"
            className={`ml-btn ml-btn--ghost ml-btn--sm${prefs.splitView ? ' ml-btn--active' : ''}`}
            onClick={toggleSplitView}
            aria-label={prefs.splitView ? 'Close split view' : 'Split view'}
          >
            <Icon icon={Columns2} variant="detail" />
          </button>
        </Tooltip>
      )}
    </div>
  )

  return (
    <div className="resource-kind-tabs-root">
      <Tabs
        type="editable-card"
        hideAdd
        className="resource-kind-tabs-bar"
        activeKey={tabActiveKey}
        onChange={handleTabChange}
        onEdit={handleEdit}
        items={items}
        tabBarExtraContent={tabBarExtra}
      />
      <div className="resource-kind-tabs-content">
        {prefs.splitView && allowResourceSplit ? (
          <Splitter style={{ height: '100%' }}>
            <Splitter.Panel
              defaultSize="50%"
              min="25%"
              className={prefs.focusedSplitPane === 'left' ? 'ml-split-pane--focused' : 'ml-split-pane'}
            >
              <div
                className="ml-split-pane-inner"
                onMouseDown={() => {
                  updateResourceTabPrefs(clusterId, { focusedSplitPane: 'left' })
                  refreshPrefs()
                }}
              >
                <ResourceTable
                  clusterId={clusterId}
                  namespace={namespace}
                  kind={splitLeftKind}
                  isActive={isClusterActive}
                />
              </div>
            </Splitter.Panel>
            <Splitter.Panel
              defaultSize="50%"
              min="25%"
              className={prefs.focusedSplitPane === 'right' ? 'ml-split-pane--focused' : 'ml-split-pane'}
            >
              <div
                className="ml-split-pane-inner"
                onMouseDown={() => {
                  updateResourceTabPrefs(clusterId, { focusedSplitPane: 'right' })
                  refreshPrefs()
                }}
              >
                <ResourceTable
                  clusterId={clusterId}
                  namespace={namespace}
                  kind={splitRightKind}
                  isActive={isClusterActive}
                />
              </div>
            </Splitter.Panel>
          </Splitter>
        ) : (
          <ResourceTable
            clusterId={clusterId}
            namespace={namespace}
            kind={activeKind}
            isActive={isClusterActive}
          />
        )}
      </div>
    </div>
  )
}
