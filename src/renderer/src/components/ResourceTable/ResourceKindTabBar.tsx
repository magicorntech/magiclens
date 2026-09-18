import { useMemo } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { Reorder, useDragControls } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Columns2,
  GripVertical,
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
import { kindTabId, mergeTabOrder, virtualTabId } from '../../utils/resourceTabPreferences'
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
  /** Saved cross-type display order (`kind:X` / `virtual:X` ids). */
  tabOrder?: string[]
  onReorderMergedTabs: (ids: string[]) => void
  onReorderPinned: (kinds: ResourceKind[]) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose: (kind: ResourceKind) => void
  contextActions: ResourceTabContextActions
  extra?: React.ReactNode
  className?: string
}

interface TabBarItemProps {
  /** Reorder value — the merged-order id, not the kind, so both tab types share one group. */
  id: string
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
  id,
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
        value={id}
        dragListener={false}
        dragControls={dragControls}
        layout="position"
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
        // This tab already has its own context menu (the Dropdown wrapping this item).
        // Without stopping propagation, a right-click here also reaches the tab BAR's own
        // Dropdown (wrapping the whole bar, for right-clicking empty space), so both menus'
        // items rendered at once — every entry they share, like "Split view" and "Close
        // all", visibly duplicated.
        onContextMenu={(e) => e.stopPropagation()}
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

function tabContextMenuHandler(
  kind: ResourceKind,
  contextActions: ResourceTabContextActions
): NonNullable<MenuProps['onClick']> {
  return ({ key }) => {
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
  }
}

interface TabGroupProps {
  /** `kind:X` / `virtual:X` ids — see resourceTabPreferences. */
  ids: string[]
  activeKind: ResourceKind | null
  activeVirtualPage: VirtualPageKey | null
  pinnedKinds: ResourceKind[]
  favoriteKinds: ResourceKind[]
  onSelectKind: (kind: ResourceKind) => void
  onSelectVirtualPage?: (page: VirtualPageKey) => void
  onCloseVirtualPage?: (page: VirtualPageKey) => void
  onReorder: (ids: string[]) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose: (kind: ResourceKind) => void
  contextActions: ResourceTabContextActions
}

/**
 * One Reorder.Group covering both resource-kind and virtual-page tabs, so an overview tab
 * can be dragged in among the resource tabs instead of being locked to its own leading group.
 */
function TabReorderGroup({
  ids,
  activeKind,
  activeVirtualPage,
  pinnedKinds,
  favoriteKinds,
  onSelectKind,
  onSelectVirtualPage,
  onCloseVirtualPage,
  onReorder,
  onTogglePin,
  onToggleFavorite,
  onClose,
  contextActions
}: TabGroupProps): React.JSX.Element {
  return (
    <Reorder.Group
      axis="x"
      values={ids}
      onReorder={(next) => onReorder(next as string[])}
      className="ml-resource-tab-bar__group"
      layoutScroll
    >
      {ids.map((id) => {
        if (id.startsWith('virtual:')) {
          const page = id.slice('virtual:'.length) as VirtualPageKey
          return (
            <VirtualTabItem
              key={id}
              id={id}
              page={page}
              active={activeVirtualPage === page}
              onSelect={() => onSelectVirtualPage?.(page)}
              onClose={() => onCloseVirtualPage?.(page)}
            />
          )
        }
        const kind = id.slice('kind:'.length) as ResourceKind
        return (
          <TabBarItem
            key={id}
            id={id}
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
            onContextMenuClick={tabContextMenuHandler(kind, contextActions)}
          />
        )
      })}
    </Reorder.Group>
  )
}

/**
 * Roving-tabindex ARIA `tab` pattern needs arrow keys to move focus between tabs
 * (Enter/Space then activates the focused one) — queried live off the DOM rather than
 * tracked in state so it keeps working across drag-reordering and virtual/pinned/unpinned
 * group boundaries without separate plumbing for each.
 */
function handleTabListKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'))
  if (tabs.length < 2) return
  const currentIndex = tabs.indexOf(document.activeElement as HTMLElement)
  if (currentIndex === -1) return
  e.preventDefault()
  const delta = e.key === 'ArrowRight' ? 1 : -1
  const next = tabs[(currentIndex + delta + tabs.length) % tabs.length]
  next.focus()
}

