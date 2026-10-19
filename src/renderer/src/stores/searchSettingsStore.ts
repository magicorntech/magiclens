import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GLOBAL_SEARCH_TYPES, type GlobalSearchType } from '@shared/types/search'

export type SearchResultLimit = 8 | 15 | 30

interface SearchSettingsState {
  enabledTypes: GlobalSearchType[]
  limitPerType: SearchResultLimit
  searchAllConnected: boolean
  rememberRecent: boolean
  recent: string[]
  toggleType: (type: GlobalSearchType) => void
  setAllTypes: (on: boolean) => void
  setLimit: (limit: SearchResultLimit) => void
  setSearchAllConnected: (value: boolean) => void
  setRememberRecent: (value: boolean) => void
  pushRecent: (query: string) => void
  clearRecent: () => void
}

export const useSearchSettingsStore = create<SearchSettingsState>()(
  persist(
    (set, get) => ({
      enabledTypes: [...GLOBAL_SEARCH_TYPES],
      limitPerType: 15,
      searchAllConnected: false,
      rememberRecent: true,
      recent: [],
      toggleType: (type) =>
        set((state) => ({
          enabledTypes: state.enabledTypes.includes(type)
            ? state.enabledTypes.filter((item) => item !== type)
            : [...state.enabledTypes, type]
        })),
      setAllTypes: (on) => set({ enabledTypes: on ? [...GLOBAL_SEARCH_TYPES] : [] }),
      setLimit: (limitPerType) => set({ limitPerType }),
      setSearchAllConnected: (searchAllConnected) => set({ searchAllConnected }),
      setRememberRecent: (rememberRecent) =>
        set({ rememberRecent, recent: rememberRecent ? get().recent : [] }),
      pushRecent: (query) => {
        const text = query.trim()
        if (!text || !get().rememberRecent) return
        set((state) => ({
          recent: [text, ...state.recent.filter((item) => item !== text)].slice(0, 8)
        }))
      },
      clearRecent: () => set({ recent: [] })
    }),
    { name: 'magiclens-search-settings' }
  )
)
