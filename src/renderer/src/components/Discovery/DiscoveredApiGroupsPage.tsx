import { useMemo } from 'react'
import { Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { DiscoveredApiGroup } from '@shared/types/discovery'
import { useDiscovery } from '../../queries/useDiscovery'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface DiscoveredApiGroupsPageProps {
  clusterId: string
}

interface GroupRow extends DiscoveredApiGroup {
  resourceCount: number
}

export function DiscoveredApiGroupsPage({ clusterId }: DiscoveredApiGroupsPageProps): React.JSX.Element {
  const { data, isLoading } = useDiscovery(clusterId)

  const rows: GroupRow[] = useMemo(() => {
    if (!data) return []
    return data.groups.map((group) => ({
      ...group,
      resourceCount: data.resources.filter((r) => r.group === group.name).length
    }))
  }, [data])

  const columns: ColumnsType<GroupRow> = [
    {
      title: 'API Group',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Typography.Text strong>{name === '' ? 'core (legacy)' : name}</Typography.Text>,
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Preferred Version',
      dataIndex: 'preferredVersion',
      key: 'preferredVersion',
      render: (v: string) => <Tag color="blue">{v}</Tag>
    },
    {
      title: 'Versions',
      key: 'versions',
      render: (_, row) => (
        <>
          {row.versions.map((v) => (
            <Tag key={v.groupVersion}>{v.version}</Tag>
          ))}
        </>
      )
    },
    {
      title: 'Resources',
      dataIndex: 'resourceCount',
      key: 'resourceCount',
      sorter: (a, b) => a.resourceCount - b.resourceCount
    }
  ]

  if (isLoading) return <LoadingState />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Discovered API Groups
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Read live from this cluster's Discovery API (GET /api, GET /apis) — nothing here is hardcoded, so CRDs and
        operator-registered API groups appear automatically.
      </Typography.Paragraph>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="middle"
      />
    </div>
  )
}
