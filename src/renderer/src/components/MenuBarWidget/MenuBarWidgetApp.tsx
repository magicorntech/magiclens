import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import {
  MENU_BAR_ACCENTS,
  defaultMenuBarWidgetPrefs,
  menuBarClustersPerPage,
  type MenuBarWidgetPrefs
} from '@shared/types/menuBarWidget'
import { Settings } from 'lucide-react'
import { formatBytes, formatCores, percentOf } from '../../format'
import { Icon } from '../ui/Icon'

/**
 * Renderer for the menu-bar Tray popup (loaded with `?mlWidget=1` in its own frameless
 * BrowserWindow — see src/main/menuBarWidget.ts).
 *
 * It deliberately does NOT reuse `useClusterMetrics`/the cluster store: those gate fetching on
 * renderer-local connection state that only the main window populates. This window polls the
 * main process directly instead, and reports "not connected" when the main process has no live
 * client for a cluster.
 */

interface ClusterCard {
  id: string
  name: string
  logoUrl?: string
  metrics: ClusterMetricsSummary | null
  notConnected: boolean
  error?: string
}

function usageTone(pct: number | undefined): 'ok' | 'warn' | 'bad' {
  if (pct === undefined) return 'ok'
  if (pct >= 90) return 'bad'
  if (pct >= 75) return 'warn'
  return 'ok'
}

/** Mirrors clusterHealthStatus() used by the Nodes page, kept local to avoid the dependency. */
function healthTone(m: ClusterMetricsSummary): 'ok' | 'warn' | 'bad' {
  if (m.notReadyNodes > 0 || m.failedPods > 0) return 'bad'
  if (m.pendingPods > 0) return 'warn'
  return 'ok'
}

/** A count row: no percentage bar, and any non-zero value is itself the warning. */
function CountRow({
  label,
  count,
  tone
}: {
  label: string
  count: number
  tone: 'ok' | 'warn' | 'bad'
}): React.JSX.Element {
  return (
    <div className={`ml-mbw-metric ml-mbw-metric--${count > 0 ? tone : 'ok'} ml-mbw-metric--count`}>
      <span className="ml-mbw-metric__label">{label}</span>
      <span className="ml-mbw-metric__value">{count}</span>
    </div>
  )
}

function MetricRow({
  label,
  value,
  pct,
  accent,
  compact,
  colorByUsage
}: {
  label: string
  value: string
  pct: number | undefined
  accent: string
  compact: boolean
  colorByUsage: boolean
}): React.JSX.Element {
  const tone = colorByUsage ? usageTone(pct) : 'ok'
  return (
    <div className={`ml-mbw-metric ml-mbw-metric--${tone}`}>
      <span className="ml-mbw-metric__label">{label}</span>
      {!compact && pct !== undefined ? (
        <span className="ml-mbw-metric__track">
          <span
            className="ml-mbw-metric__fill"
            style={{ width: `${Math.min(100, pct)}%`, background: accent }}
          />
        </span>
      ) : null}
      <span className="ml-mbw-metric__value">
        {value}
        {pct !== undefined ? <em className="ml-mbw-metric__pct">{pct}%</em> : null}
      </span>
    </div>
  )
}

