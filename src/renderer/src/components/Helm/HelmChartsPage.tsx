import { useMemo, useState } from 'react'
import { Empty, Input, Modal, Tag, Typography, message } from 'antd'
import { Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmChartSummary } from '@shared/types/helm'
import { isAllNamespaces, isNoNamespaceSelection, parseNamespaceSelection } from '@shared/namespaceSelection'
import { useHelmCharts, useHelmUninstallChart } from '../../queries/useHelm'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { NamespaceSelector } from '../Layout/NamespaceSelector'
import { useClusterStore } from '../../stores/clusterStore'
import { HelmLogo } from '../../icons/HelmLogo'
import { HelmRowActions } from './HelmRowActions'

interface HelmChartsPageProps {
  clusterId: string
}

export function HelmChartsPage({ clusterId }: HelmChartsPageProps): React.JSX.Element {
  const { data, isLoading } = useHelmCharts(clusterId)
  const uninstallChart = useHelmUninstallChart(clusterId)
  const [search, setSearch] = useState('')
  const selectedNamespace = useClusterStore(
    (s) => s.clusters.find((c) => c.id === clusterId)?.selectedNamespace ?? 'ALL'
  )
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

  const charts = data && 'charts' in data ? data.charts : []
  const error = data && 'error' in data ? data.error : null

  const filteredCharts = useMemo(() => {
    const nsSelection = parseNamespaceSelection(selectedNamespace)
    const inScope = isNoNamespaceSelection(nsSelection)
      ? []
      : isAllNamespaces(nsSelection)
        ? charts
        : charts.filter((c) => c.namespaces.some((ns) => nsSelection.includes(ns)))

    const q = search.trim().toLowerCase()
    if (!q) return inScope
    return inScope.filter((c) => {
      const haystack = [c.chartName, c.chartVersion, c.appVersion, ...c.namespaces].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [charts, search, selectedNamespace])

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
      ellipsis: true,
      render: (v: string) => (
        <span className="ml-helm-chart-name">
          <HelmLogo size={16} color="var(--ml-primary)" />
          <Typography.Text strong>{v}</Typography.Text>
        </span>
      )
    },
    { title: 'Version', dataIndex: 'chartVersion', key: 'chartVersion', width: 120, ellipsis: true },
    { title: 'App version', dataIndex: 'appVersion', key: 'appVersion', width: 120, ellipsis: true },
    { title: 'Releases', dataIndex: 'releaseCount', key: 'releaseCount', width: 100 },
    {
      title: 'Namespaces',
      dataIndex: 'namespaces',
      key: 'namespaces',
      ellipsis: true,
      render: (namespaces: string[]) => (
        <span className="ml-helm-ns-tags">
          {namespaces.map((ns) => (
            <Tag key={ns}>{ns}</Tag>
          ))}
        </span>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      fixed: 'right',
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
    <div style={{ height: '100%', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography.Title level={4} style={{ marginTop: 0, flexShrink: 0 }}>
          Helm Charts
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ flexShrink: 0 }}>
          Installed charts derived from live releases — uninstall removes matching releases and resources.
        </Typography.Paragraph>
        {error ? (
          <Empty description={error} />
        ) : (
          <>
            <ResourceTableToolbar
              leading={
                <NamespaceSelector
                  clusterId={clusterId}
                  value={selectedNamespace}
                  onChange={(ns) => setSelectedNamespace(clusterId, ns)}
                />
              }
              search={
                <Input.Search
                  className="ml-resource-search"
                  placeholder="Search charts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                />
              }
            />
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {!isLoading && filteredCharts.length === 0 ? (
                <Empty
                  description={
                    charts.length === 0
                      ? 'No Helm charts found in this cluster'
                      : search.trim()
                        ? 'No charts match your search'
                        : 'No Helm charts in this namespace'
                  }
                />
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
