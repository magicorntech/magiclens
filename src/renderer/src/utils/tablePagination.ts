import { useEffect, useState } from 'react'
import type { TablePaginationConfig } from 'antd/es/table/interface'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, useTablePageSizeStore } from '../stores/tablePageSizeStore'

export { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS }
export const EMBEDDED_TABLE_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE

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
  const storedPageSize = useTablePageSizeStore((s) => s.pageSize)
  const defaultPageSize = options?.defaultPageSize ?? storedPageSize
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
