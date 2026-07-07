import { useEffect, useMemo, useState } from 'react'
import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import { StarFilled } from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import { useClusterStore } from '../../stores/clusterStore'
import { kindGroups, kindIcons, standaloneKind, type VirtualPageKey } from '../../resourceConfig/kinds.renderer'

interface ResourceMenuProps {
  clusterId: string
  selectedKind: ResourceKind | null
  selectedVirtualPage: VirtualPageKey | null
  onSelect: (kind: ResourceKind) => void
  onSelectVirtualPage: (key: VirtualPageKey) => void
}

export function ResourceMenu({
  clusterId,
  selectedKind,
  selectedVirtualPage,
  onSelect,
  onSelectVirtualPage
}: ResourceMenuProps): React.JSX.Element {
  const getResourceTabPrefs = useClusterStore((s) => s.getResourceTabPrefs)
  const [, refreshFavorites] = useState(0)

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ clusterId: string }>).detail
      if (detail?.clusterId === clusterId) refreshFavorites((n) => n + 1)
    }
    window.addEventListener('ml-resource-tabs-changed', handler)
    return () => window.removeEventListener('ml-resource-tabs-changed', handler)
  }, [clusterId])

  const favoriteResourceKinds = getResourceTabPrefs(clusterId).favorites

  const items: MenuProps['items'] = useMemo(() => {
    const kindItem = (kind: ResourceKind): NonNullable<MenuProps['items']>[number] => {
      const Icon = kindIcons[kind]
      return { key: kind, icon: <Icon />, label: kind }
    }

    const StandaloneIcon = kindIcons[standaloneKind]

    const favoriteItems =
      favoriteResourceKinds.length > 0
        ? [
            {
              key: '__favorites__',
              label: 'Favorites',
              icon: <StarFilled style={{ color: 'var(--ml-primary)' }} />,
              children: favoriteResourceKinds.map(kindItem)
            },
            { type: 'divider' as const }
          ]
        : []

    return [
      ...favoriteItems,
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
  }, [favoriteResourceKinds])

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
        if (info.key === '__favorites__') return
        if (virtualKeys.has(info.key)) onSelectVirtualPage(info.key as VirtualPageKey)
        else onSelect(info.key as ResourceKind)
      }}
      style={{ height: '100%', borderRight: 0 }}
    />
  )
}
