import { useEffect, useState } from 'react'
import type { TablePaginationConfig } from 'antd/es/table/interface'

export const TABLE_PAGE_SIZE_OPTIONS = ['10', '20', '30', '50', '100', '200'] as const
export const DEFAULT_TABLE_PAGE_SIZE = 20

export interface TablePaginationState {
  current: number
  pageSize: number
}

export function buildTablePagination(
  state: TablePaginationState,
  total?: number
): TablePaginationConfig {
  return {
    current: state.current,
    pageSize: state.pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: [...TABLE_PAGE_SIZE_OPTIONS],
    showTotal: (count) => `${count} items`
  }
}

export function readPaginationChange(config: TablePaginationConfig): TablePaginationState {
  return {
    current: config.current ?? 1,
    pageSize: config.pageSize ?? DEFAULT_TABLE_PAGE_SIZE
  }
}

export function useTablePagination(resetDeps: readonly unknown[]): {
  pagination: TablePaginationState
  setPagination: React.Dispatch<React.SetStateAction<TablePaginationState>>
  paginationProps: (total?: number) => TablePaginationConfig
} {
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: DEFAULT_TABLE_PAGE_SIZE
  })

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, resetDeps)

  return {
    pagination,
    setPagination,
    paginationProps: (total?: number) => buildTablePagination(pagination, total)
  }
}
