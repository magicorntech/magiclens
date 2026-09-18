import { useMemo, useState } from 'react'
import { Button, Empty, Input, Select, Spin, Tooltip } from 'antd'
import { ChevronDown, ChevronRight, RefreshCw, Search, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceFocus } from '@shared/types/navigation'
import type { ResourceEventItem } from '@shared/types/resourceEvents'
import { k8sKindToResourceKind } from '@shared/k8sKindMap'
import { ALL_NAMESPACES, parseNamespaceSelection } from '@shared/namespaceSelection'
import { Icon } from '../ui/Icon'
import { useClusterEvents } from '../../queries/useClusterEvents'
import { useNamespaces } from '../../queries/useNamespaces'
import { useClusterStore } from '../../stores/clusterStore'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import {
  TIMELINE_RANGES,
  axisTicks,
  barsForNode,
  buildTimelineTree,
  collectTreeKinds,
  densityBuckets,
  filterEvents,
  filterTreeByKind,
  flattenTree,
  resolveEventResource,
  resolveRange,
  timelineKindOptions,
  uniqueResourceCount,
  uniqueValues,
  type EventTypeFilter,
  type TimelineRangeKey
} from './timelineTree'
import './timeline.css'

interface TimelinePageProps {
  clusterId: string
  onNavigateToResource?: (focus: ResourceFocus) => void
}

function kindLabel(kind: string): string {
  if (kind === 'PodDisruptionBudget') return 'PDB'
  if (kind === 'HorizontalPodAutoscaler') return 'HPA'
  if (kind === 'ReplicaSet') return 'REPLICASET'
  if (kind === 'StatefulSet') return 'STATEFULSET'
  if (kind === 'DaemonSet') return 'DAEMONSET'
  return kind.toUpperCase()
}

function clusterSingleNamespace(selected: string | undefined): string {
  const parsed = parseNamespaceSelection(selected)
  return parsed.length === 1 && parsed[0] !== ALL_NAMESPACES ? parsed[0] : ''
}

function formatRangeLabel(key: TimelineRangeKey, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (key === 'all') return t('timeline.rangeAll')
  return t('timeline.rangeWindow', { label: t(`timeline.range.${key}`) })
}

function formatSeenAt(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || date.getTime() < Date.parse('2000-01-01')) return '—'
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function EventHoverCard({
  event,
  locale,
  t
}: {
  event: ResourceEventItem
  locale: string
  t: (key: string) => string
}): React.JSX.Element {
  const resource = resolveEventResource(event)
  const ref = resource.kind && resource.name ? `${resource.kind}/${resource.name}` : resource.name || '—'
  const warning = /warn/i.test(event.type)
  return (
    <div className="ml-timeline-tip__card">
      <div className="ml-timeline-tip__head">
        <i className={`ml-timeline-tip__dot${warning ? ' is-warn' : ' is-ok'}`} />
        <strong>{event.reason}</strong>
        <span className={`ml-timeline-tip__type${warning ? ' is-warn' : ''}`}>{event.type}</span>
      </div>
      <p className="ml-timeline-tip__msg">{event.message}</p>
      <dl className="ml-timeline-tip__meta">
        <div>
          <dt>{t('timeline.tipResource')}</dt>
          <dd title={ref}>{ref}</dd>
        </div>
        <div>
          <dt>{t('timeline.tipNamespace')}</dt>
          <dd>{resource.namespace || '—'}</dd>
        </div>
        <div>
          <dt>{t('timeline.tipFirstSeen')}</dt>
          <dd>{formatSeenAt(event.firstTimestamp, locale)}</dd>
        </div>
        <div>
          <dt>{t('timeline.tipLastSeen')}</dt>
          <dd>{formatSeenAt(event.lastTimestamp, locale)}</dd>
        </div>
        <div>
          <dt>{t('timeline.tipCount')}</dt>
          <dd>{event.count}x</dd>
        </div>
      </dl>
    </div>
  )
}

