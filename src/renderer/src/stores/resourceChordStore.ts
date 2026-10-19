import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ResourceKind } from '@shared/resourceKinds'
import {
  buildChordTemplate,
  normalizeChordKeys,
  normalizeResourceChords,
  type ResourceChord
} from '@shared/resourceChords'

interface ResourceChordState {
  chords: ResourceChord[]
  /** Keys pressed so far while a chord is in progress. */
  pending: string[]
  setPending: (keys: string[]) => void
  upsert: (chord: ResourceChord) => void
  remove: (id: string) => void
  applyTemplate: () => void
}

function uid(): string {
  return `chord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export const useResourceChordStore = create<ResourceChordState>()(
  persist(
    (set, get) => ({
      chords: [],
      pending: [],
      setPending: (pending) => set({ pending }),
      upsert: (chord) =>
        set((state) => {
          const keys = normalizeChordKeys(chord.keys)
          const next = { ...chord, keys }
          const exists = state.chords.some((item) => item.id === chord.id)
          return {
            chords: exists
              ? state.chords.map((item) => (item.id === chord.id ? next : item))
              : [...state.chords, next]
          }
        }),
      remove: (id) => set((state) => ({ chords: state.chords.filter((item) => item.id !== id) })),
      applyTemplate: () => set({ chords: buildChordTemplate(get().chords) })
    }),
    {
      name: 'magiclens-resource-chords',
      partialize: (state) => ({ chords: state.chords }),
      merge: (persisted, current) => {
        const stored = persisted as { chords?: unknown } | undefined
        return {
          ...current,
          chords: normalizeResourceChords(stored?.chords)
        }
      }
    }
  )
)

export function newResourceChord(kind: ResourceKind = 'Pods'): ResourceChord {
  return { id: uid(), kind, keys: [] }
}
