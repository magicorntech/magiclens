import type { ResourceListItem } from '@shared/types/resource'

/** Ascend = youngest first; Ant Design flips for descend. */
export function compareAgeTimestamps(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(b).getTime() - new Date(a).getTime()
}

function parseFraction(value: string): { num: number; den: number } {
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!match) return { num: 0, den: 0 }
  return { num: Number(match[1]), den: Number(match[2]) }
}

/** Ascend = lowest ready ratio first (0/3 before 2/3 before 3/3). */
export function compareFractionStrings(a: string, b: string): number {
  const fa = parseFraction(a)
  const fb = parseFraction(b)
  const ratioA = fa.den > 0 ? fa.num / fa.den : 0
  const ratioB = fb.den > 0 ? fb.num / fb.den : 0
  if (ratioA !== ratioB) return ratioA - ratioB
  if (fa.num !== fb.num) return fa.num - fb.num
  return fa.den - fb.den
}

export function compareNumericStrings(a: string, b: string): number {
  const na = Number.parseFloat(a.replace(/[^\d.-]/g, ''))
  const nb = Number.parseFloat(b.replace(/[^\d.-]/g, ''))
  const va = Number.isFinite(na) ? na : 0
  const vb = Number.isFinite(nb) ? nb : 0
  return va - vb
}

function parseStorageBytes(value: string): number {
  const trimmed = value.trim()
  const match = trimmed.match(/^([\d.]+)\s*(Ti|Gi|Mi|Ki)?B?$/i)
  if (!match) return compareNumericStrings(trimmed, '0')
  const amount = Number.parseFloat(match[1])
  const unit = (match[2] ?? '').toUpperCase()
  const multipliers: Record<string, number> = { '': 1, KI: 1024, MI: 1024 ** 2, GI: 1024 ** 3, TI: 1024 ** 4 }
  return amount * (multipliers[unit] ?? 1)
}

export function compareStorageCapacity(a: string, b: string): number {
  return parseStorageBytes(a) - parseStorageBytes(b)
}

const FRACTION_COLUMNS = new Set(['ready', 'completions'])
const NUMERIC_COLUMNS = new Set([
  'restarts',
  'keys',
  'webhooks',
  'validations',
  'endpoints',
  'rules',
  'replicas',
  'value',
  'releaseCount',
  'allowedDisruptions',
  'minAvailable'
])
const STORAGE_COLUMNS = new Set(['capacity'])

export function compareColumnValues(key: string, a: string, b: string): number {
  if (FRACTION_COLUMNS.has(key)) return compareFractionStrings(a, b)
  if (NUMERIC_COLUMNS.has(key)) return compareNumericStrings(a, b)
  if (STORAGE_COLUMNS.has(key)) return compareStorageCapacity(a, b)
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function columnValueSorter(key: string) {
  return (a: ResourceListItem, b: ResourceListItem): number =>
    compareColumnValues(key, a.columns[key] ?? '', b.columns[key] ?? '')
}

export function statusSorter(a: ResourceListItem, b: ResourceListItem): number {
  return a.statusText.localeCompare(b.statusText, undefined, { sensitivity: 'base' })
}

export interface TableSortState {
  columnKey?: string
  order?: 'ascend' | 'descend' | null
}