export function TimelinePage({ clusterId, onNavigateToResource }: TimelinePageProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const nsQuery = useNamespaces(clusterId)
  const clusterNamespace = useClusterStore((s) =>
    clusterSingleNamespace(s.clusters.find((cluster) => cluster.id === clusterId)?.selectedNamespace)
  )
  const { width: leftWidth, handleProps } = useResizableDrawerWidth({
    storageKey: 'ml.timeline.treeWidth',
    defaultWidth: 340,
    minWidth: 260,
    maxWidth: 520,
    maxRatio: 0.45,
    edge: 'left'
  })

  const [search, setSearch] = useState('')
  const [namespace, setNamespace] = useState(clusterNamespace)
  const [kind, setKind] = useState('')
  const [type, setType] = useState<EventTypeFilter>('all')
  const [range, setRange] = useState<TimelineRangeKey>('24h')
  const [showDensity, setShowDensity] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  function applyNamespace(next: string): void {
    setNamespace(next)
    setCollapsed(new Set())
    setNow(Date.now())
  }
  const clusterNamespaces = nsQuery.data?.namespaces ?? []
  const fetchNamespace = namespace && namespace !== ALL_NAMESPACES ? namespace : undefined
  const query = useClusterEvents(
    clusterId,
    {
      limit: 400,
      namespace: fetchNamespace,
      namespaces: fetchNamespace ? undefined : clusterNamespaces
    },
    !!fetchNamespace || clusterNamespaces.length > 0,
    { minInterval: fetchNamespace ? 15_000 : 60_000 }
  )

  const allEvents = useMemo((): ResourceEventItem[] => {
    if (!query.data || 'error' in query.data) return []
    const events = query.data.events
    if (!fetchNamespace) return events
    const hasForeign = events.some(
      (event) => event.involvedNamespace && event.involvedNamespace !== fetchNamespace
    )
    if (hasForeign) {
      return events.filter((event) => event.involvedNamespace === fetchNamespace)
    }
    return events.map((event) =>
      event.involvedNamespace ? event : { ...event, involvedNamespace: fetchNamespace }
    )
  }, [query.data, fetchNamespace])

  const windowRange = useMemo(() => resolveRange(range, allEvents, now), [range, allEvents, now])

  const scoped = useMemo(
    () =>
      filterEvents(allEvents, {
        start: windowRange.start,
        end: windowRange.end,
        now,
        search,
        namespace: '',
        kind: '',
        type: 'all'
      }),
    [allEvents, windowRange, now, search]
  )

  const filtered = useMemo(() => {
    if (type === 'all') return scoped
    return scoped.filter((event) => (/warn/i.test(event.type) ? type === 'warning' : type === 'normal'))
  }, [scoped, type])

  const fullTree = useMemo(() => buildTimelineTree(filtered), [filtered])
  const tree = useMemo(() => filterTreeByKind(fullTree, kind), [fullTree, kind])
  const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed])
  const namespaces = useMemo(() => {
    const fromCluster = nsQuery.data?.namespaces ?? []
    const fromEvents = uniqueValues(allEvents, 'involvedNamespace')
    return [...new Set([...fromCluster, ...fromEvents])].sort((a, b) => a.localeCompare(b))
  }, [nsQuery.data, allEvents])
  const kinds = useMemo(
    () => timelineKindOptions(uniqueValues(scoped, 'involvedKind'), collectTreeKinds(fullTree)),
    [scoped, fullTree]
  )
  const ticks = useMemo(() => axisTicks(windowRange.start, windowRange.end), [windowRange])
  const density = useMemo(
    () => densityBuckets(filtered, windowRange.start, windowRange.end, 48),
    [filtered, windowRange]
  )
  const densityMax = Math.max(1, ...density)
  const densityMinutes = Math.max(
    1,
    Math.round((windowRange.end - windowRange.start) / 48 / 60_000)
  )
  const warningCount = scoped.filter((event) => /warn/i.test(event.type)).length
  const normalCount = scoped.length - warningCount
  const resourceCount = uniqueResourceCount(scoped)
  const nowLeft = ((now - windowRange.start) / Math.max(1, windowRange.end - windowRange.start)) * 100
  const error =
    query.data && 'error' in query.data
      ? query.data.error
      : query.error instanceof Error
        ? query.error.message
        : null
  const errorText = error
    ? /ETIMEDOUT|ECONNRESET|timed out|timeout/i.test(error)
      ? t('timeline.timeout')
      : error
    : null

  function toggle(id: string): void {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openResource(kindName: string, name: string, ns: string): void {
    if (kindName === 'App') return
    const resourceKind = k8sKindToResourceKind(kindName)
    if (!resourceKind || !onNavigateToResource) return
    onNavigateToResource({ kind: resourceKind, namespace: ns, name })
  }

  function jumpToNow(): void {
    setNow(Date.now())
    setRange('24h')
  }

  return (
    <div className="ml-timeline">
      <header className="ml-timeline__header">
        <div className="ml-timeline__title-wrap">
          <p className="ml-timeline__eyebrow">{t('timeline.eyebrow')}</p>
          <h1 className="ml-timeline__title">{t('timeline.title')}</h1>
        </div>
        <div className="ml-timeline__actions">
          <Button
            size="small"
            type={showDensity ? 'primary' : 'default'}
            onClick={() => setShowDensity((value) => !value)}
          >
            {t('timeline.density')}
          </Button>
          <Button size="small" onClick={jumpToNow}>
            {t('timeline.now')}
          </Button>
          <Button
            size="small"
            icon={<Icon icon={RefreshCw} variant="micro" />}
            loading={query.isFetching}
            onClick={() => {
              setNow(Date.now())
              void query.refetch()
            }}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </header>

      <div className="ml-timeline__toolbar">
        <Input
          className="ml-timeline__search"
          allowClear
          prefix={<Icon icon={Search} variant="micro" />}
          placeholder={t('timeline.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="ml-timeline__select"
          showSearch
          placeholder={t('common.allNamespaces')}
          value={namespace || ALL_NAMESPACES}
          onChange={(value) => applyNamespace(value === ALL_NAMESPACES ? '' : (value ?? ''))}
          optionFilterProp="label"
          options={[
            { value: ALL_NAMESPACES, label: t('common.allNamespaces') },
            ...namespaces.map((value) => ({ value, label: value }))
          ]}
        />
        <Select
          className="ml-timeline__select"
          showSearch
          placeholder={t('timeline.allKinds')}
          value={kind}
          onChange={(value) => setKind(value ?? '')}
          optionFilterProp="label"
          options={[
            { value: '', label: t('timeline.allKinds') },
            ...kinds.map((value) => ({ value, label: value }))
          ]}
        />
        <div className="ml-timeline__chips">
          <button
            type="button"
            className={`ml-timeline__chip${type === 'all' ? ' is-active' : ''}`}
            onClick={() => setType('all')}
          >
            {t('timeline.chipAll')}
            <strong>{scoped.length}</strong>
          </button>
          <button
            type="button"
            className={`ml-timeline__chip${type === 'warning' ? ' is-active' : ''}`}
            onClick={() => setType('warning')}
          >
            {t('timeline.chipWarnings')}
            <strong>{warningCount}</strong>
          </button>
          <button
            type="button"
            className={`ml-timeline__chip${type === 'normal' ? ' is-active' : ''}`}
            onClick={() => setType('normal')}
          >
            {t('timeline.chipNormal')}
            <strong>{normalCount}</strong>
          </button>
          <span className="ml-timeline__chip is-static">
            {t('timeline.chipResources')}
            <strong>{resourceCount}</strong>
          </span>
        </div>
        <div className="ml-timeline__ranges" role="group" aria-label={t('timeline.rangeLabel')}>
          {TIMELINE_RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={range === item.key ? 'is-active' : undefined}
              onClick={() => setRange(item.key)}
            >
              {item.key === 'all' ? t('timeline.rangeAll') : item.key}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-timeline__meta">
        <div className="ml-timeline__legend">
          <span>
            <i className="tone-normal" /> {t('timeline.legendNormal')}
          </span>
          <span>
            <i className="tone-warning" /> {t('timeline.legendWarning')}
          </span>
          <span>
            <i className="tone-success" /> {t('timeline.legendSuccess')}
          </span>
          <span>
            <i className="tone-success is-instant" /> {t('timeline.legendInstant')}
          </span>
          <span>
            <i className="is-duration" /> {t('timeline.legendDuration')}
          </span>
        </div>
        <span>
          {t('timeline.showing', {
            shown: filtered.length,
            total: scoped.length,
            resources: resourceCount,
            range: formatRangeLabel(range, t)
          })}
        </span>
      </div>

      {query.isLoading && allEvents.length === 0 ? (
        <div className="ml-timeline__center">
          <Spin description={t('common.loading')} />
        </div>
      ) : errorText && allEvents.length === 0 ? (
        <div className="ml-timeline__center">{errorText}</div>
      ) : (
        <div className="ml-timeline__board" style={{ ['--ml-tl-left' as string]: `${leftWidth}px` }}>
          {query.isFetching ? (
            <div className="ml-timeline__loading">
              <Icon icon={Zap} variant="micro" />
              {t('timeline.loadingEvents')}
            </div>
          ) : null}
          <button
            type="button"
            className="ml-timeline__resize"
            aria-label={t('timeline.resizeTree')}
            {...handleProps}
          />
          {showDensity ? (
            <div className="ml-timeline__density">
              <div className="ml-timeline__density-label">
                <strong>{t('timeline.eventDensity')}</strong>
                <small>{t('timeline.densityUnit', { minutes: densityMinutes })}</small>
              </div>
              <div className="ml-timeline__density-plot" aria-hidden>
                {density.map((value, index) => (
                  <span key={index} style={{ height: `${Math.max(4, (value / densityMax) * 100)}%` }} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="ml-timeline__axis">
            <div className="ml-timeline__resource-head">
              <span>{t('timeline.resource')}</span>
              <span>{t('timeline.rows', { count: rows.length })}</span>
            </div>
            <div className="ml-timeline__ticks">
              {ticks.map((tick) => (
                <span
                  key={tick.t}
                  className="ml-timeline__tick"
                  style={{ left: `${((tick.t - windowRange.start) / Math.max(1, windowRange.end - windowRange.start)) * 100}%` }}
                >
                  {tick.label}
                </span>
              ))}
              {nowLeft >= 0 && nowLeft <= 100 ? (
                <span className="ml-timeline__now-label" style={{ left: `${nowLeft}%` }}>
                  {t('timeline.now')} {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="ml-timeline__rows">
            {rows.length === 0 ? (
              <div className="ml-timeline__empty">
                <Empty description={t('timeline.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              rows.map((row) => {
                const bars = barsForNode(row.node, windowRange.start, windowRange.end, now)
                return (
                  <div
                    key={row.node.id}
                    className="ml-timeline__row"
                    style={{
                      minHeight: Math.max(52, 16 + (bars[0]?.lanes ?? 1) * 18)
                    }}
                  >
                    <div
                      className="ml-timeline__tree"
                      style={{ paddingLeft: 8 + row.depth * 16 }}
                    >
                      <button
                        type="button"
                        className={`ml-timeline__toggle${row.node.children.length === 0 ? ' is-leaf' : ''}`}
                        onClick={() => toggle(row.node.id)}
                        aria-label={collapsed.has(row.node.id) ? t('timeline.expand') : t('timeline.collapse')}
                      >
                        <Icon
                          icon={collapsed.has(row.node.id) ? ChevronRight : ChevronDown}
                          variant="micro"
                        />
                      </button>
                      <span className="ml-timeline__kind" data-kind={row.node.kind}>
                        {kindLabel(row.node.kind)}
                      </span>
                      <button
                        type="button"
                        className="ml-timeline__identity"
                        title={`${row.node.name} · ${row.node.namespace}`}
                        onClick={() => openResource(row.node.kind, row.node.name, row.node.namespace)}
                      >
                        <span className="ml-timeline__name">{row.node.name}</span>
                        {row.subtitle ? <span className="ml-timeline__sub">{row.subtitle}</span> : null}
                      </button>
                      <span
                        className={`ml-timeline__health${row.hasWarning ? ' is-warn' : ' is-ok'}`}
                        aria-hidden
                      />
                      <span className="ml-timeline__count">{row.eventCount}</span>
                    </div>
                    <div
                      className="ml-timeline__gantt"
                      style={{ ['--lanes' as string]: String(bars[0]?.lanes ?? 1) }}
                    >
                      {ticks.map((tick) => (
                        <span
                          key={tick.t}
                          className="ml-timeline__gridline"
                          style={{
                            left: `${((tick.t - windowRange.start) / Math.max(1, windowRange.end - windowRange.start)) * 100}%`
                          }}
                        />
                      ))}
                      {nowLeft >= 0 && nowLeft <= 100 ? (
                        <span className="ml-timeline__now" style={{ left: `${nowLeft}%` }} />
                      ) : null}
                      {bars.map((bar) => (
                        <Tooltip
                          key={bar.event.id}
                          placement="top"
                          mouseEnterDelay={0.12}
                          classNames={{ root: 'ml-timeline-tip' }}
                          styles={{ container: { padding: 0, background: 'transparent' } }}
                          title={<EventHoverCard event={bar.event} locale={i18n.language} t={t} />}
                        >
                          <span
                            className={`ml-timeline__bar tone-${bar.tone}${bar.instant ? ' is-instant' : ''}`}
                            style={{
                              left: `${bar.left}%`,
                              width: bar.instant ? undefined : `${bar.width}%`,
                              ['--lane' as string]: String(bar.lane),
                              ['--lanes' as string]: String(bar.lanes)
                            }}
                          >
                            {!bar.instant && bar.width > 7 ? (
                              <span className="ml-timeline__bar-label">{bar.event.reason}</span>
                            ) : null}
                          </span>
                        </Tooltip>
                      ))}
                      {bars.map((bar) =>
                        !bar.instant && bar.event.count > 1 ? (
                          <span
                            key={`${bar.event.id}-n`}
                            className={`ml-timeline__bar-plus tone-${bar.tone}`}
                            style={{
                              left: `${Math.min(98, bar.left + bar.width)}%`,
                              ['--lane' as string]: String(bar.lane)
                            }}
                          >
                            +{bar.event.count}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
