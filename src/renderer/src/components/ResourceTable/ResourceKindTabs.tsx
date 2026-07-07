import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { kindIcons } from '../../resourceConfig/kinds.renderer'
import { ResourceTable } from './ResourceTable'
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
  const isClusterActive = useClusterStore((s) => s.activeClusterId === clusterId)
  const showResourceTabIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)

  if (openResourceKinds.length === 0) {
    return <EmptyState />
  }

  const items: TabsProps['items'] = openResourceKinds.map((kind) => {
    const Icon = kindIcons[kind]
    return {
      key: kind,
      label: showResourceTabIcons ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, lineHeight: 1, display: 'inline-flex' }}>
            <Icon />
          </span>
          {kind}
        </span>
      ) : (
        kind
      ),
      children: (
        <ResourceTable
          clusterId={clusterId}
          namespace={namespace}
          kind={kind}
          isActive={isClusterActive && kind === selectedResourceKind}
        />
      )
    }
  })

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string): void {
    closeResourceKind(clusterId, targetKey as ResourceKind)
  }

  return (
    <Tabs
      type="editable-card"
      hideAdd
      activeKey={selectedResourceKind ?? undefined}
      onChange={(key) => setSelectedResourceKind(clusterId, key as ResourceKind)}
      onEdit={handleEdit}
      items={items}
      style={{ height: '100%' }}
    />
  )
}
