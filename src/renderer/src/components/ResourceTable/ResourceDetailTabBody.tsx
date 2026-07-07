import { useMemo } from 'react'
import type { ResourceDetailTabState } from '../Layout/BottomPanelContext'
import { useResourceList } from '../../queries/useResourceList'
import { ResourceDetailPanel } from './ResourceDetailPanel'

interface ResourceDetailTabBodyProps {
  tab: ResourceDetailTabState
  isActive: boolean
  onClose: () => void
}

export function ResourceDetailTabBody({ tab, isActive, onClose }: ResourceDetailTabBodyProps): React.JSX.Element {
  const { data } = useResourceList(tab.clusterId, tab.namespace, tab.resourceKind, isActive)
  const liveItem = useMemo(() => {
    const items = data && 'items' in data ? data.items : []
    return items.find((item) => item.id === tab.item.id) ?? tab.item
  }, [data, tab.item])

  const listQueryKey = useMemo(
    () => ['resource-list', tab.clusterId, tab.namespace, tab.resourceKind],
    [tab.clusterId, tab.namespace, tab.resourceKind]
  )

  return (
    <ResourceDetailPanel
      clusterId={tab.clusterId}
      kind={tab.resourceKind}
      item={liveItem}
      isActive={isActive}
      layout="bottom"
      listQueryKey={listQueryKey}
      onClose={onClose}
    />
  )
}
