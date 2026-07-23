import { create } from 'zustand'

export interface NodeMetricsSample {
  t: number
  cpuUsageCores: number
  memoryUsageBytes: number
}

const MAX_SAMPLES_PER_NODE = 180
const MAX_TRACKED_NODES = 20
const MIN_SAMPLE_GAP_MS = 1_000

function decimate(samples: NodeMetricsSample[]): NodeMetricsSample[] {
  if (samples.length <= MAX_SAMPLES_PER_NODE) return samples
  const thinned: NodeMetricsSample[] = []
  for (let i = 0; i < samples.length; i += 2) thinned.push(samples[i])
  return thinned
}

interface NodeMetricsHistoryState {
  historyByNode: Map<string, NodeMetricsSample[]>
  accessOrder: string[]
  addSample: (key: string, sample: NodeMetricsSample) => void
}

export const useNodeMetricsHistoryStore = create<NodeMetricsHistoryState>()((set, get) => ({
  historyByNode: new Map(),
  accessOrder: [],
  addSample: (key, sample) => {
    const { historyByNode, accessOrder } = get()
    const existing = historyByNode.get(key) ?? []
    const last = existing[existing.length - 1]
    if (last && sample.t - last.t < MIN_SAMPLE_GAP_MS) return

    const nextMap = new Map(historyByNode)
    nextMap.set(key, decimate([...existing, sample]))

    const nextOrder = accessOrder.filter((k) => k !== key)
    nextOrder.push(key)
    while (nextOrder.length > MAX_TRACKED_NODES) {
      const evicted = nextOrder.shift()
      if (evicted) nextMap.delete(evicted)
    }

    set({ historyByNode: nextMap, accessOrder: nextOrder })
  }
}))
