import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table } from 'antd'
import type { ColumnType, TableProps } from 'antd/es/table'

const STORAGE_PREFIX = 'ml-table-widths:'

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
      return 200
    case 'namespace':
      return 140
    case 'status':
      return 120
    case 'age':
      return 100
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
    <th {...rest} style={{ ...style, position: 'relative', width, userSelect: 'none' }}>
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

function useResizableColumns<T extends object>(
  tableKey: string,
  columns: ColumnType<T>[],
  enabled: boolean
): {
  columns: ColumnType<T>[]
  components: TableProps<T>['components']
  scroll: TableProps<T>['scroll']
} {
  const [widths, setWidths] = useState<Record<string, number>>(() => loadStoredWidths(tableKey))
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  useEffect(() => {
    setWidths(loadStoredWidths(tableKey))
  }, [tableKey])

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
    const totalWidth = resizedColumns.reduce((sum, col) => sum + ((col.width as number) ?? 130), 0)
    return { x: totalWidth }
  }, [enabled, resizedColumns])

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
  /** Set false for tiny inline tables where resize is not useful. */
  resizable?: boolean
}

export function ResizableTable<T extends object>({
  tableKey,
  columns,
  resizable = true,
  scroll: scrollProp,
  components: componentsProp,
  tableLayout,
  ...rest
}: ResizableTableProps<T>): React.JSX.Element {
  const { columns: resizedColumns, components, scroll } = useResizableColumns(
    tableKey,
    (columns ?? []) as ColumnType<T>[],
    resizable
  )

  const mergedScroll =
    resizable && scroll ? (scrollProp ? { ...scroll, ...scrollProp } : scroll) : scrollProp

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

  return (
    <Table<T>
      {...rest}
      columns={resizable ? resizedColumns : columns}
      components={mergedComponents}
      scroll={mergedScroll}
      tableLayout={resizable ? (tableLayout ?? 'fixed') : tableLayout}
    />
  )
}
