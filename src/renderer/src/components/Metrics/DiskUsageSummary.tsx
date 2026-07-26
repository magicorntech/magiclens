import { Card, Col, Progress, Row, Typography } from 'antd'
import type { MetricsSeries } from '@shared/types/metrics'
import { formatBytes } from '../../format'

export interface DiskUsageSnapshot {
  name: string
  percent: number
  usedBytes?: number
  sizeBytes?: number
}

/** Latest point per series, optionally paired with used/size series of the same name. */
export function latestDiskSnapshots(
  percentSeries: MetricsSeries[] | undefined,
  usedSeries?: MetricsSeries[] | undefined,
  sizeSeries?: MetricsSeries[] | undefined
): DiskUsageSnapshot[] {
  if (!percentSeries?.length) return []
  const usedByName = new Map((usedSeries ?? []).map((s) => [s.name, s.points.at(-1)?.value]))
  const sizeByName = new Map((sizeSeries ?? []).map((s) => [s.name, s.points.at(-1)?.value]))

  return percentSeries
    .map((s): DiskUsageSnapshot | null => {
      const percent = s.points.at(-1)?.value
      if (percent === undefined || !Number.isFinite(percent)) return null
      return {
        name: s.name,
        percent: Math.max(0, Math.min(100, percent)),
        usedBytes: usedByName.get(s.name),
        sizeBytes: sizeByName.get(s.name)
      }
    })
    .filter((x): x is DiskUsageSnapshot => x !== null)
    .sort((a, b) => b.percent - a.percent)
}

interface DiskUsageSummaryProps {
  title: string
  snapshots: DiskUsageSnapshot[]
  emptyHint?: string
}

export function DiskUsageSummary({ title, snapshots, emptyHint }: DiskUsageSummaryProps): React.JSX.Element | null {
  if (snapshots.length === 0) {
    if (!emptyHint) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {emptyHint}
        </Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        {title}
      </Typography.Title>
      <Row gutter={[12, 12]}>
        {snapshots.map((disk) => (
          <Col key={disk.name} xs={24} sm={12} lg={8}>
            <Card size="small" title={<span className="ml-pod-mono">{disk.name}</span>}>
              <Progress
                percent={Math.round(disk.percent)}
                status={disk.percent >= 90 ? 'exception' : disk.percent >= 75 ? 'active' : undefined}
                format={(p) => `${p}%`}
              />
              {(disk.usedBytes !== undefined || disk.sizeBytes !== undefined) && (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {disk.usedBytes !== undefined ? formatBytes(disk.usedBytes) : '—'}
                  {' / '}
                  {disk.sizeBytes !== undefined ? formatBytes(disk.sizeBytes) : '—'}
                </Typography.Text>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
