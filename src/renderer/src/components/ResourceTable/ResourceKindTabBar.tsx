import { useMemo } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { Reorder, useDragControls } from 'framer-motion'
import {
  Columns2,
  PanelLeft,
  PanelRight,
  Pin,
  Star,
  X,
  XCircle
} from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { motion as motionTokens } from '../../design-system/tokens'
import { virtualPageIcons } from '../../icons/resourceKindIcons'
import { VIRTUAL_PAGE_LABELS } from '../../resourceConfig/virtualPageLabels'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'
import { ResourceTabLabel } from './ResourceTabLabel'

export interface ResourceTabContextActions {
  onClose: (kind: ResourceKind) => void
  onCloseOthers: (kind: ResourceKind) => void
  onCloseAll: () => void
  onCloseToRight: (kind: ResourceKind) => void
  onCloseSplitTabs?: () => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onToggleSplit: () => void
  onOpenInLeftPane?: (kind: ResourceKind) => void
  onOpenInRightPane?: (kind: ResourceKind) => void
  allowSplit: boolean
  splitActive: boolean
  canCloseAll: boolean
  canCloseSplitTabs: boolean
  pinnedKinds: ResourceKind[]
  favoriteKinds: ResourceKind[]
  orderedKinds: ResourceKind[]
}

interface ResourceKindTabBarProps {
  orderedKinds: ResourceKind[]
  pinnedKinds: ResourceKind[]
  activeKind: ResourceKind | null
  favoriteKinds: ResourceKind[]
  openVirtualPages?: VirtualPageKey[]
  activeVirtualPage?: VirtualPageKey | null
  onSelectKind: (kind: ResourceKind) => void
  onSelectVirtualPage?: (page: VirtualPageKey) => void
  onCloseVirtualPage?: (page: VirtualPageKey) => void
  onReorderPinned: (kinds: ResourceKind[]) => void
  onReorderUnpinned: (kinds: ResourceKind[]) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose: (kind: ResourceKind) => void
  contextActions: ResourceTabContextActions
  extra?: React.ReactNode
  className?: string
}

interface TabBarItemProps {
  kind: ResourceKind
  active: boolean
  pinned: boolean
  favorite: boolean
  closable: boolean
  onSelect: () => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose: (kind: ResourceKind) => void
  contextMenuItems: MenuProps['items']
  onContextMenuClick: MenuProps['onClick']
}

function buildTabContextMenu(
  kind: ResourceKind,
  actions: ResourceTabContextActions
): MenuProps['items'] {
  const pinned = actions.pinnedKinds.includes(kind)
  const favorite = actions.favoriteKinds.includes(kind)
  const closable = !pinned
  const index = actions.orderedKinds.indexOf(kind)
  const hasOthersToClose = actions.orderedKinds.some((k) => k !== kind && !actions.pinnedKinds.includes(k))
  const hasToRight = actions.orderedKinds
    .slice(index + 1)
    .some((k) => !actions.pinnedKinds.includes(k))

  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'close',
      label: 'Close tab',
      icon: <Icon icon={X} variant="detail" />,
      disabled: !closable
    },
    {
      key: 'close-others',
      label: 'Close other tabs',
      icon: <Icon icon={XCircle} variant="detail" />,
      disabled: !hasOthersToClose
    },
    {
      key: 'close-to-right',
      label: 'Close tabs to the right',
      icon: <Icon icon={XCircle} variant="detail" />,
      disabled: !hasToRight
    },
    {
      key: 'close-all',
      label: 'Close all tabs',
      icon: <Icon icon={XCircle} variant="detail" />,
      disabled: !actions.canCloseAll,
      danger: true
    }
  ]

  if (actions.splitActive && actions.canCloseSplitTabs) {
    items.push({
      key: 'close-split-tabs',
      label: 'Close both split tabs',
      icon: <Icon icon={XCircle} variant="detail" />
    })
  }

  items.push({ type: 'divider' })

  if (actions.allowSplit) {
    items.push({
      key: 'toggle-split',
      label: actions.splitActive ? 'Exit split view' : 'Split view',
      icon: <Icon icon={Columns2} variant="detail" />,
      disabled: !actions.splitActive && actions.orderedKinds.length < 2
    })

    if (actions.splitActive) {
      items.push(
        {
          key: 'open-left',
          label: 'Open in left pane',
          icon: <Icon icon={PanelLeft} variant="detail" />
        },
        {
          key: 'open-right',
          label: 'Open in right pane',
          icon: <Icon icon={PanelRight} variant="detail" />
        }
      )
    }

    items.push({ type: 'divider' })
  }

  items.push(
    {
      key: 'pin',
      label: pinned ? 'Unpin tab' : 'Pin tab',
      icon: <Icon icon={Pin} variant="detail" />
    },
    {
      key: 'favorite',
      label: favorite ? 'Remove favorite' : 'Add favorite',
      icon: <Icon icon={Star} variant="detail" fill={favorite ? 'currentColor' : 'none'} />
    }
  )

  return items
}

