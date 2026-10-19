/** Kubernetes resource.Quantity helpers used by both main and renderer. */

export function parseCpuQuantity(qty: string | undefined): number {
  if (!qty) return 0
  if (qty.endsWith('n')) return parseFloat(qty) / 1e9
  if (qty.endsWith('u')) return parseFloat(qty) / 1e6
  if (qty.endsWith('m')) return parseFloat(qty) / 1e3
  return parseFloat(qty) || 0
}

const MEMORY_UNITS: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
  '': 1
}

export function parseMemoryQuantity(qty: string | undefined): number {
  if (!qty) return 0
  const match = qty.match(/^([0-9.]+)([A-Za-z]*)$/)
  if (!match) return 0
  const [, num, unit] = match
  return (parseFloat(num) || 0) * (MEMORY_UNITS[unit] ?? 1)
}

/** Usage as a percent of request. Null when there is no request to compare. */
export function usagePercent(usage: number, request: number): number | null {
  if (!(request > 0) || !Number.isFinite(usage)) return null
  return Math.round((usage / request) * 1000) / 10
}
