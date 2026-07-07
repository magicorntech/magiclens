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
  const pct = (value / total) * 100
  return Math.min(100, Math.round(pct * 10) / 10)
}

export function nodeResourcePercent(
  usage: number | undefined,
  allocatable: number,
  capacity: number
): number | undefined {
  const total = allocatable > 0 ? allocatable : capacity
  return percentOf(usage, total)
}
