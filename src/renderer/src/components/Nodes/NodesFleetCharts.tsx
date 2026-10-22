import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { ClusterMetricsSummary, NodeMetricEntry } from '@shared/types/metrics'
import type { ResourceListItem } from '@shared/types/resource'
import { useClusterStore } from '../../stores/clusterStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { useLiveRefetchInterval } from '../../stores/useLiveRefetchInterval'
import { formatBytes, formatCores } from '../../format'

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

function labelName(name: string): string {
  if (name.length <= 22) return name
  return `…${name.slice(-20)}`
}

function tickName(name: string): string {
  const head = name.split('.')[0]
  if (head.length <= 10) return head
  return head.slice(-9)
}

interface UsageRow {
  name: string
  full: string
  value: number
  unit: string
}

interface CpuRow {
  name: string
  full: string
  percent: number
  used: number
  cap: number
}

interface MemRow {
  name: string
  full: string
  gib: number
  used: number
  cap: number
  percent: number
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
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const openNode = (name: string): void => {
    navigateToResource(clusterId, { kind: 'Nodes', namespace: '', name })
  }
  const tick = isDark ? '#94a3b8' : '#64748b'
  const grid = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)'

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
        const used = metric?.cpuUsageCores
        const cap = metric?.cpuAllocatableCores ?? 0
        const percent = pct(used, cap)
        if (percent == null || used === undefined) return null
        return { name: labelName(node.name), full: node.name, percent, used, cap }
      })
      .filter((row): row is CpuRow => row != null)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6)
  }, [nodes, byName])

  const memoryRows = useMemo(() => {
    return nodes
      .map((node) => {
        const metric = byName.get(node.name)
        const used = metric?.memoryUsageBytes
        const cap = metric?.memoryAllocatableBytes ?? 0
        const percent = pct(used, cap)
        if (percent == null || used === undefined) return null
        return {
          name: tickName(node.name),
          full: node.name,
          gib: Math.round((used / 1024 ** 3) * 10) / 10,
          used,
          cap,
          percent
        }
      })
      .filter((row): row is MemRow => row != null)
      .sort((a, b) => b.gib - a.gib)
      .slice(0, 6)
  }, [nodes, byName])

  const podRows = useMemo(
    () =>
      [
        { name: t('nodesOverview.charts.running'), full: t('nodesOverview.charts.running'), key: 'running', value: summary.runningPods, unit: '', fill: 'var(--ml-success)' },
        { name: t('nodesOverview.charts.pending'), full: t('nodesOverview.charts.pending'), key: 'pending', value: summary.pendingPods, unit: '', fill: 'var(--ml-warning)' },
        { name: t('nodesOverview.charts.failed'), full: t('nodesOverview.charts.failed'), key: 'failed', value: summary.failedPods, unit: '', fill: 'var(--ml-error)' }
      ],
    [summary.failedPods, summary.pendingPods, summary.runningPods, t]
  )

  const diskRows = useMemo(() => {
    const fromProm = diskQuery.data
    return nodes
      .map((node) => {
        const value = diskPercentForNode(node.name, fromProm) ?? byName.get(node.name)?.diskUsagePercent
        return value == null
          ? null
          : { name: tickName(node.name), full: node.name, value: Math.round(value * 10) / 10, unit: '%' }
      })
      .filter((row): row is UsageRow => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [nodes, byName, diskQuery.data])

  const busiestCpu = cpuRows[0]
  const largestMemory = memoryRows[0]
  const fullestDisk = diskRows[0]?.value

  return (
    <div className="ml-nodes-charts">
      <ChartCard
        title={t('nodesOverview.charts.cpu')}
        hint={cpuRows.length ? t('nodesOverview.charts.clickNode') : undefined}
        stat={busiestCpu ? formatCores(busiestCpu.used) : undefined}
      >
        {cpuRows.length === 0 ? <Empty label={t('nodesOverview.charts.noMetrics')} /> : <CpuRanks rows={cpuRows} onOpen={openNode} />}
      </ChartCard>

      <ChartCard
        title={t('nodesOverview.charts.memory')}
        hint={memoryRows.length ? t('nodesOverview.charts.clickNode') : undefined}
        stat={largestMemory ? formatBytes(largestMemory.used) : undefined}
      >
        {memoryRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noMetrics')} />
        ) : (
          <MemoryColumns rows={memoryRows} tick={tick} grid={grid} onOpen={openNode} />
        )}
      </ChartCard>

      <ChartCard
        title={t('nodesOverview.charts.pods')}
        hint={t('nodesOverview.charts.clickPods')}
      >
        <PodRing rows={podRows} onOpen={() => openResourceKind(clusterId, 'Pods')} />
      </ChartCard>

      <ChartCard
        title={t('nodesOverview.charts.disk')}
        hint={diskRows.length ? t('nodesOverview.charts.clickNode') : undefined}
        stat={fullestDisk != null ? `${fullestDisk}%` : undefined}
      >
        {diskRows.length === 0 ? <Empty label={t('nodesOverview.charts.noDisk')} /> : <DiskMeters rows={diskRows} onOpen={openNode} />}
      </ChartCard>
    </div>
  )
}