export function MenuBarWidgetApp(): React.JSX.Element {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState<MenuBarWidgetPrefs>(defaultMenuBarWidgetPrefs)
  const [cards, setCards] = useState<ClusterCard[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (): Promise<void> => {
    const settings = await window.api.app.getDisplaySettings()
    const nextPrefs = settings.menuBarWidget
    setPrefs(nextPrefs)

    const { clusters } = await window.api.clusterStore.list()
    const byId = new Map<string, PersistedClusterEntry>(clusters.map((c) => [c.id, c]))

    const next = await Promise.all(
      nextPrefs.clusterIds.map(async (id): Promise<ClusterCard> => {
        const entry = byId.get(id)
        const name = entry?.customName || entry?.contextName || id
        try {
          const res = await window.api.metrics.getClusterSummary({ clusterId: id })
          if ('error' in res) {
            const message = String((res as { error: string }).error)
            return {
              id,
              name,
              logoUrl: entry?.logoUrl,
              metrics: null,
              notConnected: message === CLUSTER_NOT_CONNECTED,
              error: message
            }
          }
          return { id, name, logoUrl: entry?.logoUrl, metrics: res, notConnected: false }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return {
            id,
            name,
            logoUrl: entry?.logoUrl,
            metrics: null,
            notConnected: message.includes(CLUSTER_NOT_CONNECTED),
            error: message
          }
        }
      })
    )
    setCards(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    return window.api.app.onMenuBarRefresh(() => void load())
  }, [load])

  // Poll only while the panel is actually on screen. The popup window is reused across opens
  // rather than recreated, so without this it would keep hitting the cluster APIs while
  // hidden — and Chromium throttles hidden-window timers anyway, making those ticks both
  // wasteful and unreliable. The main process sends a refresh on every open (see showPopup).
  useEffect(() => {
    const ms = Math.max(5, prefs.refreshSeconds) * 1000
    let timer: ReturnType<typeof setInterval> | null = null

    const start = (): void => {
      if (timer !== null) return
      timer = setInterval(() => void load(), ms)
    }
    const stop = (): void => {
      if (timer === null) return
      clearInterval(timer)
      timer = null
    }
    const sync = (): void => {
      if (document.visibilityState === 'visible') {
        void load()
        start()
      } else {
        stop()
      }
    }

    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      stop()
    }
  }, [prefs.refreshSeconds, load])

  // Push the chosen metric of the first cluster into the macOS menu bar next to the icon.
  useEffect(() => {
    if (prefs.trayLabel === 'none') {
      void window.api.app.setMenuBarTrayTitle('')
      return
    }
    const first = cards.find((c) => c.metrics)
    if (!first?.metrics) {
      void window.api.app.setMenuBarTrayTitle('')
      return
    }
    const m = first.metrics
    const label =
      prefs.trayLabel === 'cpu'
        ? `${percentOf(m.cpuUsageCores, m.cpuAllocatableCores) ?? '—'}%`
        : prefs.trayLabel === 'memory'
          ? `${percentOf(m.memoryUsageBytes, m.memoryAllocatableBytes) ?? '—'}%`
          : String(m.runningPods + m.pendingPods + m.failedPods)
    void window.api.app.setMenuBarTrayTitle(label)
  }, [cards, prefs.trayLabel])

  /**
   * The main process sizes the window from constants that only approximate the rendered rows,
   * so when it comes up a few px short the last card ends up behind a scrollbar. Measure the
   * real overflow and ask for exactly that much more height (plus a small bottom breather),
   * which self-corrects for any metric combination, font or locale.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let raf = 0
    const measure = (): void => {
      cancelAnimationFrame(raf)
      // One frame later so layout has settled after the render that triggered this.
      raf = requestAnimationFrame(() => {
        const el = listRef.current
        if (!el) return
        const overflow = el.scrollHeight - el.clientHeight
        if (overflow > 0) void window.api.app.growMenuBarWidget(overflow + 8)
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [cards, page, prefs.layout, prefs.metrics, prefs.compact, prefs.showClusterName])

  const accentFor = useCallback(
    (clusterId: string): string =>
      MENU_BAR_ACCENTS[prefs.clusterAccents[clusterId] ?? prefs.accent],
    [prefs.clusterAccents, prefs.accent]
  )

  /**
   * Moves `draggedId` to sit where `targetId` currently is, within the full clusterIds order
   * (not just the visible page) so dragging onto the last card of a page still lands correctly.
   * Reorders local state first so the card follows the cursor without waiting on the round trip.
   */
  const reorderClusters = useCallback(
    async (draggedId: string, targetId: string): Promise<void> => {
      if (draggedId === targetId) return
      const order = [...prefs.clusterIds]
      const from = order.indexOf(draggedId)
      const to = order.indexOf(targetId)
      if (from < 0 || to < 0) return
      order.splice(from, 1)
      order.splice(to, 0, draggedId)

      setPrefs((p) => ({ ...p, clusterIds: order }))
      setCards((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]))
        return order.map((id) => byId.get(id)).filter((c): c is ClusterCard => !!c)
      })

      await window.api.app.setDisplaySettings({
        menuBarWidget: { ...prefs, clusterIds: order }
      })
    },
    [prefs]
  )

  function handleDrop(targetId: string): void {
    const dragged = dragId
    setDragId(null)
    setDropTargetId(null)
    if (dragged) void reorderClusters(dragged, targetId)
  }

  const perPage = menuBarClustersPerPage(prefs.layout)
  const pageCount = Math.max(1, Math.ceil(cards.length / perPage))
  // Clamp rather than reset: removing a cluster while on the last page shouldn't jump to page 1.
  const safePage = Math.min(page, pageCount - 1)
  const visibleCards = cards.slice(safePage * perPage, safePage * perPage + perPage)

  return (
    <div className={`ml-mbw${prefs.compact ? ' ml-mbw--compact' : ''}`}>
      <header className="ml-mbw__head">
        <span className="ml-mbw__title">MagicLens Widget</span>
        <span className="ml-mbw__head-actions">
          <button
            type="button"
            className="ml-mbw__head-btn"
            onClick={() => void load()}
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            ⟳
          </button>
          <button
            type="button"
            className="ml-mbw__head-btn"
            onClick={() => void window.api.app.openMenuBarWidgetSettings()}
            aria-label={t('settings.widget.openSettings')}
            title={t('settings.widget.openSettings')}
          >
            <Icon icon={Settings} variant="micro" />
          </button>
        </span>
      </header>

      {prefs.clusterIds.length === 0 ? (
        <div className="ml-mbw__empty">{t('settings.widget.pickClusters')}</div>
      ) : loading && cards.length === 0 ? (
        <div className="ml-mbw__empty">{t('common.loading')}</div>
      ) : (
        <div ref={listRef} className={`ml-mbw__list ml-mbw__list--${prefs.layout}`}>
          {visibleCards.map((card) => {
            const m = card.metrics
            const totalPods = m ? m.runningPods + m.pendingPods + m.failedPods : 0
            const cardAccent = accentFor(card.id)
            return (
              <section
                key={card.id}
                className={`ml-mbw-card${dragId === card.id ? ' is-dragging' : ''}${
                  dropTargetId === card.id && dragId !== card.id ? ' is-drop-target' : ''
                }`}
                draggable
                onDragStart={(e) => {
                  setDragId(card.id)
                  // Required for the drop to be allowed at all in Chromium.
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', card.id)
                }}
                onDragEnter={() => setDropTargetId(card.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDropTargetId(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(card.id)
                }}
              >
                {prefs.showClusterName ? (
                  <div className="ml-mbw-card__head">
                    {/* Colour dot so each cluster stays identifiable even when the metric
                        bars are hidden in compact mode. */}
                    <span
                      className="ml-mbw-card__dot"
                      style={{ background: cardAccent }}
                      aria-hidden
                    />
                    <span className="ml-mbw-card__name" title={card.name}>
                      {card.name}
                    </span>
                    {m ? (
                      <span className="ml-mbw-card__nodes">
                        {m.readyNodes}/{m.totalNodes} {t('settings.widget.metricNodes')}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {!m ? (
                  <div className="ml-mbw-card__offline">
                    {card.notConnected
                      ? t('settings.widget.notConnected')
                      : (card.error ?? t('common.error'))}
                  </div>
                ) : (
                  <div className="ml-mbw-card__metrics">
                    {prefs.metrics.health ? (
                      <div className={`ml-mbw-metric ml-mbw-metric--${healthTone(m)} ml-mbw-metric--count`}>
                        <span className="ml-mbw-metric__label">
                          {t('settings.widget.metricHealth')}
                        </span>
                        <span className="ml-mbw-metric__value">
                          {healthTone(m) === 'bad'
                            ? t('nodesOverview.health.degraded')
                            : healthTone(m) === 'warn'
                              ? t('nodesOverview.health.warning')
                              : t('nodesOverview.health.healthy')}
                        </span>
                      </div>
                    ) : null}
                    {prefs.metrics.cpu ? (
                      <MetricRow
                        label="CPU"
                        value={
                          m.cpuUsageCores !== undefined ? formatCores(m.cpuUsageCores) : '—'
                        }
                        pct={percentOf(m.cpuUsageCores, m.cpuAllocatableCores)}
                        accent={cardAccent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                    {prefs.metrics.memory ? (
                      <MetricRow
                        label="Memory"
                        value={
                          m.memoryUsageBytes !== undefined ? formatBytes(m.memoryUsageBytes) : '—'
                        }
                        pct={percentOf(m.memoryUsageBytes, m.memoryAllocatableBytes)}
                        accent={cardAccent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                    {prefs.metrics.pods ? (
                      <MetricRow
                        label="Pods"
                        value={`${totalPods} / ${m.podCapacity}`}
                        pct={percentOf(totalPods, m.podCapacity)}
                        accent={cardAccent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                    {prefs.metrics.pendingPods ? (
                      <CountRow
                        label={t('settings.widget.metricPendingPods')}
                        count={m.pendingPods}
                        tone="warn"
                      />
                    ) : null}
                    {prefs.metrics.failedPods ? (
                      <CountRow
                        label={t('settings.widget.metricFailedPods')}
                        count={m.failedPods}
                        tone="bad"
                      />
                    ) : null}
                    {prefs.metrics.nodes ? (
                      <MetricRow
                        label={t('settings.widget.metricNodes')}
                        value={`${m.readyNodes} / ${m.totalNodes}`}
                        pct={percentOf(m.readyNodes, m.totalNodes)}
                        accent={cardAccent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Sits outside the scrollable card list so it can't be scrolled out of view. */}
      {pageCount > 1 ? (
        <nav className="ml-mbw__pager">
          <button
            type="button"
            className="ml-mbw__pager-btn"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            aria-label={t('settings.widget.prevPage')}
          >
            ‹
          </button>
          <span className="ml-mbw__pager-label">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="ml-mbw__pager-btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            aria-label={t('settings.widget.nextPage')}
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export function isMenuBarWidgetRoute(): boolean {
  return new URLSearchParams(window.location.search).get('mlWidget') === '1'
}