function buildBarContextMenu(actions: ResourceTabContextActions): MenuProps['items'] {
  const items: NonNullable<MenuProps['items']> = []

  if (actions.allowSplit) {
    items.push({
      key: 'toggle-split',
      label: actions.splitActive ? 'Exit split view' : 'Split view',
      icon: <Icon icon={Columns2} variant="detail" />,
      disabled: !actions.splitActive && actions.orderedKinds.length < 2
    })
  }

  if (actions.splitActive && actions.canCloseSplitTabs) {
    items.push({
      key: 'close-split-tabs',
      label: 'Close both split tabs',
      icon: <Icon icon={XCircle} variant="detail" />
    })
  }

  items.push({
    key: 'close-all',
    label: 'Close all tabs',
    icon: <Icon icon={XCircle} variant="detail" />,
    disabled: !actions.canCloseAll,
    danger: true
  })

  return items
}

function TabBarItem({
  kind,
  active,
  pinned,
  favorite,
  closable,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onClose,
  contextMenuItems,
  onContextMenuClick
}: TabBarItemProps): React.JSX.Element {
  const dragControls = useDragControls()

  return (
    <Dropdown
      menu={{ items: contextMenuItems, onClick: onContextMenuClick }}
      trigger={['contextMenu']}
      destroyOnHidden
    >
      <Reorder.Item
        value={kind}
        dragListener={false}
        dragControls={dragControls}
        layout="position"
        layoutScroll
        transition={{ layout: { duration: motionTokens.normal, ease: 'easeOut' } }}
        className={`ml-resource-tab-bar__item${active ? ' ml-resource-tab-bar__item--active' : ''}`}
        whileDrag={{
          scale: 1.05,
          zIndex: 20,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          cursor: 'grabbing'
        }}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
        role="tab"
        aria-selected={active}
        tabIndex={active ? 0 : -1}
      >
        <ResourceTabLabel
          kind={kind}
          pinned={pinned}
          favorite={favorite}
          closable={closable}
          reorderable
          onDragHandlePointerDown={(e) => {
            e.stopPropagation()
            dragControls.start(e)
          }}
          onTogglePin={onTogglePin}
          onToggleFavorite={onToggleFavorite}
          onClose={onClose}
        />
      </Reorder.Item>
    </Dropdown>
  )
}

function ReorderableTabGroup({
  kinds,
  activeKind,
  pinnedKinds,
  favoriteKinds,
  onSelectKind,
  onReorder,
  onTogglePin,
  onToggleFavorite,
  onClose,
  contextActions
}: {
  kinds: ResourceKind[]
  activeKind: ResourceKind | null
  pinnedKinds: ResourceKind[]
  favoriteKinds: ResourceKind[]
  onSelectKind: (kind: ResourceKind) => void
  onReorder: (kinds: ResourceKind[]) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose: (kind: ResourceKind) => void
  contextActions: ResourceTabContextActions
}): React.JSX.Element {
  return (
    <Reorder.Group
      axis="x"
      values={kinds}
      onReorder={onReorder}
      className="ml-resource-tab-bar__group"
      layoutScroll
    >
      {kinds.map((kind) => (
        <TabBarItem
          key={kind}
          kind={kind}
          active={kind === activeKind}
          pinned={pinnedKinds.includes(kind)}
          favorite={favoriteKinds.includes(kind)}
          closable={!pinnedKinds.includes(kind)}
          onSelect={() => onSelectKind(kind)}
          onTogglePin={onTogglePin}
          onToggleFavorite={onToggleFavorite}
          onClose={onClose}
          contextMenuItems={buildTabContextMenu(kind, contextActions)}
          onContextMenuClick={({ key }) => {
            switch (key) {
              case 'close':
                contextActions.onClose(kind)
                break
              case 'close-others':
                contextActions.onCloseOthers(kind)
                break
              case 'close-to-right':
                contextActions.onCloseToRight(kind)
                break
              case 'close-all':
                contextActions.onCloseAll()
                break
              case 'close-split-tabs':
                contextActions.onCloseSplitTabs?.()
                break
              case 'toggle-split':
                contextActions.onToggleSplit()
                break
              case 'open-left':
                contextActions.onOpenInLeftPane?.(kind)
                break
              case 'open-right':
                contextActions.onOpenInRightPane?.(kind)
                break
              case 'pin':
                contextActions.onTogglePin(kind)
                break
              case 'favorite':
                contextActions.onToggleFavorite(kind)
                break
              default:
                break
            }
          }}
        />
      ))}
    </Reorder.Group>
  )
}

