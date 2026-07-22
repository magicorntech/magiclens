import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Input, Modal, Spin, Tag, Typography } from 'antd'
import type { InputRef } from 'antd'
import { Bell, Box, Cloud, FileText, HardDrive, Layers, Lock, Rocket, Search, Share2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ResourceKind } from '@shared/resourceKinds'
import {
  GLOBAL_SEARCH_TYPE_KEYWORDS,
  GLOBAL_SEARCH_TYPE_LABELS,
  matchesSearchText,
  parseGlobalSearchQuery
} from '@shared/globalSearchKeywords'
import { GLOBAL_SEARCH_TYPES, type GlobalSearchGroup, type GlobalSearchResult, type GlobalSearchType } from '@shared/types/search'
import { HighlightText } from '../ClusterTabs/ClusterSearchInput'
import { matchesSearch } from '../../clusterFilter'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { shortcutParts } from '@shared/types/keyboardShortcuts'
import { kindIcons } from '../../resourceConfig/kinds.renderer'

const FLAT_ITEM_ATTR = 'data-global-search-index'

function resultKey(result: GlobalSearchResult): string {
  switch (result.type) {
    case 'cluster':
      return `cluster:${result.clusterId}`
    case 'builtin':
      return `builtin:${result.clusterId}:${result.kind}:${result.namespace}:${result.name}`
    case 'helm-release':
      return `helm:${result.clusterId}:${result.namespace}:${result.name}`
    case 'crd':
      return `crd:${result.clusterId}:${result.name}`
    case 'custom-resource':
      return `cr:${result.clusterId}:${result.apiVersion}:${result.kind}:${result.namespace}:${result.name}`
    case 'event':
      return `event:${result.clusterId}:${result.namespace}:${result.name}`
  }
}

function groupIcon(type: GlobalSearchType): React.ReactNode {
  switch (type) {
    case 'clusters':
      return <Icon icon={Cloud} variant="detail" />
    case 'namespaces':
      return <Icon icon={Layers} variant="detail" />
    case 'pods':
      return <Icon icon={Box} variant="detail" />
    case 'deployments':
      return <Icon icon={Layers} variant="detail" />
    case 'services':
      return <Icon icon={Share2} variant="detail" />
    case 'configmaps':
      return <Icon icon={FileText} variant="detail" />
    case 'secrets':
      return <Icon icon={Lock} variant="detail" />
    case 'pvc':
    case 'pv':
      return <Icon icon={HardDrive} variant="detail" />
    case 'events':
      return <Icon icon={Bell} variant="detail" />
    case 'helm-releases':
      return <Icon icon={Rocket} variant="detail" />
    case 'crds':
    case 'custom-resources':
      return <Icon icon={Layers} variant="detail" />
    default:
      return <Icon icon={Search} variant="detail" />
  }
}

function builtinIcon(kind: ResourceKind): React.ReactNode {
  const KindIcon = kindIcons[kind]
  return KindIcon ? <KindIcon /> : <Icon icon={Search} variant="detail" />
}

