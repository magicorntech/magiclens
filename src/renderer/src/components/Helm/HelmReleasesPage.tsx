import { useMemo, useState } from 'react'
import { Button, Empty, Input, Table, Tag, Typography } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { HelmRelease } from '@shared/types/helm'
import { useHelmReleases } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { HelmReleaseHistoryModal } from './HelmReleaseHistoryModal'

interface HelmReleasesPageProps {
  clusterId: string
}

function statusColor(status: string): string {
  switch (status) {
    case 'deployed':
      return 'green'
    case 'failed':
      return 'red'
    case 'pending-install':
    case 'pending-upgrade':
    case 'pending-rollback':
      return 'gold'
    case 'superseded':
      return 'default'
    case 'uninstalled':
    case 'uninstalling':
      return 'volcano'
    default:
      return 'blue'
  }
}

export function HelmReleasesPage({ clusterId }: HelmReleasesPageProps): React.JSX.Element {
  const { data, isLoading } = useHelmReleases(clusterId)
  const [historyTarget, setHistoryTarget] = useState<{ namespace: string; name: string } | null>(null)
  const [search, setSearch] = useState('')

  const releases = data && 'releases' in data ? data.releases : []
  const error = data && 'error' in data ? data.error : null

  const filteredReleases = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return releases
    return releases.filter((r) => {
      const haystack = [
        r.name,
        r.namespace,
        r.status,
        r.chartName,
        r.chartVersion,
        `${r.chartName}-${r.chartVersion}`,
        r.appVersion
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [releases, search])

  const columns: ColumnsType<HelmRelease> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>
    },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
    { title: 'Revision', dataIndex: 'revision', key: 'revision', width: 90 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>
    },
    { title: 'Chart', key: 'chart', render: (_, r) => `${r.chartName}-${r.chartVersion}` },
    { title: 'App version', dataIndex: 'appVersion', key: 'appVersion' },
    {
      title: 'Updated',
      dataIndex: 'updated',
      key: 'updated',
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '-')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => setHistoryTarget({ namespace: r.namespace, name: r.name })}
        >
          History
        </Button>
      )
    }
  ]

  if (isLoading) return <LoadingState />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Helm Releases
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Decoded directly from Helm's own release storage secrets (owner=helm) — no `helm` CLI required. Use History
        to view past revisions and roll back.
      </Typography.Paragraph>
      {error ? (
        <Empty description={error} />
      ) : releases.length === 0 ? (
        <Empty description="No Helm releases found in this cluster" />
      ) : (
        <>
          <Input.Search
            placeholder="Search releases by name, namespace, chart, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 360, marginBottom: 12 }}
          />
          {filteredReleases.length === 0 ? (
            <Empty description="No releases match your search" />
          ) : (
            <Table rowKey="id" columns={columns} dataSource={filteredReleases} pagination={false} size="middle" />
          )}
        </>
      )}
      {historyTarget && (
        <HelmReleaseHistoryModal
          clusterId={clusterId}
          namespace={historyTarget.namespace}
          name={historyTarget.name}
          open={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}
