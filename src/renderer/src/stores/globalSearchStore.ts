import { create } from 'zustand'
import type { GlobalSearchType } from '@shared/types/search'

interface GlobalSearchStoreState {
  open: boolean
  query: string
  typeFilter: GlobalSearchType | null
  openSearch: () => void
  closeSearch: () => void
  setQuery: (query: string) => void
  setTypeFilter: (type: GlobalSearchType | null) => void
  toggleTypeFilter: (type: GlobalSearchType) => void
}

export const useGlobalSearchStore = create<GlobalSearchStoreState>((set) => ({
  open: false,
  query: '',
  typeFilter: null,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false, query: '', typeFilter: null }),
  setQuery: (query) => set({ query }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  toggleTypeFilter: (type) =>
    set((state) => ({ typeFilter: state.typeFilter === type ? null : type }))
}))