function CpuRanks({ rows, onOpen }: { rows: CpuRow[]; onOpen: (name: string) => void }): React.JSX.Element {
  return (
    <ul className="ml-nodes-ranks">
      {rows.map((row) => (
        <li key={row.full}>
          <button type="button" className="ml-nodes-rank" onClick={() => onOpen(row.full)} title={row.full}>
            <span className="ml-nodes-rank__name">{row.name}</span>
            <span className="ml-nodes-rank__track">
              <span className={`ml-nodes-rank__fill${toneClass(row.percent)}`} style={{ width: `${Math.min(row.percent, 100)}%` }} />
            </span>
            <span className="ml-nodes-rank__value">
              {row.used.toFixed(1)}
              <span> / {row.cap.toFixed(0)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function MemoryColumns({
  rows,
  tick,
  grid,
  onOpen
}: {
  rows: MemRow[]
  tick: string
  grid: string
  onOpen: (name: string) => void
}): React.JSX.Element {
  return (
    <div className="ml-nodes-chart__plot" onMouseDown={(event) => event.preventDefault()}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ left: 0, right: 4, top: 8, bottom: 4 }} accessibilityLayer={false}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: tick, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={46}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fill: tick, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(value: number) => `${value}`}
          />
          <Tooltip
            cursor={false}
            isAnimationActive={false}
            wrapperStyle={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as MemRow
              return (
                <div className="ml-nodes-chart__tip">
                  <span className="ml-nodes-chart__tip-name">{row.full}</span>
                  <span className="ml-nodes-chart__tip-value">
                    {formatBytes(row.used)} / {formatBytes(row.cap)} · {row.percent}%
                  </span>
                </div>
              )
            }}
          />
          <Bar
            dataKey="gib"
            barSize={22}
            fill="#e3b341"
            isAnimationActive={false}
            activeBar={false}
            onClick={(bar) => {
              const row = ('payload' in bar ? bar.payload : bar) as MemRow
              if (row.full) onOpen(row.full)
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PodRing({
  rows,
  onOpen
}: {
  rows: Array<{ name: string; key: string; value: number; fill: string }>
  onOpen: () => void
}): React.JSX.Element {
  return (
    <div className="ml-nodes-podring">
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          className={`ml-nodes-podorb${row.value === 0 ? ' is-zero' : ''}`}
          style={{ '--ml-pod-orb': row.fill } as React.CSSProperties}
          onClick={onOpen}
        >
          <span className="ml-nodes-podorb__ring">
            <strong>{row.value}</strong>
          </span>
          <span className="ml-nodes-podorb__label">{row.name}</span>
        </button>
      ))}
    </div>
  )
}

function DiskMeters({ rows, onOpen }: { rows: UsageRow[]; onOpen: (name: string) => void }): React.JSX.Element {
  return (
    <div className="ml-nodes-meters">
      {rows.map((row) => (
        <button key={row.full} type="button" className="ml-nodes-meter" onClick={() => onOpen(row.full)} title={row.full}>
          <span className="ml-nodes-meter__track">
            <span className={`ml-nodes-meter__fill${toneClass(row.value)}`} style={{ height: `${Math.min(row.value, 100)}%` }} />
          </span>
          <span className="ml-nodes-meter__pct">{Math.round(row.value)}%</span>
          <span className="ml-nodes-meter__name">{row.name}</span>
        </button>
      ))}
    </div>
  )
}

function toneClass(value: number): string {
  if (value >= 85) return ' is-hot'
  if (value >= 70) return ' is-warm'
  return ''
}

function ChartCard({
  title,
  hint,
  stat,
  children
}: {
  title: string
  hint?: string
  stat?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="ml-nodes-chart">
      <header className="ml-nodes-chart__head">
        <div>
          <h3 className="ml-nodes-chart__title">{title}</h3>
          {hint ? <p className="ml-nodes-chart__hint">{hint}</p> : null}
        </div>
        {stat ? <span className="ml-nodes-chart__stat">{stat}</span> : null}
      </header>
      {children}
    </section>
  )
}

function Empty({ label }: { label: string }): React.JSX.Element {
  return <p className="ml-nodes-chart__empty">{label}</p>
}
