import { useMemo } from 'react'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import { kindGroups, kindIcons, standaloneKind, type VirtualPageKey } from '../../resourceConfig/kinds.renderer'

interface ResourceMenuProps {
  selectedKind: ResourceKind | null
  selectedVirtualPage: VirtualPageKey | null
  onSelect: (kind: ResourceKind) => void
  onSelectVirtualPage: (key: VirtualPageKey) => void
}

// kindGroups/kindIcons are static module-level constants, so the item tree never
// actually needs to be rebuilt — memoizing it prevents antd's Menu from treating an
// unrelated parent re-render as a structural change and replaying its selection animation.
export function ResourceMenu({
  selectedKind,
  selectedVirtualPage,
  onSelect,
  onSelectVirtualPage
}: ResourceMenuProps): React.JSX.Element {
  const items: MenuProps['items'] = useMemo(() => {
    const kindItem = (kind: ResourceKind): NonNullable<MenuProps['items']>[number] => {
      const Icon = kindIcons[kind]
      return { key: kind, icon: <Icon />, label: kind }
    }

    const StandaloneIcon = kindIcons[standaloneKind]

    return [
      { key: standaloneKind, icon: <StandaloneIcon />, label: standaloneKind },
      ...kindGroups.map((group) => ({
        key: group.title,
        label: group.title,
        children: [
          ...group.kinds.map(kindItem),
          ...(group.subGroups?.map((subGroup) => ({
            key: subGroup.title,
            label: subGroup.title,
            children: subGroup.kinds.map(kindItem)
          })) ?? []),
          ...(group.virtualEntries?.map((entry) => {
            const Icon = entry.icon
            return { key: entry.key, icon: <Icon />, label: entry.label }
          }) ?? [])
        ]
      }))
    ]
  }, [])

  const virtualKeys: ReadonlySet<string> = useMemo(
    () => new Set(kindGroups.flatMap((g) => g.virtualEntries?.map((e) => e.key) ?? [])),
    []
  )

  const selectedKeys = selectedVirtualPage ? [selectedVirtualPage] : selectedKind ? [selectedKind] : []

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={selectedKeys}
      items={items}
      onClick={(info) => {
        if (virtualKeys.has(info.key)) onSelectVirtualPage(info.key as VirtualPageKey)
        else onSelect(info.key as ResourceKind)
      }}
      style={{ height: '100%', borderRight: 0 }}
    />
  )
}
