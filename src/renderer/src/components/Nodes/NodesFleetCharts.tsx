import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { ClusterMetricsSummary, NodeMetricEntry } from '@shared/types/metrics'
import type { ResourceListItem } from '@shared/types/resource'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { useLiveRefetchInterval } from '../../stores/useLiveRefetchInterval'

interface NodesFleetChartsProps {
  clusterId: string
  isActive: boolean
  nodes: ResourceListItem[]
  metrics: NodeMetricEntry[]
  summary: ClusterMetricsSummary
}

const FILESYSTEM_FILTER = 'fstype!~"tmpfs|overlay|squashfs|nsfs|aufs|iso9660"'

/** Same node-exporter series the node detail disk charts use, fullest mount per node. */
const NODE_DISK_QUERIES = [
  `max by (nodename) ((100 * (1 - node_filesystem_avail_bytes{${FILESYSTEM_FILTER}} / node_filesystem_size_bytes{${FILESYSTEM_FILTER}})) * on(instance) group_left(nodename) node_uname_info)`,
  `max by (node) (100 * (1 - node_filesystem_avail_bytes{${FILESYSTEM_FILTER}} / node_filesystem_size_bytes{${FILESYSTEM_FILTER}}))`
]

function diskPercentByNode(
  data: { result: { metric: Record<string, string>; value?: [number, string] }[] } | undefined
): Map<string, number> {
  const map = new Map<string, number>()
  for (const series of data?.result ?? []) {
    const name = series.metric.nodename || series.metric.node || series.metric.instance
    const raw = series.value?.[1]
    if (!name || raw == null) continue
    const value = Number.parseFloat(raw)
    if (!Number.isFinite(value)) continue
    const pct = Math.max(0, Math.min(100, value))
    const prev = map.get(name)
    if (prev === undefined || pct > prev) map.set(name, pct)
  }
  return map
}

/** Prometheus nodename must be this Kubernetes node, not another scraped VM. */
function diskPercentForNode(nodeName: string, fromProm: Map<string, number> | undefined): number | undefined {
  if (!fromProm || fromProm.size === 0) return undefined
  const direct = fromProm.get(nodeName)
  if (direct !== undefined) return direct
  const host = nodeName.split('.')[0]
  for (const [key, value] of fromProm) {
    const keyHost = key.split('.')[0]
    if (key === host || keyHost === nodeName || keyHost === host) return value
  }
  return undefined
}

function shortName(name: string): string {
  return name.length > 18 ? `${name.slice(0, 16)}…` : name
}

function pct(used: number | undefined, total: number): number | null {
  if (used === undefined || !Number.isFinite(used) || total <= 0) return null
  return Math.round((used / total) * 1000) / 10
}

export function NodesFleetCharts({
  clusterId,
  isActive,
  nodes,
  metrics,
  summary
}: NodesFleetChartsProps): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const tick = isDark ? '#94a3b8' : '#64748b'
  const grid = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)'
  const tooltipStyle = {
    background: 'var(--ml-bg-elevated)',
    border: '1px solid var(--ml-border)',
    borderRadius: 0,
    color: 'var(--ml-text)',
    fontSize: 12
  }

  const byName = useMemo(() => new Map(metrics.map((m) => [m.name, m])), [metrics])
  const refetchInterval = useLiveRefetchInterval(isActive)
  const diskQuery = useQuery({
    queryKey: ['nodes-disk-fullness', clusterId],
    enabled: Boolean(clusterId) && isActive,
    refetchInterval,
    queryFn: async () => {
      for (const query of NODE_DISK_QUERIES) {
        const res = await window.api.prometheus.query({ clusterId, query })
        const map = diskPercentByNode(res.data)
        if (map.size > 0) return map
      }
      return new Map<string, number>()
    }
  })

  const cpuRows = useMemo(() => {
    return nodes
      .map((node) => {
        const metric = byName.get(node.name)
        const value = pct(metric?.cpuUsageCores, metric?.cpuAllocatableCores ?? 0)
        return value == null ? null : { name: shortName(node.name), full: node.name, value }
      })
      .filter((row): row is { name: string; full: string; value: number } => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName])

  const memoryRows = useMemo(() => {
    return nodes
      .map((node) => {
        const metric = byName.get(node.name)
        const value = pct(metric?.memoryUsageBytes, metric?.memoryAllocatableBytes ?? 0)
        return value == null ? null : { name: shortName(node.name), full: node.name, value }
      })
      .filter((row): row is { name: string; full: string; value: number } => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName])

  const podRows = useMemo(
    () =>
      [
        { name: t('nodesOverview.charts.running'), key: 'running', value: summary.runningPods, fill: 'var(--ml-success)' },
        { name: t('nodesOverview.charts.pending'), key: 'pending', value: summary.pendingPods, fill: 'var(--ml-warning)' },
        { name: t('nodesOverview.charts.failed'), key: 'failed', value: summary.failedPods, fill: 'var(--ml-error)' }
      ].filter((row) => row.value > 0),
    [summary.failedPods, summary.pendingPods, summary.runningPods, t]
  )

  const diskRows = useMemo(() => {
    const fromProm = diskQuery.data
    return nodes
      .map((node) => {
        const value = diskPercentForNode(node.name, fromProm) ?? byName.get(node.name)?.diskUsagePercent
        return value == null ? null : { name: shortName(node.name), value: Math.round(value * 10) / 10 }
      })
      .filter((row): row is { name: string; value: number } => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName, diskQuery.data])

  return (
    <div className="ml-nodes-charts">
      <ChartCard title={t('nodesOverview.charts.cpu')}>
        {cpuRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noMetrics')} />
        ) : (
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={cpuRows} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke={grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: tick, fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" width={108} tick={{ fill: tick, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, t('nodesOverview.charts.cpu')]} />
              <Bar dataKey="value" fill="var(--ml-primary)" barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.memory')}>
        {memoryRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noMetrics')} />
        ) : (
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={memoryRows} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke={grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: tick, fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" width={108} tick={{ fill: tick, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, t('nodesOverview.charts.memory')]} />
              <Bar dataKey="value" fill="#6366f1" barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.pods')}>
        {podRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.empty')} />
        ) : (
          <ResponsiveContainer width="100%" height={168}>
            <PieChart>
              <Pie data={podRows} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                {podRows.map((row) => (
                  <Cell key={row.key} fill={row.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.disk')}>
        {diskRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noDisk')} />
        ) : (
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={diskRows} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke={grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: tick, fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" width={108} tick={{ fill: tick, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, t('nodesOverview.charts.disk')]} />
              <Bar dataKey="value" barSize={10}>
                {diskRows.map((row) => (
                  <Cell
                    key={row.name}
                    fill={row.value >= 85 ? '#d94c4c' : row.value >= 70 ? '#e3b341' : '#38bdf8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="ml-nodes-chart">
      <h3 className="ml-nodes-chart__title">{title}</h3>
      {children}
    </section>
  )
}

function Empty({ label }: { label: string }): React.JSX.Element {
  return <p className="ml-nodes-chart__empty">{label}</p>
}
