import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MollyToolResult } from '@shared/types/molly'
import './mollyToolCharts.css'

const CPU = '#22d3ee'
const MEM = '#a78bfa'
const OK = '#34d399'
const WARN = '#fbbf24'
const BAD = '#f87171'

function shortName(name: string, max = 18): string {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

function pct(usage: number | undefined | null, cap: number | undefined | null): number | null {
  if (usage == null || cap == null || !(cap > 0)) return null
  return Math.round((usage / cap) * 100)
}

function tone(p: number): string {
  if (p >= 85) return BAD
  if (p >= 70) return WARN
  return OK
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function asNodes(data: unknown): Array<{
  name: string
  cpu: number | null
  mem: number | null
}> {
  const root = asRecord(data)
  const nodes = Array.isArray(root?.nodes) ? root.nodes : null
  if (!nodes) return []
  return nodes
    .map((raw) => {
      const n = asRecord(raw)
      if (!n || typeof n.name !== 'string') return null
      return {
        name: shortName(n.name),
        full: n.name,
        cpu: pct(
          typeof n.cpuUsageCores === 'number' ? n.cpuUsageCores : null,
          typeof n.cpuCapacityCores === 'number' ? n.cpuCapacityCores : null
        ),
        mem: pct(
          typeof n.memoryUsageBytes === 'number' ? n.memoryUsageBytes : null,
          typeof n.memoryCapacityBytes === 'number' ? n.memoryCapacityBytes : null
        )
      }
    })
    .filter(Boolean) as Array<{ name: string; cpu: number | null; mem: number | null }>
}

function asPods(data: unknown): Array<{ name: string; cpuMilli: number; memMi: number }> {
  const root = asRecord(data)
  const pods = Array.isArray(root?.pods)
    ? root.pods
    : Array.isArray(data)
      ? data
      : null
  if (!pods) return []
  return pods
    .slice(0, 12)
    .map((raw) => {
      const p = asRecord(raw)
      if (!p || typeof p.name !== 'string') return null
      const cpu = typeof p.cpuUsageCores === 'number' ? p.cpuUsageCores : 0
      const mem = typeof p.memoryUsageBytes === 'number' ? p.memoryUsageBytes : 0
      return {
        name: shortName(p.name, 16),
        cpuMilli: Math.round(cpu * 1000),
        memMi: Math.max(0, Math.round(mem / (1024 * 1024)))
      }
    })
    .filter(Boolean) as Array<{ name: string; cpuMilli: number; memMi: number }>
}

function ClusterHealthBars({ data }: { data: unknown }): React.JSX.Element | null {
  const { t } = useTranslation()
  const root = asRecord(data)
  if (!root) return null
  const cpu = pct(
    typeof root.cpuUsageCores === 'number' ? root.cpuUsageCores : null,
    typeof root.cpuCapacityCores === 'number' ? root.cpuCapacityCores : null
  )
  const mem = pct(
    typeof root.memoryUsageBytes === 'number' ? root.memoryUsageBytes : null,
    typeof root.memoryCapacityBytes === 'number' ? root.memoryCapacityBytes : null
  )
  const ready = typeof root.readyNodes === 'number' ? root.readyNodes : null
  const total = typeof root.totalNodes === 'number' ? root.totalNodes : null
  const running = typeof root.runningPods === 'number' ? root.runningPods : null
  const pending = typeof root.pendingPods === 'number' ? root.pendingPods : null
  const failed = typeof root.failedPods === 'number' ? root.failedPods : null

  const usageRows = [
    cpu != null ? { key: 'CPU', value: cpu, fill: tone(cpu) } : null,
    mem != null ? { key: 'RAM', value: mem, fill: tone(mem) } : null
  ].filter(Boolean) as Array<{ key: string; value: number; fill: string }>

  const podRows = [
    running != null ? { key: t('molly.charts.running'), value: running, fill: OK } : null,
    pending != null ? { key: t('molly.charts.pending'), value: pending, fill: WARN } : null,
    failed != null ? { key: t('molly.charts.failed'), value: failed, fill: BAD } : null
  ].filter(Boolean) as Array<{ key: string; value: number; fill: string }>

  if (usageRows.length === 0 && podRows.length === 0 && ready == null) return null

  return (
    <div className="ml-molly-charts">
      {(usageRows.length > 0 || (ready != null && total != null)) && (
        <div className="ml-molly-chart-card">
          <div className="ml-molly-chart-card__title">
            {t('molly.charts.clusterUsage')}
            {ready != null && total != null ? (
              <span className="ml-molly-chart-card__meta">
                {ready}/{total} nodes
              </span>
            ) : null}
          </div>
          {usageRows.length > 0 && (
            <ResponsiveContainer width="100%" height={96}>
              <BarChart data={usageRows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.25)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="key" width={40} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, '']}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {usageRows.map((r) => (
                    <Cell key={r.key} fill={r.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      {podRows.length > 0 && (
        <div className="ml-molly-chart-card">
          <div className="ml-molly-chart-card__title">{t('molly.charts.pods')}</div>
          <ResponsiveContainer width="100%" height={96}>
            <BarChart data={podRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="key" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {podRows.map((r) => (
                  <Cell key={r.key} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function NodeMetricsCharts({ data }: { data: unknown }): React.JSX.Element | null {
  const { t } = useTranslation()
  const rows = useMemo(() => asNodes(data), [data])
  if (rows.length === 0) return null
  const cpuData = rows.filter((r) => r.cpu != null).map((r) => ({ name: r.name, value: r.cpu! }))
  const memData = rows.filter((r) => r.mem != null).map((r) => ({ name: r.name, value: r.mem! }))
  const height = Math.max(120, rows.length * 22)

  return (
    <div className="ml-molly-charts">
      {cpuData.length > 0 && (
        <div className="ml-molly-chart-card">
          <div className="ml-molly-chart-card__title">{t('molly.charts.nodeCpu')}</div>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={cpuData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.25)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [`${v}%`, 'CPU']}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" fill={CPU} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {memData.length > 0 && (
        <div className="ml-molly-chart-card">
          <div className="ml-molly-chart-card__title">{t('molly.charts.nodeMem')}</div>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={memData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.25)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [`${v}%`, 'RAM']}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" fill={MEM} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PodMetricsCharts({ data }: { data: unknown }): React.JSX.Element | null {
  const { t } = useTranslation()
  const rows = useMemo(() => asPods(data), [data])
  if (rows.length === 0) return null
  const height = Math.max(120, rows.length * 22)

  return (
    <div className="ml-molly-charts">
      <div className="ml-molly-chart-card">
        <div className="ml-molly-chart-card__title">{t('molly.charts.podCpu')}</div>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.25)" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(v) => [`${v} mCPU`, 'CPU']}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12
              }}
            />
              <Bar dataKey="cpuMilli" fill={CPU} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="ml-molly-chart-card">
        <div className="ml-molly-chart-card__title">{t('molly.charts.podMem')}</div>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.25)" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} unit=" Mi" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(v) => [`${v} Mi`, 'RAM']}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12
              }}
            />
            <Bar dataKey="memMi" fill={MEM} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ResourceDocument({ data }: { data: unknown }): React.JSX.Element | null {
  const payload = data as {
    kind?: string
    namespace?: string
    total?: number
    rows?: Array<Record<string, string>>
    chart?: Array<{ name: string; value: number }>
    recommendations?: string[]
    document?: string
    logs?: string
  }
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  const chart = Array.isArray(payload?.chart) ? payload.chart : []
  const recommendations = Array.isArray(payload?.recommendations) ? payload.recommendations : []
  if (rows.length === 0 && chart.length === 0 && recommendations.length === 0 && !payload?.document && !payload?.logs) {
    return null
  }
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : []
  return (
    <div className="ml-molly-charts">
      {chart.length > 0 ? (
        <div className="ml-molly-chart-card">
          <div className="ml-molly-chart-card__title">
            {payload.kind}
            <span className="ml-molly-chart-card__meta">{payload.total ?? rows.length}</span>
          </div>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-24} height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="value" fill={CPU} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="ml-molly-chart-card ml-molly-doc">
          <div className="ml-molly-chart-card__title">
            {payload.kind}
            <span className="ml-molly-chart-card__meta">
              {payload.namespace === 'ALL' ? 'all ns' : payload.namespace} · {payload.total ?? rows.length}
            </span>
          </div>
          <div className="ml-molly-doc__scroll">
            <table className="ml-molly-doc__table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    {columns.map((col) => (
                      <td key={col}>{row[col] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {recommendations.length > 0 ? (
        <div className="ml-molly-chart-card ml-molly-doc">
          <div className="ml-molly-chart-card__title">Öneri</div>
          <ul className="ml-molly-doc__tips">
            {recommendations.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {payload.logs ? (
        <div className="ml-molly-chart-card ml-molly-doc">
          <div className="ml-molly-chart-card__title">Log</div>
          <pre className="ml-molly-doc__pre">{payload.logs}</pre>
        </div>
      ) : null}
      {payload.document ? (
        <div className="ml-molly-chart-card ml-molly-doc">
          <div className="ml-molly-chart-card__title">Belge</div>
          <pre className="ml-molly-doc__pre">{payload.document}</pre>
        </div>
      ) : null}
    </div>
  )
}

/** Renders charts and resource tables from Molly tool payloads. */
export function MollyToolCharts({ tools }: { tools: MollyToolResult[] }): React.JSX.Element | null {
  const charts = tools
    .filter((t) => t.ok && t.data != null)
    .map((t) => {
      if (t.name === 'getNodeMetrics') return <NodeMetricsCharts key={t.name + t.summary} data={t.data} />
      if (t.name === 'getClusterHealth') return <ClusterHealthBars key={t.name + t.summary} data={t.data} />
      if (t.name === 'getPodMetrics') return <PodMetricsCharts key={t.name + t.summary} data={t.data} />
      if (t.name === 'getPodLogs') return <ResourceDocument key={t.name + t.summary} data={t.data} />
      if (t.name === 'getEvents' && Array.isArray(t.data)) {
        const rows = (t.data as Array<Record<string, unknown>>).map((event) => ({
          name: String(event.name ?? ''),
          namespace: String(event.namespace ?? '—'),
          status: String(event.type ?? ''),
          when: String(event.at ?? ''),
          message: String(event.message ?? '')
        }))
        return (
          <ResourceDocument
            key={t.name + t.summary}
            data={{ kind: 'Events', namespace: 'ALL', total: rows.length, rows }}
          />
        )
      }
      if (
        t.name === 'listResources' ||
        t.name === 'inspectResource' ||
        t.name === 'getUsage' ||
        t.name === 'getSecurity' ||
        t.name === 'startSecurityScan'
      ) {
        return <ResourceDocument key={t.name + t.summary} data={t.data} />
      }
      return null
    })
    .filter(Boolean)

  if (charts.length === 0) return null
  return <div className="ml-molly-line__charts">{charts}</div>
}
