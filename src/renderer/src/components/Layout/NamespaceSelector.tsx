import { useMemo, useState } from 'react'
import { Button, Checkbox, Dropdown, Empty, Input, Tooltip } from 'antd'
import {
  Check,
  ChevronDown,
  Layers,
  Pin,
  RefreshCw,
  Search,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ALL_NAMESPACES,
  formatNamespaceSelectionLabel,
  isAllNamespaces,
  normalizeNamespaceSelect,
  parseNamespaceSelection,
  serializeNamespaceSelection
} from '@shared/namespaceSelection'
import { mergeClusterSettings } from '@shared/types/clusterSettings'
import { useNamespaces } from '../../queries/useNamespaces'
import { useClusterStore } from '../../stores/clusterStore'
import { Icon } from '../ui/Icon'

interface NamespaceSelectorProps {
  clusterId: string
  value: string
  onChange: (namespace: string) => void
  /** When false, hides the "All namespaces" quick action (e.g. Topology). Default true. */
  allowAllNamespaces?: boolean
}

type NsFilter = 'all' | 'pinned' | 'system' | 'app'

function isSystemNamespace(name: string): boolean {
  return (
    name === 'default' ||
    name === 'kube-system' ||
    name === 'kube-public' ||
    name === 'kube-node-lease' ||
    name.startsWith('kube-')
  )
}

