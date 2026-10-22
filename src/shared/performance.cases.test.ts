import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { onSenderDestroyed } from '../main/ipc/senderCleanup'
import { listEventsForObject } from '../main/k8s/eventsService'
import { buildTargetKey, priorWatchSessionId } from '../main/k8s/resourceWatchManager'
import { clusterAppHostMounted, clusterAppPartition } from '../renderer/src/components/Apps/clusterAppPartition'
import { sharedClockIntervalActive, subscribeSharedClock } from '../renderer/src/hooks/useSharedClockTick'
import { podMetricsRefetchInterval } from '../renderer/src/queries/usePodTableMetrics'
import { DEFAULT_LOCAL_ALERT_PREFS, evaluateLocalAlerts } from './localAlerts'
import { keepSearchResult, SEARCH_LIST_CONCURRENCY, SEARCH_REQUEST_TIMEOUT_MS } from './searchLimits'
import type { ResourceListItem } from './types/resource'
import { compareUsageRatio } from '../renderer/src/utils/tableSort'

/**
 * In-process performance cases. Electron and live-cluster cases are listed in
 * plans/performance-cases.md and are not run here.
 */

interface FakeSender {
  listenerCount(event: string): number
  once(event: string, fn: () => void): void
  emit(event: string): void
}

function fakeSender(): FakeSender {
  const listeners = new Map<string, Set<() => void>>()
  return {
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0
    },
    once(event, fn) {
      const set = listeners.get(event) ?? new Set()
      set.add(fn)
      listeners.set(event, set)
    },
    emit(event) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn()
    }
  }
}

function pod(index: number, statusText: string): ResourceListItem {
  return {
    id: `pod-${index}`,
    name: `pod-${index}`,
    namespace: `ns-${index % 40}`,
    ageTimestamp: new Date(Date.now() - 60_000).toISOString(),
    statusText,
    statusColor: 'green',
    columns: { restarts: '0' }
  }
}