function VirtualTabItem({
  page,
  active,
  onSelect,
  onClose
}: {
  page: VirtualPageKey
  active: boolean
  onSelect: () => void
  onClose: () => void
}): React.JSX.Element {
  const showIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`ml-resource-tab-bar__item${active ? ' ml-resource-tab-bar__item--active' : ''}`}
      onClick={onSelect}
    >
      <span className="ml-resource-tab-label">
        {showIcons ? (
          <span className="ml-resource-tab-label-icon">
            <Icon icon={virtualPageIcons[page]} variant="micro" />
          </span>
        ) : null}
        <span className="ml-resource-tab-label-text" title={VIRTUAL_PAGE_LABELS[page]}>
          {VIRTUAL_PAGE_LABELS[page]}
        </span>
        <span className="ml-resource-tab-label-actions">
          <span
            className="ml-resource-tab-action ml-resource-tab-action--close"
            role="button"
            tabIndex={0}
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }
            }}
          >
            <Icon icon={X} variant="micro" />
          </span>
        </span>
      </span>
    </button>
  )
}

export function ResourceKindTabBar({
  orderedKinds,
  pinnedKinds,
  activeKind,
  favoriteKinds,
  openVirtualPages = [],
  activeVirtualPage = null,
  onSelectKind,
  onSelectVirtualPage,
  onCloseVirtualPage,
  onReorderPinned,
  onReorderUnpinned,
  onTogglePin,
  onToggleFavorite,
  onClose,
  contextActions,
  extra,
  className
}: ResourceKindTabBarProps): React.JSX.Element {
  const pinnedOpen = useMemo(
    () => orderedKinds.filter((k) => pinnedKinds.includes(k)),
    [orderedKinds, pinnedKinds]
  )
  const unpinnedOpen = useMemo(
    () => orderedKinds.filter((k) => !pinnedKinds.includes(k)),
    [orderedKinds, pinnedKinds]
  )
  const kindActive = activeVirtualPage == null ? activeKind : null

  return (
    <Dropdown
      menu={{
        items: buildBarContextMenu(contextActions),
        onClick: ({ key }) => {
          if (key === 'toggle-split') contextActions.onToggleSplit()
          if (key === 'close-all') contextActions.onCloseAll()
          if (key === 'close-split-tabs') contextActions.onCloseSplitTabs?.()
        }
      }}
      trigger={['contextMenu']}
      destroyOnHidden
    >
      <div
        className={`ml-resource-tab-bar${className ? ` ${className}` : ''}`}
        role="tablist"
      >
        <div className="ml-resource-tab-bar__inner">
          <div className="ml-resource-tab-bar__scroll">
            {openVirtualPages.length > 0 ? (
              <>
                <div className="ml-resource-tab-bar__group">
                  {openVirtualPages.map((page) => (
                    <VirtualTabItem
                      key={page}
                      page={page}
                      active={activeVirtualPage === page}
                      onSelect={() => onSelectVirtualPage?.(page)}
                      onClose={() => onCloseVirtualPage?.(page)}
                    />
                  ))}
                </div>
                {orderedKinds.length > 0 ? <div className="ml-resource-tab-bar__sep" aria-hidden /> : null}
              </>
            ) : null}
            {pinnedOpen.length > 0 ? (
              <>
                <ReorderableTabGroup
                  kinds={pinnedOpen}
                  activeKind={kindActive}
                  pinnedKinds={pinnedKinds}
                  favoriteKinds={favoriteKinds}
                  onSelectKind={onSelectKind}
                  onReorder={onReorderPinned}
                  onTogglePin={onTogglePin}
                  onToggleFavorite={onToggleFavorite}
                  onClose={onClose}
                  contextActions={contextActions}
                />
                {unpinnedOpen.length > 0 ? <div className="ml-resource-tab-bar__sep" aria-hidden /> : null}
              </>
            ) : null}
            {unpinnedOpen.length > 0 ? (
              <ReorderableTabGroup
                kinds={unpinnedOpen}
                activeKind={kindActive}
                pinnedKinds={pinnedKinds}
                favoriteKinds={favoriteKinds}
                onSelectKind={onSelectKind}
                onReorder={onReorderUnpinned}
                onTogglePin={onTogglePin}
                onToggleFavorite={onToggleFavorite}
                onClose={onClose}
                contextActions={contextActions}
              />
            ) : null}
          </div>
          {extra ? <div className="ml-resource-tab-bar__extra">{extra}</div> : null}
        </div>
      </div>
    </Dropdown>
  )
}
