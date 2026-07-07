export type MetricsPresetRange = '5m' | '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h'

export interface MetricsCustomRange {
  type: 'custom'
  start: number
  end: number
}

export type MetricsTimeRange = { type: 'preset'; preset: MetricsPresetRange } | MetricsCustomRange

export const METRICS_PRESET_OPTIONS: { value: MetricsPresetRange; label: string }[] = [
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '30m', label: 'Last 30 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '3h', label: 'Last 3 hours' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '12h', label: 'Last 12 hours' },
  { value: '24h', label: 'Last 24 hours' }
]

export const DEFAULT_METRICS_TIME_RANGE: MetricsTimeRange = { type: 'preset', preset: '30m' }

export const HISTORICAL_METRICS_WARNING = 'Historical metrics require Prometheus integration.'

const PRESET_SECONDS: Record<MetricsPresetRange, number> = {
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 60 * 60,
  '3h': 3 * 60 * 60,
  '6h': 6 * 60 * 60,
  '12h': 12 * 60 * 60,
  '24h': 24 * 60 * 60
}

export function resolveMetricsWindow(range: MetricsTimeRange, nowSec = Math.floor(Date.now() / 1000)): {
  start: number
  end: number
  step: string
  durationSeconds: number
} {
  const end = range.type === 'custom' ? range.end : nowSec
  const durationSeconds = range.type === 'custom' ? Math.max(60, end - range.start) : PRESET_SECONDS[range.preset]
  const start = range.type === 'custom' ? range.start : end - durationSeconds
  return { start, end, step: stepForDuration(durationSeconds), durationSeconds }
}

function stepForDuration(durationSeconds: number): string {
  if (durationSeconds <= 15 * 60) return '15s'
  if (durationSeconds <= 60 * 60) return '1m'
  if (durationSeconds <= 6 * 60 * 60) return '2m'
  if (durationSeconds <= 24 * 60 * 60) return '5m'
  return '15m'
}

export function rateIntervalForDuration(durationSeconds: number): string {
  if (durationSeconds <= 15 * 60) return '1m'
  if (durationSeconds <= 60 * 60) return '2m'
  return '5m'
}
