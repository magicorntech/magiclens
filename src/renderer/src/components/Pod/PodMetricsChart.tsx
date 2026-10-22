import { Empty, Typography } from 'antd'
import dayjs from 'dayjs'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const FALLBACK_SERIES_COLORS = ['#059669', '#d97706', '#dc2626', '#6366f1', '#0891b2', '#db2777']

export interface PodMetricsChartPoint {
  t: number
  values: Record<string, number>
}

interface PodMetricsChartProps {
  title: string
  points: PodMetricsChartPoint[]
  seriesNames: string[]
  formatValue: (value: number) => string
}

export function PodMetricsChart({
  title,
  points,
  seriesNames,
  formatValue
}: PodMetricsChartProps): React.JSX.Element {
  return (
    <div>
      {title ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Typography.Text>
      ) : null}
      {points.length < 2 ? (
        <Empty
          description="Collecting data points..."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '20px 0' }}
        />
      ) : (
        <div className="ml-pod-metrics-chart" onMouseDown={(event) => event.preventDefault()}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={points.map((p) => ({ t: p.t, ...p.values }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t: number) => dayjs(t).format('HH:mm:ss')}
              minTickGap={50}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickFormatter={(v: number) => formatValue(v)} width={72} tick={{ fontSize: 11 }} />
            <Tooltip
              isAnimationActive={false}
              wrapperStyle={{ outline: 'none', background: 'transparent', border: 'none', boxShadow: 'none' }}
              content={({ active, label, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="ml-pod-metrics-tip">
                    <div className="ml-pod-metrics-tip__time">{dayjs(label as number).format('HH:mm:ss')}</div>
                    {payload.map((entry) => (
                      <div key={String(entry.dataKey)} className="ml-pod-metrics-tip__row">
                        <span className="ml-pod-metrics-tip__swatch" style={{ background: entry.color }} />
                        <span className="ml-pod-metrics-tip__name">{entry.name}</span>
                        <span className="ml-pod-metrics-tip__value">{formatValue(Number(entry.value))}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {seriesNames.map((name, i) => {
              const primary =
                typeof document !== 'undefined'
                  ? getComputedStyle(document.documentElement).getPropertyValue('--ml-primary').trim()
                  : ''
              const seriesColors = primary ? [primary, ...FALLBACK_SERIES_COLORS] : ['#7c3aed', ...FALLBACK_SERIES_COLORS]
              const color = seriesColors[i % seriesColors.length]
              return (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  connectNulls
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
