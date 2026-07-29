import { useEffect, useState } from 'react'
import type { TablePaginationConfig } from 'antd/es/table/interface'

export const TABLE_PAGE_SIZE_OPTIONS = ['10', '20', '30', '50', '60', '70', '100', '200'] as const
export const DEFAULT_TABLE_PAGE_SIZE = 20
export const EMBEDDED_TABLE_PAGE_SIZE = 20

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
  const raw = config.pageSize ?? DEFAULT_TABLE_PAGE_SIZE
  const pageSize = TABLE_PAGE_SIZE_OPTIONS.includes(String(raw) as (typeof TABLE_PAGE_SIZE_OPTIONS)[number])
    ? raw
    : DEFAULT_TABLE_PAGE_SIZE
  return {
    current: config.current ?? 1,
    pageSize
  }
}

export function embeddedTablePagination(
  state: TablePaginationState,
  total?: number
): TablePaginationConfig {
  return {
    ...buildTablePagination(state, total),
    size: 'small',
    hideOnSinglePage: false
  }
}

export function useTablePagination(
  resetDeps: readonly unknown[],
  options?: { defaultPageSize?: number }
): {
  pagination: TablePaginationState
  setPagination: React.Dispatch<React.SetStateAction<TablePaginationState>>
  paginationProps: (total?: number) => TablePaginationConfig
} {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_TABLE_PAGE_SIZE
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: defaultPageSize
  })

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize: defaultPageSize }))
  }, [...resetDeps, defaultPageSize])

  return {
    pagination,
    setPagination,
    paginationProps: (total?: number) => buildTablePagination(pagination, total)
  }
}
