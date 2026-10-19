import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, Input, Modal, Spin, Typography } from 'antd'
import type { InputRef } from 'antd'
import { Bell, Box, Cloud, FileText, HardDrive, Layers, Lock, Rocket, Search, Share2, ShieldAlert, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import type { ResourceKind } from '@shared/resourceKinds'
import {
  GLOBAL_SEARCH_TYPE_KEYWORDS,
  GLOBAL_SEARCH_TYPE_LABELS,
  matchesSearchText,
  parseGlobalSearchQuery
} from '@shared/globalSearchKeywords'
import { searchSecurityRuleBook } from '@shared/securityCatalog'
import { GLOBAL_SEARCH_TYPES, type GlobalSearchGroup, type GlobalSearchResult, type GlobalSearchType } from '@shared/types/search'
import { HighlightText } from '../ClusterTabs/ClusterSearchInput'
import { matchesSearch } from '../../clusterFilter'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { useSearchSettingsStore } from '../../stores/searchSettingsStore'
import { useNotesStore } from '../../stores/notesStore'
import { useSecurityStore } from '../../stores/securityStore'
import { shortcutParts } from '@shared/types/keyboardShortcuts'
import { kindIcons } from '../../resourceConfig/kinds.renderer'

const FLAT_ITEM_ATTR = 'data-global-search-index'
const LOCAL_SEARCH_TYPES = new Set<GlobalSearchType>(['clusters', 'sparks', 'security'])

/** Prefer the leaf name for long ARNs / paths so result rows stay scannable. */
function shortDisplayName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name
  const slash = trimmed.lastIndexOf('/')
  if (slash >= 0 && slash < trimmed.length - 1) {
    const leaf = trimmed.slice(slash + 1)
    if (leaf.length >= 3) return leaf
  }
  return trimmed
}

function statusTone(status: string): 'ok' | 'warn' | 'err' | 'idle' {
  const s = status.toLowerCase()
  if (/(connected|ready|running|active|deployed|healthy|pass)/.test(s)) return 'ok'
  if (/(connecting|pending|progress|warning|degraded)/.test(s)) return 'warn'
  if (/(error|fail|denied|critical|crash|offline|disconnected)/.test(s)) return 'err'
  return 'idle'
}

function sparkSnippet(body: string, query: string): string | undefined {
  const plain = body.replace(/\s+/g, ' ').trim()
  if (!plain) return undefined
  const needle = query.trim().toLowerCase()
  if (!needle) return plain.slice(0, 120)
  const idx = plain.toLowerCase().indexOf(needle)
  if (idx < 0) return plain.slice(0, 120)
  const start = Math.max(0, idx - 28)
  const end = Math.min(plain.length, idx + needle.length + 72)
  return `${start > 0 ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`
}

function mergeSearchGroups(groups: GlobalSearchGroup[], limit: number): GlobalSearchGroup[] {
  const byType = new Map<GlobalSearchType, GlobalSearchResult[]>()
  const labels = new Map<GlobalSearchType, string>()
  for (const group of groups) {
    labels.set(group.type, group.label)
    const current = byType.get(group.type) ?? []
    for (const result of group.results) {
      if (current.length >= limit) break
      const key = resultKey(result)
      if (current.some((item) => resultKey(item) === key)) continue
      current.push(result)
    }
    byType.set(group.type, current)
  }
  return [...byType.entries()]
    .filter(([, results]) => results.length > 0)
    .map(([type, results]) => ({ type, label: labels.get(type) || type, results }))
}

