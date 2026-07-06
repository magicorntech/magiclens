// Parses the common Kubernetes resource.Quantity suffixes actually emitted for
// capacity/allocatable/usage fields. Does not handle exotic scientific-notation
// quantity forms (not seen in practice for these particular fields).

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
