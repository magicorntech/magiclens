import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table } from 'antd'
import type { ColumnType, TableProps } from 'antd/es/table'

const STORAGE_PREFIX = 'ml-table-widths:'

export function resetStoredTableWidths(tableKey: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${tableKey}`)
  } catch {
    // ignore
  }
}

function loadStoredWidths(tableKey: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

function storeWidths(tableKey: string, widths: Record<string, number>): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, JSON.stringify(widths))
  } catch {
    // Quota or private mode — ignore.
  }
}

function columnKey<T>(col: ColumnType<T>): string | undefined {
  const key = col.key ?? col.dataIndex
  return key != null ? String(key) : undefined
}

function defaultColumnWidth(key: string, col: ColumnType<unknown>): number {
  if (typeof col.width === 'number') return col.width
  switch (key) {
    case 'name':
      return 220
    case 'namespace':
      return 140
    case 'containers':
      return 96
    case 'controlledBy':
      return 180
    case 'node':
      return 150
    case 'qos':
      return 88
    case 'restarts':
      return 88
    case 'ready':
      return 80
    case 'status':
      return 128
    case 'age':
      return 100
    case 'message':
      return 280
    case 'actions':
      return 56
    default:
      return 130
  }
}

type ResizableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  width?: number
  onResize?: (width: number) => void
  onResizeEnd?: () => void
}

function ResizableHeaderCell({
  width,
  onResize,
  onResizeEnd,
  children,
  style,
  ...rest
}: ResizableHeaderCellProps): React.JSX.Element {
  if (!width || !onResize) {
    return (
      <th {...rest} style={style}>
        {children}
      </th>
    )
  }

  return (
    <th
      {...rest}
      style={{
        ...style,
        position: 'relative',
        width,
        minWidth: width,
        maxWidth: width,
        userSelect: 'none'
      }}
    >
      {children}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        className="ml-table-col-resize-handle"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const startX = e.clientX
          const startWidth = width
          const onMove = (ev: MouseEvent): void => {
            onResize(Math.max(48, startWidth + ev.clientX - startX))
          }
          const onUp = (): void => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            onResizeEnd?.()
          }
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }}
      />
    </th>
  )
}

function buildWidthsForColumns<T extends object>(
  tableKey: string,
  columns: ColumnType<T>[]
): Record<string, number> {
  const stored = loadStoredWidths(tableKey)
  const next: Record<string, number> = {}
  for (const col of columns) {
    const key = columnKey(col)
    if (!key) continue
    next[key] = stored[key] ?? defaultColumnWidth(key, col as ColumnType<unknown>)
  }
  return next
}

function columnsSignature<T extends object>(columns: ColumnType<T>[]): string {
  return columns.map((col) => columnKey(col) ?? '').join('\x1f')
}

function useResizableColumns<T extends object>(
  tableKey: string,
  columns: ColumnType<T>[],
  enabled: boolean,
  extraScrollWidth = 0,
  layoutEpoch = 0
): {
  columns: ColumnType<T>[]
  components: TableProps<T>['components']
  scroll: TableProps<T>['scroll']
} {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    buildWidthsForColumns(tableKey, columns)
  )
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  const columnSig = columnsSignature(columns)

  useEffect(() => {
    setWidths(buildWidthsForColumns(tableKey, columns))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns captured via signature
  }, [tableKey, columnSig, layoutEpoch])

  const persist = useCallback(() => {
    storeWidths(tableKey, widthsRef.current)
  }, [tableKey])

  const resizedColumns = useMemo(() => {
    if (!enabled) return columns
    return columns.map((col) => {
      const key = columnKey(col)
      if (!key) return col
      const width = widths[key] ?? defaultColumnWidth(key, col as ColumnType<unknown>)
      return {
        ...col,
        width,
        ellipsis: col.ellipsis ?? true,
        onCell: () =>
          col.ellipsis === false
            ? { className: 'ml-table-cell--rich' }
            : { className: 'ml-table-cell--text' },
        onHeaderCell: () => ({
          width,
          onResize: (nextWidth: number) => {
            setWidths((prev) => ({ ...prev, [key]: nextWidth }))
          },
          onResizeEnd: persist
        })
      }
    })
  }, [columns, enabled, widths, persist])

  const scroll = useMemo<TableProps<T>['scroll']>(() => {
    if (!enabled) return undefined
    const totalWidth =
      resizedColumns.reduce((sum, col) => sum + ((col.width as number) ?? 130), 0) + extraScrollWidth
    return { x: totalWidth }
  }, [enabled, resizedColumns, extraScrollWidth])

  const components = useMemo<TableProps<T>['components']>(
    () =>
      enabled
        ? {
            header: {
              cell: ResizableHeaderCell
            }
          }
        : undefined,
    [enabled]
  )

  return { columns: resizedColumns, components, scroll }
}

export type ResizableTableProps<T extends object> = TableProps<T> & {
  /** Unique key for persisting column widths in localStorage. */
  tableKey: string
  /** Bumps when column layout is reset so widths reload from storage. */
  layoutEpoch?: number
  /** Set false for tiny inline tables where resize is not useful. */
  resizable?: boolean
  /** Enable virtual scrolling for large lists. */
  virtualScroll?: boolean
}

const SELECTION_COLUMN_WIDTH = 48
const TABLE_HEADER_HEIGHT = 41
const TABLE_PAGINATION_HEIGHT = 56

export function ResizableTable<T extends object>({
  tableKey,
  layoutEpoch = 0,
  columns,
  resizable = true,
  virtualScroll = false,
  scroll: scrollProp,
  components: componentsProp,
  tableLayout,
  rowSelection,
  pagination,
  dataSource,
  loading,
  ...rest
}: ResizableTableProps<T>): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [bodyHeight, setBodyHeight] = useState<number | undefined>()

  const selectionWidth = rowSelection
    ? typeof rowSelection.columnWidth === 'number'
      ? rowSelection.columnWidth
      : SELECTION_COLUMN_WIDTH
    : 0

  const { columns: resizedColumns, components, scroll } = useResizableColumns(
    tableKey,
    (columns ?? []) as ColumnType<T>[],
    resizable,
    selectionWidth,
    layoutEpoch
  )

  const columnSig = columnsSignature((columns ?? []) as ColumnType<T>[])
  const dataLength = Array.isArray(dataSource) ? dataSource.length : 0
  const tableInstanceKey = `${tableKey}:${layoutEpoch}:${columnSig}`
  const hasPagination = pagination !== false && pagination != null

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const measure = (): void => {
      const paginationEl = el.querySelector('.ant-table-pagination') as HTMLElement | null
      const reservedPagination = hasPagination
        ? Math.max(paginationEl?.offsetHeight ?? 0, TABLE_PAGINATION_HEIGHT)
        : 0
      const next = Math.max(120, el.clientHeight - TABLE_HEADER_HEIGHT - reservedPagination)
      setBodyHeight((prev) => (prev === next ? prev : next))
    }

    measure()
    const raf = window.requestAnimationFrame(measure)

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const paginationEl = el.querySelector('.ant-table-pagination')
    if (paginationEl) ro.observe(paginationEl)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [pagination, columnSig, dataLength, tableKey, layoutEpoch, hasPagination])

  const mergedScroll =
    resizable && scroll
      ? {
          ...scroll,
          ...scrollProp,
          ...(bodyHeight != null ? { y: scrollProp?.y ?? bodyHeight } : {})
        }
      : scrollProp

  const rowCount = dataLength
  const useVirtual = virtualScroll && rowCount > 100
  const finalScroll = useVirtual ? { ...mergedScroll, y: mergedScroll?.y ?? bodyHeight ?? 520 } : mergedScroll

  const mergedRowSelection = rowSelection
    ? { ...rowSelection, columnWidth: rowSelection.columnWidth ?? SELECTION_COLUMN_WIDTH }
    : undefined

  const mergedComponents =
    resizable && components
      ? {
          ...componentsProp,
          header: {
            ...componentsProp?.header,
            cell: ResizableHeaderCell
          }
        }
      : componentsProp

  const mergedLoading =
    loading === true ? { spinning: true, size: 'large' as const } : loading

  return (
    <div ref={wrapRef} className="ml-table-wrap">
      <Table<T>
        key={tableInstanceKey}
        {...rest}
        dataSource={dataSource}
        loading={mergedLoading}
        rowSelection={mergedRowSelection}
        pagination={pagination}
        className={`ml-table${rest.className ? ` ${rest.className}` : ''}`}
        columns={resizable ? resizedColumns : columns}
        components={mergedComponents}
        scroll={finalScroll}
        virtual={useVirtual}
        tableLayout={resizable ? (tableLayout ?? 'fixed') : tableLayout}
      />
    </div>
  )
}
