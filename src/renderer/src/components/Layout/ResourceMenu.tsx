import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Input, Popover, Tooltip, type MenuProps } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, Pin, Search, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { VirtualPageKey } from '@shared/types/navigation'
import { useClusterStore } from '../../stores/clusterStore'
import { useAuthStore } from '../../stores/authStore'
import {
  FAVORITES_SECTION_ID,
  favoritesSectionIcon,
  findSectionForSelection,
  navEntryKey,
  resourceNavLayout,
  type NavCollapsibleSection,
  type NavEntry,
  type NavLayoutItem
} from '../../resourceConfig/resourceNavConfig'
import { kindIconLucide, virtualPageIcons } from '../../icons/resourceKindIcons'
import { Icon } from '../ui/Icon'
import { HighlightText } from '../ClusterTabs/ClusterSearchInput'

function resolveNavEntryLabel(entry: NavEntry, t: TFunction): string {
  if (entry.type === 'virtual') return t(`resourceNav.virtual.${entry.key}`)
  if (entry.kind === 'CustomResourceDefinitions') return t('resourceNav.virtual.definitions')
  return entry.kind
}

function resolveSectionTitle(sectionId: string, t: TFunction): string {
  return t(`resourceNav.sections.${sectionId}`)
}

const EXPANDED_STORAGE_PREFIX = 'ml-resource-nav-expanded:'
/** Stable empty list so the auth selector does not allocate a new [] / Set every render. */
const EMPTY_HIDDEN_KINDS: string[] = []

interface ResourceMenuProps {
  clusterId: string
  selectedKind: ResourceKind | null
  selectedVirtualPage: VirtualPageKey | null
  onSelect: (kind: ResourceKind) => void
  onSelectVirtualPage: (key: VirtualPageKey) => void
  collapsed?: boolean
}