export function GlobalSearchModal(): React.JSX.Element {
  const open = useGlobalSearchStore((s) => s.open)
  const closeSearch = useGlobalSearchStore((s) => s.closeSearch)
  const query = useGlobalSearchStore((s) => s.query)
  const setQuery = useGlobalSearchStore((s) => s.setQuery)
  const typeFilter = useGlobalSearchStore((s) => s.typeFilter)
  const toggleTypeFilter = useGlobalSearchStore((s) => s.toggleTypeFilter)
  const searchShortcut = useDisplaySettingsStore((s) => s.keyboardShortcuts.globalSearch)
  const isMac = navigator.platform.includes('Mac')
  const searchShortcutParts = shortcutParts(searchShortcut, isMac)

  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const navigateToHelmRelease = useClusterStore((s) => s.navigateToHelmRelease)
  const navigateToDynamicResource = useClusterStore((s) => s.navigateToDynamicResource)
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)

  const [apiGroups, setApiGroups] = useState<GlobalSearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<InputRef>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => parseGlobalSearchQuery(query, typeFilter), [query, typeFilter])

  const searchTypes = useMemo(() => {
    if (parsed.types) return parsed.types.filter((t) => t !== 'clusters')
    if (typeFilter) return [typeFilter].filter((t) => t !== 'clusters')
    return GLOBAL_SEARCH_TYPES.filter((t) => t !== 'clusters')
  }, [parsed.types, typeFilter])

  const includeClusters = !typeFilter || typeFilter === 'clusters' || parsed.types?.includes('clusters') || !parsed.types

  const clusterGroups = useMemo((): GlobalSearchGroup[] => {
    if (!includeClusters || (parsed.types && !parsed.types.includes('clusters'))) return []
    const text = parsed.text
    const results: GlobalSearchResult[] = clusters
      .filter((c) => matchesSearch(c, text))
      .slice(0, 15)
      .map((c) => ({
        type: 'cluster' as const,
        clusterId: c.id,
        clusterName: c.customName,
        contextName: c.contextName,
        status: c.status
      }))
    return results.length > 0
      ? [{ type: 'clusters' as const, label: GLOBAL_SEARCH_TYPE_LABELS.clusters, results }]
      : []
  }, [clusters, includeClusters, parsed.text, parsed.types])

  const targetCluster = useMemo(() => {
    const connected = clusters.filter((c) => c.status === 'connected')
    if (activeClusterId) {
      const active = connected.find((c) => c.id === activeClusterId)
      if (active) return active
    }
    return connected[0] ?? null
  }, [clusters, activeClusterId])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) {
      setApiGroups([])
      setError(null)
      return
    }

    if (!targetCluster || searchTypes.length === 0) {
      setApiGroups([])
      return
    }

    if (!parsed.text.trim() && !typeFilter) {
      setApiGroups([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void window.api.search
        .resources({
          clusterId: targetCluster.id,
          clusterName: targetCluster.customName,
          query: parsed.text,
          types: searchTypes,
          limitPerType: 15
        })
        .then((res) => {
          if (cancelled) return
          if ('error' in res) {
            setError(res.error)
            setApiGroups([])
          } else {
            setApiGroups(res.groups)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, targetCluster, parsed.text, searchTypes])

  const allGroups = useMemo(() => [...clusterGroups, ...apiGroups], [clusterGroups, apiGroups])

  const flatResults = useMemo(() => allGroups.flatMap((g) => g.results), [allGroups])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, typeFilter, flatResults.length])

  const executeResult = useCallback(
    (result: GlobalSearchResult): void => {
      closeSearch()
      switch (result.type) {
        case 'cluster':
          openClusterTab(result.clusterId)
          break
        case 'builtin':
          if (result.kind === 'Namespaces') {
            openClusterTab(result.clusterId)
            setSelectedNamespace(result.clusterId, result.name)
            openResourceKind(result.clusterId, 'Namespaces')
          } else {
            navigateToResource(result.clusterId, {
              kind: result.kind,
              namespace: result.namespace,
              name: result.name
            })
          }
          break
        case 'helm-release':
          navigateToHelmRelease(result.clusterId, result.namespace, result.name)
          break
        case 'crd':
          openClusterTab(result.clusterId)
          openResourceKind(result.clusterId, 'CustomResourceDefinitions')
          break
        case 'custom-resource':
          navigateToDynamicResource(result.clusterId, {
            apiVersion: result.apiVersion,
            kind: result.kind,
            plural: result.plural,
            namespace: result.namespace,
            name: result.name,
            namespaced: result.namespaced
          })
          break
        case 'event':
          navigateToResource(result.clusterId, {
            kind: 'Events',
            namespace: result.namespace,
            name: result.name
          })
          break
      }
    },
    [
      closeSearch,
      navigateToDynamicResource,
      navigateToHelmRelease,
      navigateToResource,
      openClusterTab,
      openResourceKind,
      setSelectedNamespace
    ]
  )

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatResults.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault()
      executeResult(flatResults[activeIndex])
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[${FLAT_ITEM_ATTR}="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const showEmpty = !loading && flatResults.length === 0 && query.trim().length > 0
  const showHint = !loading && flatResults.length === 0 && query.trim().length === 0

  return (
    <Modal
      title={null}
      open={open}
      onCancel={closeSearch}
      footer={null}
      width={640}
      destroyOnHidden
      className="global-search-modal"
      styles={{ body: { padding: 0 } }}
      closable={false}
    >
      <div className="global-search-header">
        <Input
          ref={inputRef}
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder="Search clusters, pods, deployments, helm…  Try pod:nginx or @deploy api"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          variant="borderless"
          size="large"
          allowClear
        />
      </div>

      <div className="global-search-filters">
        {GLOBAL_SEARCH_TYPES.map((type) => {
          const keywords = GLOBAL_SEARCH_TYPE_KEYWORDS[type].slice(0, 2).join(', ')
          return (
            <Tag
              key={type}
              className="global-search-filter-tag"
              color={typeFilter === type ? 'blue' : 'default'}
              onClick={() => toggleTypeFilter(type)}
              style={{ cursor: 'pointer', margin: 0 }}
            >
              {GLOBAL_SEARCH_TYPE_LABELS[type]}
              <span className="global-search-filter-hint">{keywords}</span>
            </Tag>
          )
        })}
      </div>

      <div className="global-search-body" ref={listRef}>
        {loading && (
          <div className="global-search-loading">
            <Spin size="small" /> Searching…
          </div>
        )}

        {error && (
          <Typography.Text type="danger" style={{ display: 'block', padding: 12 }}>
            {error}
          </Typography.Text>
        )}

        {showHint && (
          <div className="global-search-hint">
            <Typography.Text type="secondary">
              Type to search. Use keywords like <code>pod:nginx</code>, <code>@deploy api</code>, or click a type
              filter above.
            </Typography.Text>
            {targetCluster ? (
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Searching resources in: <strong>{targetCluster.customName}</strong>
              </Typography.Text>
            ) : (
              <Typography.Text type="warning" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Connect a cluster to search Kubernetes resources.
              </Typography.Text>
            )}
          </div>
        )}

        {showEmpty && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No results" style={{ margin: 24 }} />}

        {allGroups.map((group) => {
          let offset = 0
          for (const g of allGroups) {
            if (g === group) break
            offset += g.results.length
          }

          return (
            <div key={group.type} className="global-search-group">
              <div className="global-search-group-title">
                {groupIcon(group.type)}
                <span>{group.label}</span>
                <Tag style={{ marginLeft: 'auto' }}>{group.results.length}</Tag>
              </div>
              {group.results.map((result, i) => {
                const index = offset + i
                const active = index === activeIndex
                return (
                  <button
                    key={resultKey(result)}
                    type="button"
                    className={`global-search-item${active ? ' active' : ''}`}
                    {...{ [FLAT_ITEM_ATTR]: index }}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => executeResult(result)}
                  >
                    <ResultRow result={result} query={parsed.text} icon={result.type === 'builtin' ? builtinIcon(result.kind) : groupIcon(group.type)} />
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="global-search-footer">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>Enter</kbd> open
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {searchShortcutParts.map((part, i) => (
            <span key={`${part}-${i}`}>
              {i > 0 && !isMac ? '+' : null}
              <kbd>{part}</kbd>
            </span>
          ))}
        </span>
      </div>
    </Modal>
  )
}

function ResultRow({
  result,
  query,
  icon
}: {
  result: GlobalSearchResult
  query: string
  icon: React.ReactNode
}): React.JSX.Element {
  switch (result.type) {
    case 'cluster':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.clusterName} query={query} />
            <span className="global-search-item-sub">
              {result.contextName} · {result.status}
            </span>
          </span>
        </>
      )
    case 'builtin':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.name} query={query} />
            <span className="global-search-item-sub">
              {result.namespace ? `${result.namespace} · ` : ''}
              {result.kind}
              {result.subtitle ? ` · ${result.subtitle}` : ''}
            </span>
          </span>
          <span className="global-search-item-meta">{result.clusterName}</span>
        </>
      )
    case 'helm-release':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.name} query={query} />
            <span className="global-search-item-sub">
              {result.namespace} · {result.chartName} · {result.status}
            </span>
          </span>
        </>
      )
    case 'crd':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.name} query={query} />
            <span className="global-search-item-sub">
              {result.kind} · {result.group}
            </span>
          </span>
        </>
      )
    case 'custom-resource':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.name} query={query} />
            <span className="global-search-item-sub">
              {result.namespace ? `${result.namespace} · ` : ''}
              {result.kind}
            </span>
          </span>
        </>
      )
    case 'event':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <HighlightText text={result.reason} query={query} />
            <span className="global-search-item-sub">
              {matchesSearchText(result.message, query) ? (
                <HighlightText text={result.message.slice(0, 120)} query={query} />
              ) : (
                result.message.slice(0, 120)
              )}
            </span>
          </span>
        </>
      )
  }
}
