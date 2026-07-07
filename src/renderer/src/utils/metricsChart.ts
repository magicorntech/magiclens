import type { MetricsSeries } from '@shared/types/metrics'
import type { PodMetricsChartPoint } from '../components/Pod/PodMetricsChart'

export function seriesToChartPoints(series: MetricsSeries[] | undefined): {
  points: PodMetricsChartPoint[]
  seriesNames: string[]
} {
  if (!series || series.length === 0) return { points: [], seriesNames: [] }

  const seriesNames = series.map((s) => s.name)
  const byTime = new Map<number, Record<string, number>>()

  for (const item of series) {
    for (const point of item.points) {
      const row = byTime.get(point.timestamp) ?? {}
      row[item.name] = point.value
      byTime.set(point.timestamp, row)
    }
  }

  const points = [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, values]) => ({ t, values }))

  return { points, seriesNames }
}
