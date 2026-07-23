import { create } from 'zustand'

export interface PodMetricsSample {
  t: number
  totalCpuUsageCores: number
  totalMemoryUsageBytes: number
  containers: Record<string, { cpuUsageCores: number; memoryUsageBytes: number }>
}

// Kubernetes metrics-server only ever exposes an instantaneous snapshot — there is no
// historical time series API. To chart "usage over time" we accumulate samples ourselves,
// client-side, for as long as the app has been observing a given pod (keyed by cluster+uid so
// a recreated pod with the same name starts a fresh history).
const MAX_SAMPLES_PER_POD = 180
const MAX_TRACKED_PODS = 12
const MIN_SAMPLE_GAP_MS = 1_000

function decimate(samples: PodMetricsSample[]): PodMetricsSample[] {
  if (samples.length <= MAX_SAMPLES_PER_POD) return samples
  // Halve resolution (drop every other point) instead of dropping the oldest half, so the
  // chart keeps covering the pod's full observed lifetime rather than losing early history.
  const thinned: PodMetricsSample[] = []
  for (let i = 0; i < samples.length; i += 2) thinned.push(samples[i])
  return thinned
}

interface PodMetricsHistoryState {
  historyByPod: Map<string, PodMetricsSample[]>
  accessOrder: string[]
  addSample: (key: string, sample: PodMetricsSample) => void
}

export const usePodMetricsHistoryStore = create<PodMetricsHistoryState>()((set, get) => ({
  historyByPod: new Map(),
  accessOrder: [],
  addSample: (key, sample) => {
    const { historyByPod, accessOrder } = get()
    const existing = historyByPod.get(key) ?? []
    const last = existing[existing.length - 1]
    if (last && sample.t - last.t < MIN_SAMPLE_GAP_MS) return

    const nextMap = new Map(historyByPod)
    nextMap.set(key, decimate([...existing, sample]))

    const nextOrder = accessOrder.filter((k) => k !== key)
    nextOrder.push(key)
    while (nextOrder.length > MAX_TRACKED_PODS) {
      const evicted = nextOrder.shift()
      if (evicted) nextMap.delete(evicted)
    }

    set({ historyByPod: nextMap, accessOrder: nextOrder })
  }
}))
