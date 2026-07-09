import { useMemo, useState } from 'react'
import { Empty, Input, Modal, Tag, Typography, message } from 'antd'
import { Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmChartSummary } from '@shared/types/helm'
import { useHelmCharts, useHelmUninstallChart } from '../../queries/useHelm'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { HelmRowActions } from './HelmRowActions'

interface HelmChartsPageProps {
  clusterId: string
}

export function HelmChartsPage({ clusterId }: HelmChartsPageProps): React.JSX.Element {
  const { data, isLoading } = useHelmCharts(clusterId)
  const uninstallChart = useHelmUninstallChart(clusterId)
  const [search, setSearch] = useState('')
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

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

  function confirmUninstall(chart: HelmChartSummary): void {
    const releaseList = chart.releases.map((r) => `${r.namespace}/${r.name}`).join(', ')
    Modal.confirm({
      title: `Uninstall ${chart.chartName}-${chart.chartVersion}?`,
      content: (
        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            This will delete all resources from {chart.releaseCount} release(s) and remove Helm release history:
          </Typography.Paragraph>
          <Typography.Text code>{releaseList}</Typography.Text>
        </div>
      ),
      okText: 'Uninstall',
      okType: 'danger',
      onOk: async () => {
        const res = await uninstallChart.mutateAsync({
          chartName: chart.chartName,
          chartVersion: chart.chartVersion
        })
        if ('error' in res) {
          message.error(res.error)
          throw new Error(res.error)
        }
        if (res.warnings.length > 0) {
          message.warning(`Uninstalled with warnings: ${res.warnings.slice(0, 3).join('; ')}`)
        } else {
          message.success(`Uninstalled ${res.uninstalled.length} release(s)`)
        }
      }
    })
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
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_, chart) => (
        <HelmRowActions
          items={[
            {
              key: 'uninstall',
              label: 'Uninstall',
              icon: <Icon icon={Trash2} variant="detail" />,
              danger: true,
              onClick: () => confirmUninstall(chart)
            }
          ]}
        />
      )
    }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Helm Charts
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Charts currently installed as releases on this cluster, derived from live release data. Uninstall removes all
        matching releases and their deployed resources.
      </Typography.Paragraph>
      {error ? (
        <Empty description={error} />
      ) : (
        <>
          <Input.Search
            placeholder="Search charts by name, version, namespace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 360, marginBottom: 12 }}
          />
          {!isLoading && filteredCharts.length === 0 ? (
            <Empty description={charts.length === 0 ? 'No Helm charts found in this cluster' : 'No charts match your search'} />
          ) : (
            <ResizableTable
              tableKey="helm-charts"
              rowKey="id"
              columns={columns}
              dataSource={filteredCharts}
              loading={isLoading}
              pagination={paginationProps(filteredCharts.length)}
              onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
              size="middle"
            />
          )}
        </>
      )}
    </div>
  )
}
