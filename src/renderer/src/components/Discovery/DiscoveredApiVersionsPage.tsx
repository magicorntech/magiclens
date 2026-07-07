import { useMemo } from 'react'
import { Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { DiscoveredApiResource } from '@shared/types/discovery'
import { useDiscovery } from '../../queries/useDiscovery'
import { buildTablePagination, readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface DiscoveredApiVersionsPageProps {
  clusterId: string
}

interface VersionRow {
  key: string
  group: string
  version: string
  apiVersion: string
  resources: DiscoveredApiResource[]
}

const resourceColumns: ColumnsType<DiscoveredApiResource> = [
  { title: 'Kind', dataIndex: 'kind', key: 'kind', sorter: (a, b) => a.kind.localeCompare(b.kind) },
  { title: 'Plural name', dataIndex: 'name', key: 'name' },
  {
    title: 'Namespaced',
    dataIndex: 'namespaced',
    key: 'namespaced',
    render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Namespaced' : 'Cluster'}</Tag>
  },
  {
    title: 'Short names',
    dataIndex: 'shortNames',
    key: 'shortNames',
    render: (names: string[]) => names.map((n) => <Tag key={n}>{n}</Tag>)
  },
  {
    title: 'Categories',
    dataIndex: 'categories',
    key: 'categories',
    render: (cats: string[]) => cats.map((c) => <Tag key={c}>{c}</Tag>)
  },
  {
    title: 'Verbs',
    dataIndex: 'verbs',
    key: 'verbs',
    render: (verbs: string[]) => verbs.map((v) => <Tag key={v}>{v}</Tag>)
  }
]

export function DiscoveredApiVersionsPage({ clusterId }: DiscoveredApiVersionsPageProps): React.JSX.Element {
  const { data, isLoading } = useDiscovery(clusterId)
  const { setPagination, paginationProps } = useTablePagination([clusterId])

  const rows: VersionRow[] = useMemo(() => {
    if (!data) return []
    const byApiVersion = new Map<string, VersionRow>()
    for (const resource of data.resources) {
      const key = resource.apiVersion
      const existing = byApiVersion.get(key)
      if (existing) {
        existing.resources.push(resource)
      } else {
        byApiVersion.set(key, {
          key,
          group: resource.group,
          version: resource.version,
          apiVersion: resource.apiVersion,
          resources: [resource]
        })
      }
    }
    return Array.from(byApiVersion.values()).sort((a, b) => a.apiVersion.localeCompare(b.apiVersion))
  }, [data])

  const columns: ColumnsType<VersionRow> = [
    {
      title: 'Group / Version',
      dataIndex: 'apiVersion',
      key: 'apiVersion',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>
    },
    {
      title: 'Resource kinds',
      key: 'count',
      render: (_, row) => row.resources.length,
      sorter: (a, b) => a.resources.length - b.resources.length
    }
  ]

  if (isLoading) return <LoadingState />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Discovered API Versions
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Every group/version this cluster currently serves, with the resources, verbs, scope, short names and
        categories reported by its own Discovery API. Expand a row to inspect it.
      </Typography.Paragraph>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={rows}
        pagination={paginationProps(rows.length)}
        onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
        size="middle"
        expandable={{
          expandedRowRender: (row) => (
            <Table
              rowKey="name"
              columns={resourceColumns}
              dataSource={row.resources}
              pagination={buildTablePagination({ current: 1, pageSize: 20 }, row.resources.length)}
              size="small"
            />
          )
        }}
      />
    </div>
  )
}
