import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RefreshInterval = 1000 | 3000 | 5000 | 10000 | 30000 | 'manual'

export const refreshIntervalOptions: { label: string; value: RefreshInterval }[] = [
  { label: '1s', value: 1000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: 'Manual', value: 'manual' }
]

interface LiveRefreshState {
  interval: RefreshInterval
  paused: boolean
  setInterval: (interval: RefreshInterval) => void
  togglePaused: () => void
}

export const useLiveRefreshStore = create<LiveRefreshState>()(
  persist(
    (set) => ({
      // 1s was the previous default and caused heavy fallback polling + metrics churn on Mac.
      interval: 5000,
      paused: false,
      setInterval: (interval) => set({ interval }),
      togglePaused: () => set((s) => ({ paused: !s.paused }))
    }),
    {
      name: 'magiclens-live-refresh',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<LiveRefreshState>
        // Nudge users still on the old 1s default to a saner interval without forcing manual choices.
        if (state.interval === 1000) {
          return { ...state, interval: 5000 as RefreshInterval }
        }
        return state
      }
    }
  )
)
