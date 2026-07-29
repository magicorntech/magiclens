import type { TablePaginationConfig } from 'antd/es/table/interface'
import type { TableProps } from 'antd/es/table'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from './tablePagination'

export const TABLE_HEADER_HEIGHT = 41
export const TABLE_PAGINATION_HEIGHT = 56

export const TABLE_ROW_HEIGHTS = {
  small: 39,
  middle: 47,
  large: 55
} as const

export type TableSize = keyof typeof TABLE_ROW_HEIGHTS

export function normalizePageSize(raw: number | undefined): number {
  if (raw == null) return DEFAULT_TABLE_PAGE_SIZE
  return TABLE_PAGE_SIZE_OPTIONS.includes(String(raw) as (typeof TABLE_PAGE_SIZE_OPTIONS)[number])
    ? raw
    : DEFAULT_TABLE_PAGE_SIZE
}

export function getTablePageSize(pagination: TableProps<unknown>['pagination']): number {
  if (pagination === false || pagination == null) return DEFAULT_TABLE_PAGE_SIZE
  if (typeof pagination === 'object') return normalizePageSize(pagination.pageSize)
  return DEFAULT_TABLE_PAGE_SIZE
}

export function visibleTableRows(totalRows: number, pageSize: number): number {
  if (totalRows <= 0) return 1
  return Math.min(totalRows, pageSize)
}

export function estimateTableBodyHeight(
  totalRows: number,
  pageSize: number,
  size: TableSize = 'middle'
): number {
  const rows = visibleTableRows(totalRows, pageSize)
  return rows * TABLE_ROW_HEIGHTS[size]
}

export function estimateTableTotalHeight(
  totalRows: number,
  pageSize: number,
  size: TableSize = 'middle',
  hasPagination = true
): number {
  return (
    TABLE_HEADER_HEIGHT +
    estimateTableBodyHeight(totalRows, pageSize, size) +
    (hasPagination ? TABLE_PAGINATION_HEIGHT : 0)
  )
}

export function paginationFitsPageSize(pagination: TablePaginationConfig | boolean | undefined): boolean {
  if (pagination === false || pagination == null) return false
  if (typeof pagination !== 'object') return false
  return pagination.showSizeChanger !== false
}
