import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLUSTER_NOT_CONNECTED } from '@shared/types/cluster'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import {
  MENU_BAR_ACCENTS,
  MENU_BAR_CLUSTERS_PER_PAGE,
  defaultMenuBarWidgetPrefs,
  type MenuBarWidgetPrefs
} from '@shared/types/menuBarWidget'
import { formatBytes, formatCores, percentOf } from '../../format'

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

  const accent = useMemo(() => MENU_BAR_ACCENTS[prefs.accent], [prefs.accent])

  const pageCount = Math.max(1, Math.ceil(cards.length / MENU_BAR_CLUSTERS_PER_PAGE))
  // Clamp rather than reset: removing a cluster while on the last page shouldn't jump to page 1.
  const safePage = Math.min(page, pageCount - 1)
  const visibleCards = cards.slice(
    safePage * MENU_BAR_CLUSTERS_PER_PAGE,
    safePage * MENU_BAR_CLUSTERS_PER_PAGE + MENU_BAR_CLUSTERS_PER_PAGE
  )

  return (
    <div className={`ml-mbw${prefs.compact ? ' ml-mbw--compact' : ''}`}>
      <header className="ml-mbw__head">
        <span className="ml-mbw__title">MagicLens</span>
        <button
          type="button"
          className="ml-mbw__head-btn"
          onClick={() => void load()}
          aria-label="Refresh"
        >
          ⟳
        </button>
      </header>

      {prefs.clusterIds.length === 0 ? (
        <div className="ml-mbw__empty">{t('settings.widget.pickClusters')}</div>
      ) : loading && cards.length === 0 ? (
        <div className="ml-mbw__empty">{t('common.loading')}</div>
      ) : (
        <div className="ml-mbw__list">
          {visibleCards.map((card) => {
            const m = card.metrics
            const totalPods = m ? m.runningPods + m.pendingPods + m.failedPods : 0
            return (
              <section key={card.id} className="ml-mbw-card">
                {prefs.showClusterName ? (
                  <div className="ml-mbw-card__head">
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
                        accent={accent}
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
                        accent={accent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                    {prefs.metrics.pods ? (
                      <MetricRow
                        label="Pods"
                        value={`${totalPods} / ${m.podCapacity}`}
                        pct={percentOf(totalPods, m.podCapacity)}
                        accent={accent}
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
                        accent={accent}
                        compact={prefs.compact}
                        colorByUsage={prefs.colorByUsage}
                      />
                    ) : null}
                  </div>
                )}
              </section>
            )
          })}

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
      )}
    </div>
  )
}

export function isMenuBarWidgetRoute(): boolean {
  return new URLSearchParams(window.location.search).get('mlWidget') === '1'
}
