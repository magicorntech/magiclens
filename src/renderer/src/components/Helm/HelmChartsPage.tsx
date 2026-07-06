import { useMemo, useState } from 'react'
import { Empty, Input, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { HelmChartSummary } from '@shared/types/helm'
import { useHelmCharts } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface HelmChartsPageProps {
  clusterId: string
}

const columns: ColumnsType<HelmChartSummary> = [
  {
    title: 'Chart',
    dataIndex: 'chartName',
    key: 'chartName',
    render: (v: string) => <Typography.Text strong>{v}</Typography.Text>
  },
  { title: 'Version', dataIndex: 'chartVersion', key: 'chartVersion' },
  { title: 'App version', dataIndex: 'appVersion', key: 'appVersion' },
  { title: 'Releases', dataIndex: 'releaseCount', key: 'releaseCount', width: 100 },
  {
    title: 'Namespaces',
    dataIndex: 'namespaces',
    key: 'namespaces',
    render: (namespaces: string[]) => namespaces.map((ns) => <Tag key={ns}>{ns}</Tag>)
  }
]

export function HelmChartsPage({ clusterId }: HelmChartsPageProps): React.JSX.Element {
  const { data, isLoading } = useHelmCharts(clusterId)
  const [search, setSearch] = useState('')

  const charts = data && 'charts' in data ? data.charts : []
  const error = data && 'error' in data ? data.error : null

  const filteredCharts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return charts
    return charts.filter((c) => {
      const haystack = [c.chartName, c.chartVersion, c.appVersion, ...c.namespaces].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [charts, search])

  if (isLoading) return <LoadingState />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Helm Charts
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Charts currently installed as releases on this cluster, derived from live release data. This is not a chart
        repository browser — it reflects what is actually deployed.
      </Typography.Paragraph>
      {error ? (
        <Empty description={error} />
      ) : charts.length === 0 ? (
        <Empty description="No Helm charts found in this cluster" />
      ) : (
        <>
          <Input.Search
            placeholder="Search charts by name, version, namespace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 360, marginBottom: 12 }}
          />
          {filteredCharts.length === 0 ? (
            <Empty description="No charts match your search" />
          ) : (
            <Table rowKey="id" columns={columns} dataSource={filteredCharts} pagination={false} size="middle" />
          )}
        </>
      )}
    </div>
  )
}
