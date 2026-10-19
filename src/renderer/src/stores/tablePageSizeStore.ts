import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const TABLE_PAGE_SIZE_OPTIONS = ['10', '20', '30', '50', '60', '70', '100', '200'] as const
export const DEFAULT_TABLE_PAGE_SIZE = 20

function isTablePageSize(value: unknown): value is number {
  return TABLE_PAGE_SIZE_OPTIONS.includes(String(value) as (typeof TABLE_PAGE_SIZE_OPTIONS)[number])
}

interface TablePageSizeState {
  pageSize: number
  setPageSize: (pageSize: number) => void
}

export const useTablePageSizeStore = create<TablePageSizeState>()(
  persist(
    (set) => ({
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      setPageSize: (pageSize) => {
        if (!isTablePageSize(pageSize)) return
        set({ pageSize })
      }
    }),
    {
      name: 'magiclens-table-page-size',
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<TablePageSizeState>
        return {
          ...current,
          pageSize: isTablePageSize(saved.pageSize) ? saved.pageSize : DEFAULT_TABLE_PAGE_SIZE
        }
      }
    }
  )
)