export function NamespaceSelector({
  clusterId,
  value,
  onChange,
  allowAllNamespaces = true
}: NamespaceSelectorProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, refetch, isFetching } = useNamespaces(clusterId)
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))
  const pinned = useMemo(
    () => mergeClusterSettings(cluster?.settings).namespaces.pinned ?? [],
    [cluster?.settings]
  )

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<NsFilter>('all')

  const selected = parseNamespaceSelection(value)
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allSelected = isAllNamespaces(selected)
  const namespaces = data?.namespaces ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pinnedSet = new Set(pinned)
    let list = namespaces.slice()

    if (filter === 'pinned') list = list.filter((ns) => pinnedSet.has(ns))
    else if (filter === 'system') list = list.filter((ns) => isSystemNamespace(ns))
    else if (filter === 'app') list = list.filter((ns) => !isSystemNamespace(ns))

    if (q) list = list.filter((ns) => ns.toLowerCase().includes(q))

    return list.sort((a, b) => {
      const ap = pinnedSet.has(a) ? 0 : 1
      const bp = pinnedSet.has(b) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.localeCompare(b)
    })
  }, [namespaces, pinned, filter, query])

  const pinnedVisible = useMemo(() => {
    if (filter === 'system' || filter === 'app') return []
    const q = query.trim().toLowerCase()
    return pinned.filter((ns) => namespaces.includes(ns) && (!q || ns.toLowerCase().includes(q)))
  }, [pinned, namespaces, filter, query])

  const restVisible = useMemo(() => {
    const pinnedSet = new Set(pinnedVisible)
    return filtered.filter((ns) => !pinnedSet.has(ns))
  }, [filtered, pinnedVisible])

  const triggerLabel = formatNamespaceSelectionLabel(selected, t('common.allNamespaces')) || t('common.selectNamespaces')

  function commit(next: string[]): void {
    const normalized = normalizeNamespaceSelect(selected, next)
    onChange(serializeNamespaceSelection(normalized))
  }

  function toggleNs(ns: string): void {
    if (allSelected) {
      commit([ns])
      return
    }
    if (selectedSet.has(ns)) commit(selected.filter((v) => v !== ns))
    else commit([...selected.filter((v) => v !== ALL_NAMESPACES), ns])
  }

  function selectAll(): void {
    if (!allowAllNamespaces) return
    commit([ALL_NAMESPACES])
  }

  function clearSelection(): void {
    commit([])
  }

  const panel = (
    <div className="ml-ns-panel" onMouseDown={(e) => e.preventDefault()}>
      <div className="ml-ns-panel__search">
        <Input
          allowClear
          autoFocus
          size="middle"
          className="ml-ns-panel__search-input"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('common.namespaceSearch')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <Tooltip title={t('common.refresh')}>
          <Button
            type="text"
            size="small"
            className="ml-ns-panel__icon-btn"
            loading={isFetching}
            icon={<Icon icon={RefreshCw} variant="action" />}
            onClick={() => void refetch()}
            aria-label={t('common.refresh')}
          />
        </Tooltip>
      </div>

      <div className="ml-ns-panel__filters" role="tablist" aria-label={t('common.namespaceFilter')}>
        {(
          [
            ['all', 'common.namespaceFilterAll'],
            ['pinned', 'common.namespaceFilterPinned'],
            ['system', 'common.namespaceFilterSystem'],
            ['app', 'common.namespaceFilterApp']
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`ml-ns-panel__filter${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="ml-ns-panel__quick">
        {allowAllNamespaces ? (
          <button
            type="button"
            className={`ml-ns-panel__quick-btn${allSelected ? ' is-active' : ''}`}
            onClick={selectAll}
          >
            <Icon icon={Layers} variant="micro" />
            {t('common.allNamespaces')}
            {allSelected ? <Icon icon={Check} variant="micro" /> : null}
          </button>
        ) : null}
        <button
          type="button"
          className="ml-ns-panel__quick-btn"
          onClick={clearSelection}
          disabled={selected.length === 0}
        >
          <Icon icon={X} variant="micro" />
          {t('common.clear')}
        </button>
      </div>

      <div className="ml-ns-panel__list">
        {isLoading && namespaces.length === 0 ? (
          <div className="ml-ns-panel__empty">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={query ? t('common.namespaceNoMatch') : t('common.namespaceEmpty')}
          />
        ) : (
          <>
            {pinnedVisible.length > 0 ? (
              <div className="ml-ns-panel__group">
                <div className="ml-ns-panel__group-label">
                  <Icon icon={Pin} variant="micro" />
                  {t('common.namespacePinned')}
                </div>
                {pinnedVisible.map((ns) => (
                  <NamespaceRow
                    key={`pin-${ns}`}
                    name={ns}
                    checked={!allSelected && selectedSet.has(ns)}
                    pinned
                    onToggle={() => toggleNs(ns)}
                  />
                ))}
              </div>
            ) : null}

            {restVisible.length > 0 ? (
              <div className="ml-ns-panel__group">
                {pinnedVisible.length > 0 ? (
                  <div className="ml-ns-panel__group-label">{t('common.namespaceOther')}</div>
                ) : null}
                {restVisible.map((ns) => (
                  <NamespaceRow
                    key={ns}
                    name={ns}
                    checked={!allSelected && selectedSet.has(ns)}
                    pinned={pinned.includes(ns)}
                    system={isSystemNamespace(ns)}
                    onToggle={() => toggleNs(ns)}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="ml-ns-panel__footer">
        <span>
          {allSelected
            ? t('common.allNamespaces')
            : selected.length === 0
              ? t('common.selectNamespaces')
              : t('common.namespacesSelected', { count: selected.length })}
        </span>
        <span className="ml-ns-panel__footer-meta">
          {t('common.namespaceCount', { count: namespaces.length })}
        </span>
      </div>
    </div>
  )

  return (
    <div className="ml-namespace-selector">
      <Dropdown
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setQuery('')
            void refetch()
          }
        }}
        trigger={['click']}
        placement="bottomRight"
        autoAdjustOverflow
        rootClassName="ml-ns-dropdown"
        getPopupContainer={(trigger) => {
          const clusterArea =
            trigger.closest('.ml-workspace-content-inner') ??
            trigger.closest('.ml-workspace-main') ??
            trigger.closest('.ml-topo-page') ??
            trigger.closest('.ml-workspace-header-inner')
          return clusterArea instanceof HTMLElement
            ? clusterArea
            : (trigger.parentElement ?? document.body)
        }}
        popupRender={() => panel}
      >
        <button
          type="button"
          className={`ml-ns-trigger${open ? ' is-open' : ''}${allSelected ? ' is-all' : ''}${selected.length > 0 && !allSelected ? ' has-selection' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('common.selectNamespaces')}
        >
          <span className="ml-ns-trigger__icon">
            <Icon icon={Layers} variant="action" />
          </span>
          <span className="ml-ns-trigger__text">
            <span className="ml-ns-trigger__eyebrow">{t('common.namespace')}</span>
            <span className="ml-ns-trigger__value" title={triggerLabel}>
              {triggerLabel}
            </span>
          </span>
          {!allSelected && selected.length > 1 ? (
            <span className="ml-ns-trigger__badge">{selected.length}</span>
          ) : null}
          <span className="ml-ns-trigger__chevron">
            <Icon icon={ChevronDown} variant="micro" />
          </span>
        </button>
      </Dropdown>
    </div>
  )
}

function NamespaceRow({
  name,
  checked,
  pinned,
  system,
  onToggle
}: {
  name: string
  checked: boolean
  pinned?: boolean
  system?: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`ml-ns-row${checked ? ' is-checked' : ''}`}
      onClick={onToggle}
    >
      <Checkbox checked={checked} tabIndex={-1} style={{ pointerEvents: 'none' }} />
      <span className="ml-ns-row__name">{name}</span>
      {pinned ? (
        <span className="ml-ns-row__tag ml-ns-row__tag--pin">
          <Icon icon={Pin} variant="micro" />
        </span>
      ) : null}
      {system ? <span className="ml-ns-row__tag">sys</span> : null}
    </button>
  )
}