function resultKey(result: GlobalSearchResult): string {
  switch (result.type) {
    case 'cluster':
      return `cluster:${result.clusterId}`
    case 'spark':
      return `spark:${result.noteId}`
    case 'security':
      return `security:${result.kind}:${result.findingId ?? result.ruleId}:${result.clusterId}`
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
    case 'sparks':
      return <Icon icon={Sparkles} variant="detail" />
    case 'security':
      return <Icon icon={ShieldAlert} variant="detail" />
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
  const { t } = useTranslation()
  const open = useGlobalSearchStore((s) => s.open)
  const closeSearch = useGlobalSearchStore((s) => s.closeSearch)
  const query = useGlobalSearchStore((s) => s.query)
  const setQuery = useGlobalSearchStore((s) => s.setQuery)
  const typeFilter = useGlobalSearchStore((s) => s.typeFilter)
  const toggleTypeFilter = useGlobalSearchStore((s) => s.toggleTypeFilter)
  const enabledTypes = useSearchSettingsStore((s) => s.enabledTypes)
  const limitPerType = useSearchSettingsStore((s) => s.limitPerType)
  const searchAllConnected = useSearchSettingsStore((s) => s.searchAllConnected)
  const recent = useSearchSettingsStore((s) => s.recent)
  const pushRecent = useSearchSettingsStore((s) => s.pushRecent)
  const enabledSet = useMemo(() => new Set(enabledTypes), [enabledTypes])
  const searchShortcut = useDisplaySettingsStore((s) => s.keyboardShortcuts.globalSearch)
  const isMac = navigator.platform.includes('Mac')
  const searchShortcutParts = shortcutParts(searchShortcut, isMac)

  const clusters = useClusterStore((s) => s.clusters)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const navigateToHelmRelease = useClusterStore((s) => s.navigateToHelmRelease)
  const navigateToDynamicResource = useClusterStore((s) => s.navigateToDynamicResource)
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const openVirtualPage = useClusterStore((s) => s.openVirtualPage)
  const notes = useNotesStore((s) => s.notes)
  const selectNote = useNotesStore((s) => s.selectNote)
  const setWorkspacePanel = useNotesStore((s) => s.setWorkspacePanel)
  const reportsByCluster = useSecurityStore((s) => s.reportsByCluster)
  const focusFinding = useSecurityStore((s) => s.focusFinding)
  const focusRule = useSecurityStore((s) => s.focusRule)

  const [apiGroups, setApiGroups] = useState<GlobalSearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<InputRef>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => parseGlobalSearchQuery(query, typeFilter), [query, typeFilter])

  const searchTypes = useMemo(() => {
    const source = parsed.types ?? (typeFilter ? [typeFilter] : GLOBAL_SEARCH_TYPES)
    return source.filter((type) => enabledSet.has(type) && !LOCAL_SEARCH_TYPES.has(type))
  }, [enabledSet, parsed.types, typeFilter])

  const includeClusters =
    enabledSet.has('clusters') &&
    (!typeFilter || typeFilter === 'clusters' || parsed.types?.includes('clusters') || !parsed.types)

  const includeSparks =
    enabledSet.has('sparks') &&
    (!typeFilter || typeFilter === 'sparks' || parsed.types?.includes('sparks') || !parsed.types)

  const includeSecurity =
    enabledSet.has('security') &&
    (!typeFilter || typeFilter === 'security' || parsed.types?.includes('security') || !parsed.types)

  const clusterGroups = useMemo((): GlobalSearchGroup[] => {
    if (!includeClusters || (parsed.types && !parsed.types.includes('clusters'))) return []
    const text = parsed.text
    const results: GlobalSearchResult[] = clusters
      .filter((c) => matchesSearch(c, text))
      .slice(0, limitPerType)
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
  }, [clusters, includeClusters, limitPerType, parsed.text, parsed.types])

  const sparkGroups = useMemo((): GlobalSearchGroup[] => {
    if (!includeSparks || (parsed.types && !parsed.types.includes('sparks'))) return []
    const text = parsed.text.trim()
    if (!text && typeFilter !== 'sparks' && !parsed.types?.includes('sparks')) return []
    const results: GlobalSearchResult[] = []
    for (const note of notes) {
      const hay = `${note.title}\n${note.body}\n${note.folder}\n${note.path}\n${note.tags.join(' ')}`
      if (!matchesSearchText(hay, text)) continue
      results.push({
        type: 'spark',
        noteId: note.id,
        title: note.title,
        folder: note.folder,
        path: note.path,
        snippet: sparkSnippet(note.body, text)
      })
      if (results.length >= limitPerType) break
    }
    return results.length > 0
      ? [{ type: 'sparks' as const, label: GLOBAL_SEARCH_TYPE_LABELS.sparks, results }]
      : []
  }, [includeSparks, limitPerType, notes, parsed.text, parsed.types, typeFilter])

  const securityGroups = useMemo((): GlobalSearchGroup[] => {
    if (!includeSecurity || (parsed.types && !parsed.types.includes('security'))) return []
    const text = parsed.text.trim()
    if (!text && typeFilter !== 'security' && !parsed.types?.includes('security')) return []

    const results: GlobalSearchResult[] = []
    const cluster =
      (activeClusterId && clusters.find((c) => c.id === activeClusterId)) ||
      clusters.find((c) => c.status === 'connected') ||
      clusters[0]
    const clusterId = cluster?.id ?? ''
    const clusterName = cluster?.customName || cluster?.contextName || clusterId || '—'

    const report = clusterId ? reportsByCluster[clusterId] : undefined
    if (report) {
      for (const v of report.vulnerabilities) {
        const hay = [
          v.id,
          v.rule,
          v.title,
          v.workload,
          v.namespace,
          v.description,
          v.recommendation,
          v.severity,
          v.source
        ].join(' ')
        if (!matchesSearchText(hay, text)) continue
        results.push({
          type: 'security',
          clusterId,
          clusterName,
          findingId: v.id,
          ruleId: v.rule,
          title: v.title,
          severity: v.severity,
          namespace: v.namespace,
          workload: v.workload,
          kind: 'finding',
          snippet: `${v.severity} · ${v.rule} · ${v.namespace}/${v.workload}`
        })
        if (results.length >= limitPerType) break
      }
    }

    if (results.length < limitPerType) {
      for (const rule of searchSecurityRuleBook(text)) {
        if (results.some((r) => r.type === 'security' && r.kind === 'rule' && r.ruleId === rule.id)) {
          continue
        }
        results.push({
          type: 'security',
          clusterId,
          clusterName,
          ruleId: rule.id,
          title: rule.title,
          severity: rule.severity,
          kind: 'rule',
          snippet: `${rule.id} · ${rule.summary}`
        })
        if (results.length >= limitPerType) break
      }
    }

    return results.length > 0
      ? [{ type: 'security' as const, label: GLOBAL_SEARCH_TYPE_LABELS.security, results }]
      : []
  }, [
    activeClusterId,
    clusters,
    includeSecurity,
    parsed.text,
    parsed.types,
    limitPerType,
    reportsByCluster,
    typeFilter
  ])

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

    const targets = searchAllConnected
      ? clusters.filter((cluster) => cluster.status === 'connected').slice(0, 6)
      : targetCluster
        ? [targetCluster]
        : []

    if (targets.length === 0 || searchTypes.length === 0) {
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
      void Promise.all(
        targets.map((cluster) =>
          window.api.search.resources({
            clusterId: cluster.id,
            clusterName: cluster.customName,
            query: parsed.text,
            types: searchTypes,
            limitPerType
          })
        )
      )
        .then((responses) => {
          if (cancelled) return
          const groups: GlobalSearchGroup[] = []
          const errors: string[] = []
          for (const res of responses) {
            if ('error' in res) errors.push(res.error)
            else groups.push(...res.groups)
          }
          setError(groups.length === 0 && errors[0] ? errors[0] : null)
          setApiGroups(mergeSearchGroups(groups, limitPerType))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [clusters, limitPerType, open, parsed.text, searchAllConnected, searchTypes, targetCluster, typeFilter])

  const allGroups = useMemo(
    () => [...clusterGroups, ...sparkGroups, ...securityGroups, ...apiGroups],
    [clusterGroups, sparkGroups, securityGroups, apiGroups]
  )

  const flatResults = useMemo(() => allGroups.flatMap((g) => g.results), [allGroups])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, typeFilter, flatResults.length])

  const executeResult = useCallback(
    (result: GlobalSearchResult): void => {
      pushRecent(parsed.text)
      closeSearch()
      switch (result.type) {
        case 'cluster':
          openClusterTab(result.clusterId)
          break
        case 'spark':
          setActiveView('notes')
          setWorkspacePanel('editor')
          selectNote(result.noteId)
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
        case 'security':
          if (result.clusterId) openClusterTab(result.clusterId)
          if (result.kind === 'finding' && result.findingId) focusFinding(result.findingId)
          else focusRule(result.ruleId)
          if (result.clusterId) openVirtualPage(result.clusterId, 'security')
          break
      }
    },
    [
      closeSearch,
      focusFinding,
      focusRule,
      navigateToDynamicResource,
      navigateToHelmRelease,
      navigateToResource,
      openClusterTab,
      openResourceKind,
      openVirtualPage,
      parsed.text,
      pushRecent,
      selectNote,
      setActiveView,
      setSelectedNamespace,
      setWorkspacePanel
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
      width={720}
      destroyOnHidden
      className="global-search-modal"
      styles={{ body: { padding: 0 } }}
      closable={false}
    >
      <div className="global-search-header">
        <Input
          ref={inputRef}
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          variant="borderless"
          size="large"
          allowClear
        />
      </div>

      <div className="global-search-filters" role="listbox" aria-label={t('search.filterAria')}>
        {GLOBAL_SEARCH_TYPES.filter((type) => enabledSet.has(type)).map((type) => {
          const active = typeFilter === type
          const primaryKw = GLOBAL_SEARCH_TYPE_KEYWORDS[type][0]
          return (
            <button
              key={type}
              type="button"
              role="option"
              aria-selected={active}
              className={`global-search-filter-chip${active ? ' is-active' : ''}`}
              onClick={() => toggleTypeFilter(type)}
              title={`${GLOBAL_SEARCH_TYPE_LABELS[type]} — ${primaryKw}:`}
            >
              {GLOBAL_SEARCH_TYPE_LABELS[type]}
            </button>
          )
        })}
      </div>

      <div className="global-search-body" ref={listRef}>
        {loading && (
          <div className="global-search-loading">
            <Spin size="small" /> {t('search.searching')}
          </div>
        )}

        {error && (
          <Typography.Text type="danger" className="global-search-error">
            {error}
          </Typography.Text>
        )}

        {showHint && (
          <div className="global-search-hint">
            <p className="global-search-hint__lead">{t('search.typeHint')}</p>
            <p className="global-search-hint__examples">
              <code>pod:nginx</code>
              <code>@deploy api</code>
              <code>spark:todo</code>
            </p>
            {recent.length > 0 ? (
              <div className="global-search-recent">
                <span className="global-search-recent__label">{t('search.recentHint')}</span>
                {recent.map((item) => (
                  <button key={item} type="button" className="global-search-filter-chip" onClick={() => setQuery(item)}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
            {targetCluster ? (
              <p className="global-search-hint__meta">
                {t('search.searchingIn', { cluster: shortDisplayName(targetCluster.customName) })}
              </p>
            ) : (
              <p className="global-search-hint__meta global-search-hint__meta--warn">
                {t('search.connectHint')}
              </p>
            )}
          </div>
        )}

        {showEmpty && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('search.noResults')} className="global-search-empty" />
        )}

        {allGroups.map((group) => {
          let offset = 0
          for (const g of allGroups) {
            if (g === group) break
            offset += g.results.length
          }

          return (
            <div key={group.type} className="global-search-group">
              <div className="global-search-group-title">
                <span>{group.label}</span>
                <span className="global-search-group-title__count">{group.results.length}</span>
              </div>
              {group.results.map((result, i) => {
                const index = offset + i
                const active = index === activeIndex
                return (
                  <button
                    key={resultKey(result)}
                    type="button"
                    className={`global-search-item${active ? ' is-active' : ''}`}
                    {...{ [FLAT_ITEM_ATTR]: index }}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => executeResult(result)}
                  >
                    <ResultRow
                      result={result}
                      query={parsed.text}
                      icon={result.type === 'builtin' ? builtinIcon(result.kind) : groupIcon(group.type)}
                    />
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="global-search-footer">
        <span className="global-search-footer__hint">{t('search.hint')}</span>
        <span className="global-search-footer__shortcut">
          {searchShortcutParts.map((part, i) => (
            <span key={`${part}-${i}`} className="global-search-footer__key-wrap">
              {i > 0 && !isMac ? <span className="global-search-footer__plus">+</span> : null}
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
    case 'cluster': {
      const title = shortDisplayName(result.clusterName)
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title" title={result.clusterName}>
              <HighlightText text={title} query={query} />
            </span>
            <span className="global-search-item-sub" title={result.contextName}>
              {result.contextName !== title ? `${result.contextName} · ` : null}
              <span className={`global-search-status global-search-status--${statusTone(result.status)}`}>
                {result.status}
              </span>
            </span>
          </span>
        </>
      )
    }
    case 'spark':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.title} query={query} />
            </span>
            <span className="global-search-item-sub">
              {[result.folder, result.snippet ?? result.path].filter(Boolean).join(' · ')}
            </span>
          </span>
        </>
      )
    case 'builtin':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.name} query={query} />
            </span>
            <span className="global-search-item-sub">
              {[result.namespace, result.kind, result.subtitle].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="global-search-item-meta" title={result.clusterName}>
            {shortDisplayName(result.clusterName)}
          </span>
        </>
      )
    case 'helm-release':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.name} query={query} />
            </span>
            <span className="global-search-item-sub">
              {result.namespace} · {result.chartName} ·{' '}
              <span className={`global-search-status global-search-status--${statusTone(result.status)}`}>
                {result.status}
              </span>
            </span>
          </span>
        </>
      )
    case 'crd':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.name} query={query} />
            </span>
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
            <span className="global-search-item-title">
              <HighlightText text={result.name} query={query} />
            </span>
            <span className="global-search-item-sub">
              {[result.namespace, result.kind, result.apiVersion].filter(Boolean).join(' · ')}
            </span>
          </span>
        </>
      )
    case 'event':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.reason} query={query} />
            </span>
            <span className="global-search-item-sub">
              {[
                result.involvedObjectKind,
                result.namespace,
                result.involvedObjectName ?? result.name,
                result.message.slice(0, 100)
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </>
      )
    case 'security':
      return (
        <>
          <span className="global-search-item-icon">{icon}</span>
          <span className="global-search-item-main">
            <span className="global-search-item-title">
              <HighlightText text={result.title} query={query} />
            </span>
            <span className="global-search-item-sub">
              {result.kind === 'finding' ? (
                <>
                  <span className={`global-search-status global-search-status--${statusTone(result.severity)}`}>
                    {result.severity}
                  </span>
                  {' · '}
                  {[result.ruleId, result.namespace, result.workload].filter(Boolean).join(' · ')}
                </>
              ) : (
                [result.ruleId, result.snippet].filter(Boolean).join(' · ')
              )}
            </span>
          </span>
          {result.kind === 'finding' ? (
            <span className="global-search-item-meta" title={result.clusterName}>
              {shortDisplayName(result.clusterName)}
            </span>
          ) : null}
        </>
      )
  }
}
