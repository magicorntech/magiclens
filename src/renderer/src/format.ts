export function formatCores(cores: number): string {
  return `${cores.toFixed(2)} cores`
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

export function percentOf(value: number | undefined, total: number): number | undefined {
  if (value === undefined || total <= 0) return undefined
  return Math.min(100, Math.round((value / total) * 100))
}

/** Table sorter: ascend = youngest first; Ant Design flips for descend (oldest first). */
export function compareAgeTimestamps(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(b).getTime() - new Date(a).getTime()
}
