import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
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
  if (name.length <= 18) return name
  return `…${name.slice(-16)}`
}

function usageFill(value: number): string {
  if (value >= 85) return '#e85d4c'
  if (value >= 70) return '#e3b341'
  return '#7c6af7'
}

interface UsageRow {
  name: string
  full: string
  value: number
  unit: string
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
        const value = pct(metric?.cpuUsageCores, metric?.cpuAllocatableCores ?? 0)
        return value == null ? null : { name: shortName(node.name), full: node.name, value, unit: '%' }
      })
      .filter((row): row is UsageRow => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName])

  const memoryRows = useMemo(() => {
    return nodes
      .map((node) => {
        const metric = byName.get(node.name)
        const value = pct(metric?.memoryUsageBytes, metric?.memoryAllocatableBytes ?? 0)
        return value == null ? null : { name: shortName(node.name), full: node.name, value, unit: '%' }
      })
      .filter((row): row is UsageRow => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName])

  const podRows = useMemo(
    () =>
      [
        { name: t('nodesOverview.charts.running'), full: t('nodesOverview.charts.running'), key: 'running', value: summary.runningPods, unit: '', fill: 'var(--ml-success)' },
        { name: t('nodesOverview.charts.pending'), full: t('nodesOverview.charts.pending'), key: 'pending', value: summary.pendingPods, unit: '', fill: 'var(--ml-warning)' },
        { name: t('nodesOverview.charts.failed'), full: t('nodesOverview.charts.failed'), key: 'failed', value: summary.failedPods, unit: '', fill: 'var(--ml-error)' }
      ].filter((row) => row.value > 0),
    [summary.failedPods, summary.pendingPods, summary.runningPods, t]
  )

  const diskRows = useMemo(() => {
    const fromProm = diskQuery.data
    return nodes
      .map((node) => {
        const value = diskPercentForNode(node.name, fromProm) ?? byName.get(node.name)?.diskUsagePercent
        return value == null
          ? null
          : { name: shortName(node.name), full: node.name, value: Math.round(value * 10) / 10, unit: '%' }
      })
      .filter((row): row is UsageRow => row != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [nodes, byName, diskQuery.data])

  return (
    <div className="ml-nodes-charts">
      <ChartCard title={t('nodesOverview.charts.cpu')} hint={cpuRows.length ? t('nodesOverview.charts.clickNode') : undefined}>
        {cpuRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noMetrics')} />
        ) : (
          <UsageBars rows={cpuRows} tick={tick} grid={grid} onOpen={openNode} />
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.memory')} hint={memoryRows.length ? t('nodesOverview.charts.clickNode') : undefined}>
        {memoryRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noMetrics')} />
        ) : (
          <UsageBars rows={memoryRows} tick={tick} grid={grid} onOpen={openNode} />
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.pods')} hint={podRows.length ? t('nodesOverview.charts.clickPods') : undefined}>
        {podRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.empty')} />
        ) : (
          <div className="ml-nodes-chart__plot" onMouseDown={(event) => event.preventDefault()}>
          <ResponsiveContainer width="100%" height={168}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={podRows}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
                activeShape={false}
                style={{ cursor: 'pointer' }}
                onClick={() => openResourceKind(clusterId, 'Pods')}
              >
                {podRows.map((row) => (
                  <Cell key={row.key} fill={row.fill} />
                ))}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title={t('nodesOverview.charts.disk')} hint={diskRows.length ? t('nodesOverview.charts.clickNode') : undefined}>
        {diskRows.length === 0 ? (
          <Empty label={t('nodesOverview.charts.noDisk')} />
        ) : (
          <UsageBars rows={diskRows} tick={tick} grid={grid} onOpen={openNode} />
        )}
      </ChartCard>
    </div>
  )
}

function UsageBars({
  rows,
  tick,
  grid,
  onOpen
}: {
  rows: UsageRow[]
  tick: string
  grid: string
  onOpen: (name: string) => void
}): React.JSX.Element {
  const height = Math.max(148, rows.length * 28 + 28)
  return (
    <div className="ml-nodes-chart__plot" onMouseDown={(event) => event.preventDefault()}>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ left: 0, right: 36, top: 4, bottom: 0 }}
        barCategoryGap={8}
        accessibilityLayer={false}
      >
        <CartesianGrid stroke={grid} horizontal={false} verticalValues={[25, 50, 75, 100]} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: tick, fontSize: 10 }} unit="%" axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={124}
          axisLine={false}
          tickLine={false}
          tick={(props: { x: number; y: number; payload?: { value?: string } }) => {
            const label = props.payload?.value ?? ''
            const row = rows.find((item) => item.name === label)
            return (
              <text
                x={props.x}
                y={props.y}
                dy={4}
                textAnchor="end"
                fill={tick}
                fontSize={11}
                cursor="pointer"
                onClick={() => {
                  if (row?.full) onOpen(row.full)
                }}
              >
                {label}
              </text>
            )
          }}
        />
        <ChartTooltip />
        <Bar
          dataKey="value"
          barSize={8}
          activeBar={false}
          background={false}
          isAnimationActive={false}
          onClick={(bar) => {
            const row = ('payload' in bar ? bar.payload : bar) as UsageRow
            if (row.full) onOpen(row.full)
          }}
        >
          {rows.map((row) => (
            <Cell key={row.full} fill={usageFill(row.value)} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            content={(props) => {
              const { x, y, width, height, value, index } = props
              const row = typeof index === 'number' ? rows[index] : undefined
              if (x == null || y == null || width == null || height == null) return null
              return (
                <text
                  x={Number(x) + Number(width) + 6}
                  y={Number(y) + Number(height) / 2}
                  dy={4}
                  fill={tick}
                  fontSize={11}
                  cursor="pointer"
                  onClick={() => {
                    if (row?.full) onOpen(row.full)
                  }}
                >
                  {value}%
                </text>
              )
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}

function ChartTooltip(): React.JSX.Element {
  return (
    <Tooltip
      cursor={false}
      isAnimationActive={false}
      wrapperStyle={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none' }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null
        const row = payload[0].payload as UsageRow
        return (
          <div className="ml-nodes-chart__tip">
            <span className="ml-nodes-chart__tip-name">{row.full || row.name}</span>
            <span className="ml-nodes-chart__tip-value">
              {row.value}
              {row.unit}
            </span>
          </div>
        )
      }}
    />
  )
}

function ChartCard({
  title,
  hint,
  children
}: {
  title: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="ml-nodes-chart">
      <h3 className="ml-nodes-chart__title">{title}</h3>
      {hint ? <p className="ml-nodes-chart__hint">{hint}</p> : null}
      {children}
    </section>
  )
}

function Empty({ label }: { label: string }): React.JSX.Element {
  return <p className="ml-nodes-chart__empty">{label}</p>
}
