import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_PREFIX = 'ml-table-columns:'

export interface ColumnPref {
  key: string
  visible: boolean
  order: number
}

function loadPrefs(tableKey: string): ColumnPref[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed as ColumnPref[]
  } catch {
    return null
  }
}

function savePrefs(tableKey: string, prefs: ColumnPref[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

function defaultPrefsFor(columnKeys: string[]): ColumnPref[] {
  return columnKeys.map((key, i) => ({ key, visible: true, order: i }))
}

/** Merges stored prefs with the current column schema — drops stale keys and appends new columns. */
function mergeColumnPrefs(tableKey: string, columnKeys: string[]): ColumnPref[] {
  const defaults = defaultPrefsFor(columnKeys)
  if (columnKeys.length === 0) return defaults

  const stored = loadPrefs(tableKey)
  if (!stored) return defaults

  const keySet = new Set(columnKeys)
  const merged = columnKeys.map((key, i) => {
    const found = stored.find((p) => p.key === key)
    return found
      ? { key, visible: found.visible, order: found.order ?? i }
      : { key, visible: true, order: i }
  })

  return merged
    .filter((p) => keySet.has(p.key))
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i }))
}

export function useTableColumnPrefs(
  tableKey: string,
  columnKeys: string[]
): {
  visibleKeys: string[]
  prefs: ColumnPref[]
  toggleColumn: (key: string) => void
  reorderColumns: (fromKey: string, toKey: string) => void
  resetColumns: () => void
} {
  const columnKeysSignature = columnKeys.join('\x1f')

  const defaultPrefs = useMemo(
    () => defaultPrefsFor(columnKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable signature for column key list
    [columnKeysSignature]
  )

  const [prefs, setPrefs] = useState<ColumnPref[]>(() => mergeColumnPrefs(tableKey, columnKeys))

  useEffect(() => {
    setPrefs(mergeColumnPrefs(tableKey, columnKeys))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columnKeys read via signature
  }, [tableKey, columnKeysSignature])

  const visibleKeys = useMemo(
    () =>
      [...prefs]
        .sort((a, b) => a.order - b.order)
        .filter((p) => p.visible)
        .map((p) => p.key),
    [prefs]
  )

  const toggleColumn = useCallback(
    (key: string) => {
      setPrefs((prev) => {
        const next = prev.map((p) => (p.key === key ? { ...p, visible: !p.visible } : p))
        savePrefs(tableKey, next)
        return next
      })
    },
    [tableKey]
  )

  const reorderColumns = useCallback(
    (fromKey: string, toKey: string) => {
      if (fromKey === toKey) return
      setPrefs((prev) => {
        const sorted = [...prev].sort((a, b) => a.order - b.order)
        const fromIdx = sorted.findIndex((p) => p.key === fromKey)
        const toIdx = sorted.findIndex((p) => p.key === toKey)
        if (fromIdx < 0 || toIdx < 0) return prev
        const [moved] = sorted.splice(fromIdx, 1)
        sorted.splice(toIdx, 0, moved)
        const next = sorted.map((p, i) => ({ ...p, order: i }))
        savePrefs(tableKey, next)
        return next
      })
    },
    [tableKey]
  )

  const resetColumns = useCallback(() => {
    setPrefs(defaultPrefs)
    savePrefs(tableKey, defaultPrefs)
  }, [defaultPrefs, tableKey])

  return { visibleKeys, prefs, toggleColumn, reorderColumns, resetColumns }
}
