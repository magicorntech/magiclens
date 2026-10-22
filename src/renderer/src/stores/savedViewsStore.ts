import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ResourceKind } from '@shared/resourceKinds'
import type { TableSortState } from '../utils/tableSort'

export interface SavedResourceView {
  id: string
  name: string
  kind: ResourceKind
  namespace: string
  search: string
  sort: TableSortState
  clusterId: string
  createdAt: string
  lastUsedAt: string
}

export interface PendingViewApply {
  clusterId: string
  kind: ResourceKind
  search: string
  sort: TableSortState
}

interface SavedViewsState {
  views: SavedResourceView[]
  pendingApply: PendingViewApply | null
  saveView: (input: Omit<SavedResourceView, 'id' | 'createdAt' | 'lastUsedAt'>) => SavedResourceView
  updateView: (id: string, patch: Partial<Omit<SavedResourceView, 'id' | 'createdAt'>>) => void
  removeView: (id: string) => void
  touchView: (id: string) => void
  setPendingApply: (pending: PendingViewApply | null) => void
}

function uid(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

const MAX_VIEWS = 40

type PersistedSavedViews = {
  views: SavedResourceView[]
}

export function migrateSavedViews(persisted: unknown): PersistedSavedViews {
  const state = (persisted ?? {}) as { views?: unknown }
  const raw = Array.isArray(state.views) ? state.views : []
  const views = raw.map((entry) => {
    const view = (entry !== null && typeof entry === 'object' ? entry : {}) as Partial<SavedResourceView>
    return {
      ...view,
      clusterId: typeof view.clusterId === 'string' ? view.clusterId : ''
    } as SavedResourceView
  })
  return { ...state, views }
}

export function savedViewAppliesOnCluster(
  view: Pick<SavedResourceView, 'clusterId'>,
  clusterId: string
): boolean {
  return view.clusterId === '' || view.clusterId === clusterId
}

export function savedViewsForCluster(
  views: readonly SavedResourceView[],
  clusterId: string
): { cluster: SavedResourceView[]; legacy: SavedResourceView[] } {
  const cluster: SavedResourceView[] = []
  const legacy: SavedResourceView[] = []
  for (const view of views) {
    if (view.clusterId === '') legacy.push(view)
    else if (view.clusterId === clusterId) cluster.push(view)
  }
  return { cluster, legacy }
}

export const useSavedViewsStore = create<SavedViewsState>()(
  persist(
    (set) => ({
      views: [],
      pendingApply: null,
      saveView: (input) => {
        const now = new Date().toISOString()
        const view: SavedResourceView = {
          ...input,
          id: uid(),
          createdAt: now,
          lastUsedAt: now
        }
        set((state) => ({ views: [view, ...state.views].slice(0, MAX_VIEWS) }))
        return view
      },
      updateView: (id, patch) =>
        set((state) => ({
          views: state.views.map((view) => (view.id === id ? { ...view, ...patch } : view))
        })),
      removeView: (id) => set((state) => ({ views: state.views.filter((view) => view.id !== id) })),
      touchView: (id) => {
        const now = new Date().toISOString()
        set((state) => ({
          views: state.views.map((view) => (view.id === id ? { ...view, lastUsedAt: now } : view))
        }))
      },
      setPendingApply: (pendingApply) => set({ pendingApply })
    }),
    {
      name: 'magiclens-saved-views',
      version: 1,
      migrate: migrateSavedViews,
      partialize: (state) => ({ views: state.views })
    }
  )
)

export function viewsMatchCurrent(
  view: SavedResourceView,
  kind: ResourceKind,
  namespace: string,
  search: string,
  sort: TableSortState
): boolean {
  return (
    view.kind === kind &&
    view.namespace === namespace &&
    view.search === search &&
    (view.sort.columnKey ?? '') === (sort.columnKey ?? '') &&
    (view.sort.order ?? null) === (sort.order ?? null)
  )
}