function loadExpandedSections(clusterId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${EXPANDED_STORAGE_PREFIX}${clusterId}`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function saveExpandedSections(clusterId: string, expanded: Set<string>): void {
  try {
    localStorage.setItem(`${EXPANDED_STORAGE_PREFIX}${clusterId}`, JSON.stringify([...expanded]))
  } catch {
    // ignore
  }
}

function matchesSearch(label: string, query: string): boolean {
  if (!query.trim()) return true
  return label.toLowerCase().includes(query.trim().toLowerCase())
}

export function ResourceMenu({
  clusterId,
  selectedKind,
  selectedVirtualPage,
  onSelect,
  onSelectVirtualPage,
  collapsed = false
}: ResourceMenuProps): React.JSX.Element {
  const { t } = useTranslation()
  const getResourceTabPrefs = useClusterStore((s) => s.getResourceTabPrefs)
  const updateResourceTabPrefs = useClusterStore((s) => s.updateResourceTabPrefs)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpandedSections(clusterId))
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [prefsTick, setPrefsTick] = useState(0)
  const [dragKind, setDragKind] = useState<ResourceKind | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const [focusIndex, setFocusIndex] = useState(-1)

  const prefs = getResourceTabPrefs(clusterId)
  const favoriteKinds = prefs.favorites
  const pinnedKinds = prefs.pinned
  const hiddenKindList = useAuthStore((s) => s.me?.hiddenResourceKinds ?? EMPTY_HIDDEN_KINDS)
  const hiddenKinds = useMemo(() => new Set(hiddenKindList), [hiddenKindList])

  const visibleNavLayout = useMemo((): NavLayoutItem[] => {
    if (hiddenKinds.size === 0) return resourceNavLayout
    return resourceNavLayout
      .map((item) => {
        if (item === 'favorites') return item
        if (item.type === 'standalone') {
          return hiddenKinds.has(item.kind) ? null : item
        }
        const entries = item.entries.filter((entry) => {
          if (entry.type === 'kind') return !hiddenKinds.has(entry.kind)
          return true
        })
        if (entries.length === 0) return null
        return { ...item, entries }
      })
      .filter((item): item is NavLayoutItem => item !== null)
  }, [hiddenKinds])

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ clusterId: string }>).detail
      if (detail?.clusterId === clusterId) setPrefsTick((n) => n + 1)
    }
    window.addEventListener('ml-resource-tabs-changed', handler)
    return () => window.removeEventListener('ml-resource-tabs-changed', handler)
  }, [clusterId])

  useEffect(() => {
    const activeSection = findSectionForSelection(selectedKind, selectedVirtualPage)
    if (!activeSection) return
    setExpanded((prev) => {
      if (prev.has(activeSection)) return prev
      const next = new Set(prev)
      next.add(activeSection)
      saveExpandedSections(clusterId, next)
      return next
    })
  }, [clusterId, selectedKind, selectedVirtualPage])

  const toggleSection = useCallback(
    (sectionId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(sectionId)) next.delete(sectionId)
        else next.add(sectionId)
        saveExpandedSections(clusterId, next)
        return next
      })
    },
    [clusterId]
  )

  const toggleFavorites = useCallback(() => {
    setFavoritesOpen((open) => !open)
  }, [])

  function isKindActive(kind: ResourceKind): boolean {
    return selectedKind === kind && !selectedVirtualPage
  }

  function isVirtualActive(key: VirtualPageKey): boolean {
    return selectedVirtualPage === key
  }

  function isEntryActive(entry: NavEntry): boolean {
    return entry.type === 'kind' ? isKindActive(entry.kind) : isVirtualActive(entry.key)
  }

  function handleSelectKind(kind: ResourceKind): void {
    onSelect(kind)
  }

  function handleSelectVirtual(key: VirtualPageKey): void {
    onSelectVirtualPage(key)
  }

  function toggleFavorite(kind: ResourceKind): void {
    const next = favoriteKinds.includes(kind)
      ? favoriteKinds.filter((k) => k !== kind)
      : [...favoriteKinds, kind]
    updateResourceTabPrefs(clusterId, { favorites: next })
  }

  function togglePin(kind: ResourceKind): void {
    const next = pinnedKinds.includes(kind)
      ? pinnedKinds.filter((k) => k !== kind)
      : [...pinnedKinds, kind]
    updateResourceTabPrefs(clusterId, { pinned: next })
  }

  function reorderFavorite(from: ResourceKind, to: ResourceKind): void {
    if (from === to) return
    const list = [...favoriteKinds]
    const fromIdx = list.indexOf(from)
    const toIdx = list.indexOf(to)
    if (fromIdx < 0 || toIdx < 0) return
    list.splice(fromIdx, 1)
    list.splice(toIdx, 0, from)
    updateResourceTabPrefs(clusterId, { favorites: list })
  }

  function contextMenuForKind(kind: ResourceKind): MenuProps['items'] {
    const isFavorite = favoriteKinds.includes(kind)
    const isPinned = pinnedKinds.includes(kind)
    return [
      {
        key: 'favorite',
        label: isFavorite ? t('resourceNav.removeFavorite') : t('resourceNav.addFavorite'),
        icon: <Icon icon={Star} variant="detail" fill={isFavorite ? 'currentColor' : 'none'} />
      },
      {
        key: 'pin',
        label: isPinned ? t('resourceNav.unpin') : t('resourceNav.pin'),
        icon: <Icon icon={Pin} variant="detail" />
      }
    ]
  }

  function handleContextAction(kind: ResourceKind, key: string): void {
    if (key === 'favorite') toggleFavorite(kind)
    if (key === 'pin') togglePin(kind)
  }

  const filteredLayout = useMemo(() => {
    const q = search.trim()
    if (!q) return visibleNavLayout

    return visibleNavLayout
      .map((item): NavLayoutItem | null => {
        if (item === 'favorites') {
          const favMatches =
            favoriteKinds.length > 0 &&
            favoriteKinds.some((k) => !hiddenKinds.has(k) && matchesSearch(k, q))
          return favMatches || !q ? item : null
        }
        if (item.type === 'standalone') {
          const label = item.label ?? item.kind
          return matchesSearch(label, q) ? item : null
        }
        const sectionMatches = matchesSearch(resolveSectionTitle(item.id, t), q)
        const matchingEntries = item.entries.filter((entry) =>
          matchesSearch(resolveNavEntryLabel(entry, t), q)
        )
        if (!sectionMatches && matchingEntries.length === 0) return null
        return { ...item, entries: sectionMatches ? item.entries : matchingEntries }
      })
      .filter((item): item is NavLayoutItem => item !== null)
  }, [search, favoriteKinds, prefsTick, visibleNavLayout, hiddenKinds, t])

  const focusableKeys = useMemo(() => {
    const keys: string[] = []
    for (const item of filteredLayout) {
      if (item === 'favorites') {
        for (const kind of favoriteKinds) {
          if (matchesSearch(kind, search)) keys.push(kind)
        }
        continue
      }
      if (item.type === 'standalone') {
        keys.push(item.kind)
        continue
      }
      if (expanded.has(item.id) || search.trim()) {
        for (const entry of item.entries) keys.push(navEntryKey(entry))
      }
    }
    return keys
  }, [filteredLayout, favoriteKinds, expanded, search])

  function onKeyDown(e: React.KeyboardEvent): void {
    if (focusableKeys.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex((i) => (i + 1) % focusableKeys.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex((i) => (i <= 0 ? focusableKeys.length - 1 : i - 1))
    } else if (e.key === 'Enter' && focusIndex >= 0) {
      e.preventDefault()
      const key = focusableKeys[focusIndex]
      if (key in kindIconLucide) handleSelectKind(key as ResourceKind)
      else handleSelectVirtual(key as VirtualPageKey)
    }
  }

  function renderLeaf(
    entry: NavEntry,
    options?: { indent?: boolean; draggable?: boolean; onReorderTarget?: ResourceKind }
  ): React.ReactNode {
    const key = navEntryKey(entry)
    const label = resolveNavEntryLabel(entry, t)
    const active = isEntryActive(entry)
    const focused = focusIndex >= 0 && focusableKeys[focusIndex] === key
    const lucide = entry.type === 'kind' ? kindIconLucide[entry.kind] : virtualPageIcons[entry.key]
    const showPin = entry.type === 'kind' && pinnedKinds.includes(entry.kind)

    const item = (
      <button
        type="button"
        role="menuitem"
        className={`ml-resource-nav-item ml-resource-nav-item--child${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
        onClick={() => (entry.type === 'kind' ? handleSelectKind(entry.kind) : handleSelectVirtual(entry.key))}
        onFocus={() => setFocusIndex(focusableKeys.indexOf(key))}
        tabIndex={focused ? 0 : -1}
      >
        <span className="ml-resource-nav-item-icon ml-resource-nav-item-icon--child">
          <Icon icon={lucide} variant="toolbar" />
        </span>
        <span className="ml-resource-nav-item-label">
          <HighlightText text={label} query={search} />
        </span>
        {showPin && (
          <span className="ml-resource-nav-item-pin" title={t('resourceNav.pinned')}>
            <Icon icon={Pin} variant="micro" />
          </span>
        )}
      </button>
    )

    if (entry.type === 'kind' && options?.draggable) {
      return (
        <Dropdown
          key={key}
          menu={{
            items: contextMenuForKind(entry.kind),
            onClick: ({ key: menuKey }) => handleContextAction(entry.kind, menuKey)
          }}
          trigger={['contextMenu']}
        >
          <div
            className="ml-resource-nav-item-wrap"
            draggable
            onDragStart={() => setDragKind(entry.kind)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragKind && options.onReorderTarget) reorderFavorite(dragKind, options.onReorderTarget)
              setDragKind(null)
            }}
            onDragEnd={() => setDragKind(null)}
          >
            {item}
          </div>
        </Dropdown>
      )
    }

    if (entry.type === 'kind') {
      return (
        <Dropdown
          key={key}
          menu={{
            items: contextMenuForKind(entry.kind),
            onClick: ({ key: menuKey }) => handleContextAction(entry.kind, menuKey)
          }}
          trigger={['contextMenu']}
        >
          <div className="ml-resource-nav-item-wrap">{item}</div>
        </Dropdown>
      )
    }

    return <div key={key} className="ml-resource-nav-item-wrap">{item}</div>
  }

  function renderStandalone(item: Extract<NavLayoutItem, { type: 'standalone' }>): React.ReactNode {
    const label = item.label ?? item.kind
    const active = isKindActive(item.kind)
    const focused = focusIndex >= 0 && focusableKeys[focusIndex] === item.kind

    const button = (
      <button
        type="button"
        role="menuitem"
        className={`ml-resource-nav-item ml-resource-nav-item--parent${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
        onClick={() => handleSelectKind(item.kind)}
        onFocus={() => setFocusIndex(focusableKeys.indexOf(item.kind))}
        tabIndex={focused ? 0 : -1}
      >
        <span className="ml-resource-nav-item-icon">
          <Icon icon={item.icon} variant="default" />
        </span>
        <span className="ml-resource-nav-item-label">
          <HighlightText text={label} query={search} />
        </span>
      </button>
    )

    return (
      <div key={item.kind} className="ml-resource-nav-standalone">
        <Dropdown
          menu={{
            items: contextMenuForKind(item.kind),
            onClick: ({ key: menuKey }) => handleContextAction(item.kind, menuKey)
          }}
          trigger={['contextMenu']}
        >
          <div className="ml-resource-nav-item-wrap">{button}</div>
        </Dropdown>
      </div>
    )
  }

  function renderSection(section: NavCollapsibleSection): React.ReactNode {
    const title = resolveSectionTitle(section.id, t)
    const isOpen = expanded.has(section.id) || !!search.trim()
    const hasActiveChild = section.entries.some((entry) => isEntryActive(entry))
    const sectionMatches = matchesSearch(title, search)
    const visibleEntries =
      search.trim() && !sectionMatches
        ? section.entries.filter((e) => matchesSearch(resolveNavEntryLabel(e, t), search))
        : section.entries

    if (search.trim() && visibleEntries.length === 0 && !sectionMatches) return null

    const head = (
      <button
        type="button"
        className={`ml-resource-nav-group-head${hasActiveChild ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
        onClick={() => toggleSection(section.id)}
        aria-expanded={isOpen}
      >
        <span className="ml-resource-nav-item-icon">
          <Icon icon={section.icon} variant="default" color={hasActiveChild ? '#fff' : undefined} />
        </span>
        <span className="ml-resource-nav-group-title">
          <HighlightText text={title} query={search} />
        </span>
        <Icon
          icon={ChevronDown}
          variant="toolbar"
          className="ml-resource-nav-chevron"
          color={hasActiveChild ? '#fff' : undefined}
        />
      </button>
    )

    return (
      <div key={section.id} className="ml-resource-nav-group">
        {head}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="children"
              className="ml-resource-nav-group-children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ml-resource-nav-group-children-inner">
                {visibleEntries.map((entry) => renderLeaf(entry, { indent: true }))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  function renderFavorites(): React.ReactNode {
    const visibleFavorites = favoriteKinds.filter(
      (k) => !hiddenKinds.has(k) && matchesSearch(k, search)
    )
    if (search.trim() && visibleFavorites.length === 0) return null

    const hasActiveFavorite = visibleFavorites.some((k) => isKindActive(k))
    const isOpen = favoritesOpen || !!search.trim()

    return (
      <div className="ml-resource-nav-group ml-resource-nav-group--favorites">
        <button
          type="button"
          className={`ml-resource-nav-group-head${hasActiveFavorite ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
          onClick={toggleFavorites}
          aria-expanded={isOpen}
        >
          <span className="ml-resource-nav-item-icon">
            <Icon icon={favoritesSectionIcon} variant="default" color={hasActiveFavorite ? '#fff' : 'var(--ml-primary)'} />
          </span>
          <span className="ml-resource-nav-group-title">{t('resourceNav.favorites')}</span>
          <Icon icon={ChevronDown} variant="toolbar" className="ml-resource-nav-chevron" />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="fav-children"
              className="ml-resource-nav-group-children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ml-resource-nav-group-children-inner">
                {visibleFavorites.length === 0 ? (
                  <p className="ml-resource-nav-favorites-empty">{t('resourceNav.emptyFavorites')}</p>
                ) : (
                  visibleFavorites.map((kind) =>
                    renderLeaf({ type: 'kind', kind }, { draggable: true, onReorderTarget: kind })
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  function renderCollapsedFlyout(
    key: string,
    title: string,
    icon: LucideIcon,
    active: boolean,
    entries: NavEntry[],
    onSelectEntry: (entry: NavEntry) => void
  ): React.ReactNode {
    const content = (
      <div className="ml-resource-nav-flyout">
        <div className="ml-resource-nav-flyout-title">{title}</div>
        <div className="ml-resource-nav-flyout-list" role="menu">
          {entries.map((entry) => {
            const entryKey = navEntryKey(entry)
            const label = resolveNavEntryLabel(entry, t)
            const entryActive = isEntryActive(entry)
            const lucide = entry.type === 'kind' ? kindIconLucide[entry.kind] : virtualPageIcons[entry.key]
            return (
              <button
                key={entryKey}
                type="button"
                role="menuitem"
                className={`ml-resource-nav-flyout-item${entryActive ? ' is-active' : ''}`}
                onClick={() => onSelectEntry(entry)}
              >
                <span className="ml-resource-nav-flyout-item-icon">
                  <Icon icon={lucide} variant="toolbar" />
                </span>
                <span className="ml-resource-nav-flyout-item-label">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )

    return (
      <Popover
        key={key}
        content={content}
        trigger={['hover']}
        placement="rightTop"
        arrow={false}
        mouseEnterDelay={0.05}
        mouseLeaveDelay={0.1}
        classNames={{ root: 'ml-resource-nav-flyout-overlay' }}
        destroyOnHidden
      >
        <span className="ml-resource-nav-rail-slot">
          <button
            type="button"
            className={`ml-resource-nav-rail-item${active ? ' is-active' : ''}`}
            aria-label={title}
          >
            <Icon icon={icon} variant="toolbar" />
          </button>
        </span>
      </Popover>
    )
  }

  function renderCollapsedIcon(
    key: string,
    label: string,
    icon: LucideIcon,
    active: boolean,
    onClick: () => void
  ): React.ReactNode {
    return (
      <Tooltip key={key} title={label} placement="right">
        <span className="ml-resource-nav-rail-slot">
          <button
            type="button"
            className={`ml-resource-nav-rail-item${active ? ' is-active' : ''}`}
            onClick={onClick}
            aria-label={label}
          >
            <Icon icon={icon} variant="toolbar" />
          </button>
        </span>
      </Tooltip>
    )
  }

  if (collapsed) {
    return (
      <nav className="ml-resource-nav ml-resource-nav--collapsed" aria-label={t('resourceNav.aria')}>
        {favoriteKinds.filter((k) => !hiddenKinds.has(k)).length > 0 &&
          renderCollapsedFlyout(
            FAVORITES_SECTION_ID,
            t('resourceNav.favorites'),
            favoritesSectionIcon,
            favoriteKinds.some((k) => !hiddenKinds.has(k) && isKindActive(k)),
            favoriteKinds.filter((k) => !hiddenKinds.has(k)).map((kind) => ({ type: 'kind' as const, kind })),
            (entry) => {
              if (entry.type === 'kind') handleSelectKind(entry.kind)
            }
          )}
        {visibleNavLayout.map((item) => {
          if (item === 'favorites') return null
          if (item.type === 'standalone') {
            return renderCollapsedIcon(
              item.kind,
              item.label ?? item.kind,
              item.icon,
              isKindActive(item.kind),
              () => handleSelectKind(item.kind)
            )
          }
          const hasActive = item.entries.some((e) => isEntryActive(e))
          return renderCollapsedFlyout(
            item.id,
            resolveSectionTitle(item.id, t),
            item.icon,
            hasActive,
            item.entries,
            (entry) => {
              if (entry.type === 'kind') handleSelectKind(entry.kind)
              else handleSelectVirtual(entry.key)
            }
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      className="ml-resource-nav"
      aria-label={t('resourceNav.aria')}
      role="menu"
      onKeyDown={onKeyDown}
    >
      <div className="ml-resource-nav-search">
        <Icon icon={Search} variant="toolbar" className="ml-resource-nav-search-icon" />
        <Input
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('resourceNav.search')}
          variant="borderless"
          className="ml-resource-nav-search-input"
          aria-label={t('resourceNav.search')}
        />
      </div>

      <div className="ml-resource-nav-scroll">
        {filteredLayout.map((item) => {
          if (item === 'favorites') return <div key={FAVORITES_SECTION_ID}>{renderFavorites()}</div>
          if (item.type === 'standalone') return renderStandalone(item)
          return renderSection(item)
        })}
      </div>
    </nav>
  )
}