describe('performance cases', () => {
  it('PC-01 watch restart does not add another destroyed listener', () => {
    const sender = fakeSender()
    const runs: number[] = []
    for (let i = 0; i < 200; i += 1) {
      onSenderDestroyed(sender as never, 'resourceWatchManager', () => runs.push(i))
    }
    expect(sender.listenerCount('destroyed')).toBe(1)
    sender.emit('destroyed')
    expect(runs).toEqual([199])
  })

  it('PC-03 sorting 5000 usage rows stays ordered and under 100ms', () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      usage: ((index * 17) % 200) / 10,
      basis: 1 + (index % 8)
    }))
    const started = performance.now()
    rows.sort((a, b) => -compareUsageRatio(a.usage, a.basis, b.usage, b.basis, 'descend'))
    const elapsed = performance.now() - started
    expect(elapsed).toBeLessThan(100)
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1].usage / rows[i - 1].basis
      const next = rows[i].usage / rows[i].basis
      expect(prev).toBeGreaterThanOrEqual(next)
    }
  })

  it('PC-06 evaluating 3000 healthy pods does not allocate an alert per row', () => {
    const pods = Array.from({ length: 3000 }, (_, index) => pod(index, 'Running'))
    const started = performance.now()
    const alerts = evaluateLocalAlerts({
      clusterId: 'c1',
      clusterName: 'prod',
      pods,
      nodes: [],
      jobs: [],
      deployments: [],
      certs: []
    }, DEFAULT_LOCAL_ALERT_PREFS)
    const elapsed = performance.now() - started
    expect(alerts).toHaveLength(0)
    expect(elapsed).toBeLessThan(100)
  })

  it('PC-02 disconnect stops every cluster stream', () => {
    const src = readFileSync(new URL('../main/ipc/cluster.handlers.ts', import.meta.url), 'utf8')
    const disconnect = src.slice(src.indexOf('IPC.CLUSTER_DISCONNECT'), src.indexOf('IPC.CLUSTER_GET_VERSION'))
    for (const call of [
      'resourceWatchManager.stopAllForCluster',
      'portForwardManager.stopAllForCluster',
      'podLogManager.stopAllForCluster',
      'podExecManager.stopAllForCluster',
      'nodeExecManager.stopAllForCluster'
    ]) {
      expect(disconnect).toContain(call)
    }
    const nodeExec = readFileSync(new URL('../main/k8s/nodeExecManager.ts', import.meta.url), 'utf8')
    expect(nodeExec).toContain('podExecManager.stopAllForCluster(clusterId)')
  })

  it('PC-04 one hundred age cells share a single interval', () => {
    const setSpy = vi.spyOn(global, 'setInterval')
    const clearSpy = vi.spyOn(global, 'clearInterval')
    expect(sharedClockIntervalActive()).toBe(false)
    const stops = Array.from({ length: 100 }, () => subscribeSharedClock(() => undefined))
    expect(setSpy).toHaveBeenCalledTimes(1)
    expect(sharedClockIntervalActive()).toBe(true)
    for (const stop of stops) stop()
    expect(sharedClockIntervalActive()).toBe(false)
    expect(clearSpy).toHaveBeenCalled()
    setSpy.mockRestore()
    clearSpy.mockRestore()
  })

  it('PC-05 pod metrics polling stops when the table is not in front', () => {
    const live = { isActiveTab: true, isConnected: true, windowFocused: true, paused: false, interval: 2000 as const }
    expect(podMetricsRefetchInterval(live)).toBe(2000)
    expect(podMetricsRefetchInterval({ ...live, isActiveTab: false })).toBe(false)
    expect(podMetricsRefetchInterval({ ...live, windowFocused: false })).toBe(false)
    expect(podMetricsRefetchInterval({ ...live, isConnected: false })).toBe(false)
    expect(podMetricsRefetchInterval({ ...live, paused: true })).toBe(false)
    expect(podMetricsRefetchInterval({ ...live, interval: 'manual' })).toBe(5000)
    expect(podMetricsRefetchInterval({ ...live, interval: 15000 })).toBe(5000)
  })

  it('PC-07 a second pane of the same kind replaces the watch instead of adding one', () => {
    const pods = buildTargetKey('c1', 'ALL', { type: 'builtin', kind: 'Pod' })
    const nodes = buildTargetKey('c1', 'ALL', { type: 'builtin', kind: 'Node' })
    expect(pods).not.toBe(nodes)
    expect(buildTargetKey('c1', 'ALL', { type: 'builtin', kind: 'Pod' })).toBe(pods)
    expect(priorWatchSessionId(undefined, 'right')).toBeNull()
    expect(priorWatchSessionId('left', 'right')).toBe('left')
    expect(priorWatchSessionId('left', 'left')).toBeNull()
  })

  it('PC-08 saving one note does not walk the vault', () => {
    const src = readFileSync(new URL('../main/notes/vaultStore.ts', import.meta.url), 'utf8')
    const updateNote = src.slice(src.indexOf('export function updateNote'), src.indexOf('export function updateNoteAnywhere'))
    expect(updateNote).toContain('upsertCachedNote')
    expect(updateNote).not.toContain('invalidateCache')
    expect(updateNote).not.toContain('walkMarkdownFiles')
    const invalidate = src.indexOf('function invalidateCache')
    const walk = src.indexOf('function walkMarkdownFiles')
    expect(invalidate).toBeGreaterThan(-1)
    expect(walk).toBeGreaterThan(-1)
  })

  it('PC-09 a newer search drops the previous result', () => {
    expect(SEARCH_REQUEST_TIMEOUT_MS).toBe(18_000)
    expect(SEARCH_LIST_CONCURRENCY).toBe(6)
    expect(keepSearchResult(1, 1)).toBe(true)
    expect(keepSearchResult(1, 2)).toBe(false)
  })

  it('PC-10 node events follow pods on that node with a pool of 6', async () => {
    const calls: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    const pods = Array.from({ length: 15 }, (_, index) => ({
      metadata: { name: `pod-${index}`, namespace: 'ns' }
    }))
    const clients = {
      core: {
        listEventForAllNamespaces: async (opts: { fieldSelector?: string; limit?: number }) => {
          calls.push(`all:${opts.fieldSelector ?? ''}`)
          return { items: [] }
        },
        listPodForAllNamespaces: async (opts: { fieldSelector?: string }) => {
          calls.push(`pods:${opts.fieldSelector ?? ''}`)
          return { items: pods }
        },
        listNamespacedEvent: async (opts: { limit?: number }) => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 4))
          inFlight -= 1
          calls.push(`namespaced:${opts.limit}`)
          return { items: [] }
        }
      }
    }
    await listEventsForObject(clients as never, '', 'Node', 'node-a')
    expect(calls.filter((call) => call.startsWith('all:'))).toEqual([
      'all:involvedObject.name=node-a,involvedObject.kind=Node'
    ])
    expect(calls.some((call) => call === 'all:')).toBe(false)
    expect(calls.filter((call) => call.startsWith('namespaced:'))).toHaveLength(15)
    expect(maxInFlight).toBeLessThanOrEqual(6)
    expect(maxInFlight).toBeGreaterThan(1)
  })

  it('PC-11 an embedded app keeps one partition and unmounts off that page', () => {
    expect(clusterAppPartition('c1', 'grafana')).toBe('persist:cluster-app-c1-grafana')
    expect(clusterAppPartition('c1', 'grafana')).toBe(clusterAppPartition('c1', 'grafana'))
    expect(clusterAppPartition('c1', 'prometheus')).not.toBe(clusterAppPartition('c1', 'grafana'))
    expect(clusterAppHostMounted('appGrafana')).toBe(true)
    expect(clusterAppHostMounted('nodes')).toBe(false)
    expect(clusterAppHostMounted(null)).toBe(false)
  })
})
