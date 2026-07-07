import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Space, Splitter, Tag, Typography, message } from 'antd'
import { DeleteOutlined, HistoryOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { HelmRelease } from '@shared/types/helm'
import type { ResourceFocus } from '@shared/types/navigation'
import { useHelmReleases, useHelmUninstallRelease } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { HelmReleaseHistoryModal } from './HelmReleaseHistoryModal'
import { HelmReleaseDetailPanel } from './HelmReleaseDetailPanel'
import { HelmRowActions } from './HelmRowActions'

interface HelmReleasesPageProps {
  clusterId: string
  onNavigateToResource: (focus: ResourceFocus) => void
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

export function HelmReleasesPage({ clusterId, onNavigateToResource }: HelmReleasesPageProps): React.JSX.Element {
  const { data, isLoading } = useHelmReleases(clusterId)
  const uninstallRelease = useHelmUninstallRelease(clusterId)
  const [selectedRelease, setSelectedRelease] = useState<HelmRelease | null>(null)
  const [historyTarget, setHistoryTarget] = useState<{ namespace: string; name: string } | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

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

  const selectedReleases = useMemo(
    () => filteredReleases.filter((r) => selectedRowKeys.includes(r.id)),
    [filteredReleases, selectedRowKeys]
  )

  function confirmUninstall(releasesToUninstall: HelmRelease[]): void {
    const preview = releasesToUninstall.map((r) => `${r.namespace}/${r.name}`).join('\n')
    Modal.confirm({
      title: `Uninstall ${releasesToUninstall.length} release(s)?`,
      content: (
        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            This will delete all rendered resources and remove Helm release history:
          </Typography.Paragraph>
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>{preview}</pre>
        </div>
      ),
      okText: `Uninstall ${releasesToUninstall.length}`,
      okType: 'danger',
      onOk: async () => {
        const warnings: string[] = []
        const failed: string[] = []
        for (const release of releasesToUninstall) {
          const res = await uninstallRelease.mutateAsync({
            namespace: release.namespace,
            name: release.name
          })
          if ('error' in res) {
            failed.push(`${release.namespace}/${release.name}: ${res.error}`)
          } else {
            warnings.push(...res.warnings)
          }
        }
        if (failed.length > 0) {
          message.error(`Failed ${failed.length}: ${failed.slice(0, 2).join('; ')}`)
          throw new Error('partial uninstall')
        }
        setSelectedRowKeys([])
        if (selectedRelease && releasesToUninstall.some((r) => r.id === selectedRelease.id)) {
          setSelectedRelease(null)
        }
        if (warnings.length > 0) {
          message.warning(`Uninstalled with warnings: ${warnings.slice(0, 3).join('; ')}`)
        } else {
          message.success(`Uninstalled ${releasesToUninstall.length} release(s)`)
        }
      }
    })
  }

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
      title: '',
      key: 'actions',
      width: 56,
      render: (_, r) => (
        <HelmRowActions
          items={[
            {
              key: 'history',
              label: 'History',
              icon: <HistoryOutlined />,
              onClick: () => setHistoryTarget({ namespace: r.namespace, name: r.name })
            },
            { type: 'divider' },
            {
              key: 'uninstall',
              label: 'Uninstall',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => confirmUninstall([r])
            }
          ]}
        />
      )
    }
  ]

  const listPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Typography.Title level={4} style={{ marginTop: 0, flexShrink: 0 }}>
        Helm Releases
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ flexShrink: 0 }}>
        Click a release to view its values and deployed resources. Use the row menu for history or uninstall.
      </Typography.Paragraph>
      {error ? (
        <Empty description={error} />
      ) : releases.length === 0 ? (
        <Empty description="No Helm releases found in this cluster" />
      ) : (
        <>
          <Space style={{ marginBottom: 12, flexShrink: 0 }} wrap>
            <Input.Search
              placeholder="Search releases by name, namespace, chart, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 360 }}
            />
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={uninstallRelease.isPending}
                onClick={() => confirmUninstall(selectedReleases)}
              >
                Uninstall ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {filteredReleases.length === 0 ? (
              <Empty description="No releases match your search" />
            ) : (
              <ResizableTable
                tableKey="helm-releases"
                rowKey="id"
                columns={columns}
                dataSource={filteredReleases}
                pagination={paginationProps(filteredReleases.length)}
                onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
                size="middle"
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[])
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedRelease(record)
                })}
              />
            )}
          </div>
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

  if (isLoading) return <LoadingState />

  if (!selectedRelease) {
    return <div style={{ height: '100%', padding: 16, boxSizing: 'border-box' }}>{listPanel}</div>
  }

  return (
    <Splitter style={{ height: '100%' }}>
      <Splitter.Panel defaultSize="52%" min="35%">
        <div style={{ height: '100%', padding: 16, boxSizing: 'border-box', overflow: 'hidden' }}>{listPanel}</div>
      </Splitter.Panel>
      <Splitter.Panel defaultSize="48%" min="30%">
        <HelmReleaseDetailPanel
          clusterId={clusterId}
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          onNavigateToResource={onNavigateToResource}
        />
      </Splitter.Panel>
    </Splitter>
  )
}
