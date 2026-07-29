import { useCallback, useState } from 'react'
import { Splitter } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceFocus } from '@shared/types/navigation'
import type { ResourceListItem } from '@shared/types/resource'
import {
  RESOURCE_TABLE_DETAIL_MIN_PX,
  RESOURCE_TABLE_LIST_MIN_PX
} from '../../constants/clusterSplitLimits'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { ResourceDetailDrawer } from '../ResourceTable/ResourceDetailDrawer'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'

export interface OverviewPageHandlers {
  onOpenResourceKind: (kind: ResourceKind) => void
  onNavigateToResource: (focus: ResourceFocus, item?: ResourceListItem) => void
}

interface OverviewDetailShellProps {
  clusterId: string
  isActive: boolean
  onOpenResourceKind: (kind: ResourceKind) => void
  children: (handlers: OverviewPageHandlers) => React.ReactNode
}

interface OverviewSelection {
  kind: ResourceKind
  item: ResourceListItem
}

function focusToListItem(focus: ResourceFocus): ResourceListItem {
  return {
    id: focus.namespace ? `${focus.namespace}/${focus.name}` : focus.name,
    name: focus.name,
    namespace: focus.namespace,
    ageTimestamp: null,
    statusText: '',
    statusColor: 'default',
    columns: {}
  }
}

export function OverviewDetailShell({
  clusterId,
  isActive,
  onOpenResourceKind,
  children
}: OverviewDetailShellProps): React.JSX.Element {
  const [selected, setSelected] = useState<OverviewSelection | null>(null)
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const layoutMode = useLayoutMode()
  const detailInSidebar =
    resourceDetailPlacement === 'right' && canUseSplitLayouts(layoutMode)
  const detailInDrawer =
    !detailInSidebar &&
    (resourceDetailPlacement === 'drawer' ||
      (resourceDetailPlacement === 'right' && !canUseSplitLayouts(layoutMode)))

  const onNavigateToResource = useCallback((focus: ResourceFocus, item?: ResourceListItem) => {
    setSelected({ kind: focus.kind, item: item ?? focusToListItem(focus) })
  }, [])

  const clearSelection = useCallback(() => setSelected(null), [])

  const handlers: OverviewPageHandlers = {
    onOpenResourceKind,
    onNavigateToResource
  }

  const overviewContent = children(handlers)

  if (detailInSidebar && selected) {
    return (
      <div className="ml-overview-host">
        <Splitter className="ml-overview-host__splitter" style={{ height: '100%' }}>
          <Splitter.Panel defaultSize="58%" min={RESOURCE_TABLE_LIST_MIN_PX}>
            <div className="ml-overview-host__main">{overviewContent}</div>
          </Splitter.Panel>
          <Splitter.Panel defaultSize="42%" min={RESOURCE_TABLE_DETAIL_MIN_PX}>
            <ResourceDetailPanel
              clusterId={clusterId}
              kind={selected.kind}
              item={selected.item}
              isActive={isActive}
              listQueryKey={['overview', clusterId, selected.kind]}
              layout="sidebar"
              onClose={clearSelection}
            />
          </Splitter.Panel>
        </Splitter>
      </div>
    )
  }

  return (
    <div className="ml-overview-host">
      <div className="ml-overview-host__main">{overviewContent}</div>
      {detailInDrawer ? (
        <ResourceDetailDrawer
          open={!!selected}
          clusterId={clusterId}
          kind={selected?.kind ?? 'Pods'}
          item={selected?.item ?? null}
          isActive={isActive}
          listQueryKey={selected ? ['overview', clusterId, selected.kind] : undefined}
          onClose={clearSelection}
        />
      ) : null}
    </div>
  )
}