function VirtualTabItem({
  id,
  page,
  active,
  onSelect,
  onClose
}: {
  /** Reorder value — the merged-order id, not the page key. */
  id: string
  page: VirtualPageKey
  active: boolean
  onSelect: () => void
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const showIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)
  const dragControls = useDragControls()
  const label = t(`resourceNav.virtual.${page}`, { defaultValue: VIRTUAL_PAGE_LABELS[page] })
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={dragControls}
      layout="position"
      transition={{ layout: { duration: motionTokens.normal, ease: 'easeOut' } }}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
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
    >
      <span className="ml-resource-tab-label">
        <button
          type="button"
          className="ml-resource-tab-drag-handle"
          aria-label="Drag to reorder tab"
          onPointerDown={(e) => {
            e.stopPropagation()
            dragControls.start(e)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon={GripVertical} variant="micro" />
        </button>
        {showIcons ? (
          <span className="ml-resource-tab-label-icon">
            <Icon icon={virtualPageIcons[page]} variant="micro" />
          </span>
        ) : null}
        <span className="ml-resource-tab-label-text" title={label}>
          {label}
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
    </Reorder.Item>
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
  tabOrder = [],
  onReorderMergedTabs,
  onReorderPinned,
  onTogglePin,
  onToggleFavorite,
  onClose,
  contextActions,
  extra,
  className
}: ResourceKindTabBarProps): React.JSX.Element {
  const pinnedIds = useMemo(
    () => orderedKinds.filter((k) => pinnedKinds.includes(k)).map(kindTabId),
    [orderedKinds, pinnedKinds]
  )
  // Unpinned resource tabs and virtual-page tabs share one order so they can interleave.
  const mergedIds = useMemo(() => {
    const openIds = [
      ...openVirtualPages.map(virtualTabId),
      ...orderedKinds.filter((k) => !pinnedKinds.includes(k)).map(kindTabId)
    ]
    return mergeTabOrder(openIds, tabOrder)
  }, [openVirtualPages, orderedKinds, pinnedKinds, tabOrder])
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
        onKeyDown={handleTabListKeyDown}
      >
        <div className="ml-resource-tab-bar__inner">
          <div className="ml-resource-tab-bar__scroll">
            {pinnedIds.length > 0 ? (
              <>
                <TabReorderGroup
                  ids={pinnedIds}
                  activeKind={kindActive}
                  activeVirtualPage={activeVirtualPage}
                  pinnedKinds={pinnedKinds}
                  favoriteKinds={favoriteKinds}
                  onSelectKind={onSelectKind}
                  onReorder={(ids) =>
                    onReorderPinned(ids.map((id) => id.slice('kind:'.length) as ResourceKind))
                  }
                  onTogglePin={onTogglePin}
                  onToggleFavorite={onToggleFavorite}
                  onClose={onClose}
                  contextActions={contextActions}
                />
                {mergedIds.length > 0 ? <div className="ml-resource-tab-bar__sep" aria-hidden /> : null}
              </>
            ) : null}
            {mergedIds.length > 0 ? (
              <TabReorderGroup
                ids={mergedIds}
                activeKind={kindActive}
                activeVirtualPage={activeVirtualPage}
                pinnedKinds={pinnedKinds}
                favoriteKinds={favoriteKinds}
                onSelectKind={onSelectKind}
                onSelectVirtualPage={onSelectVirtualPage}
                onCloseVirtualPage={onCloseVirtualPage}
                onReorder={onReorderMergedTabs}
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
