import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Popconfirm, Tag, Typography, message } from 'antd'
import { Undo2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmReleaseHistoryEntry } from '@shared/types/helm'
import { useHelmHistory } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'

interface HelmReleaseHistoryTabProps {
  clusterId: string
  namespace: string
  name: string
  active: boolean
}

function statusColor(status: string): string {
  switch (status) {
    case 'deployed':
      return 'green'
    case 'failed':
      return 'red'
    case 'superseded':
      return 'default'
    default:
      return 'blue'
  }
}

export function HelmReleaseHistoryTab({
  clusterId,
  namespace,
  name,
  active
}: HelmReleaseHistoryTabProps): React.JSX.Element {
  const { data, isLoading } = useHelmHistory(active ? clusterId : null, namespace, name)
  const queryClient = useQueryClient()
  const [rollingBack, setRollingBack] = useState<number | null>(null)

  const history = data && 'history' in data ? data.history : []
  const error = data && 'error' in data ? data.error : null

  async function handleRollback(targetRevision: number): Promise<void> {
    setRollingBack(targetRevision)
    try {
      const res = await window.api.helm.rollback({ clusterId, namespace, name, targetRevision })
      if ('error' in res) {
        message.error(`Rollback failed: ${res.error}`)
        return
      }
      if (res.warnings.length > 0) {
        message.warning(
          `Rolled back with ${res.warnings.length} resource warning(s): ${res.warnings[0]}`
        )
      } else {
        message.success(
          `Rolled back "${name}" to revision ${targetRevision} (new revision ${res.newRevision})`
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['helm-history', clusterId, namespace, name] }),
        queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] }),
        queryClient.invalidateQueries({ queryKey: ['helm-charts', clusterId] }),
        queryClient.invalidateQueries({
          queryKey: ['helm-release-detail', clusterId, namespace, name]
        })
      ])
    } finally {
      setRollingBack(null)
    }
  }

  const columns: ColumnsType<HelmReleaseHistoryEntry> = [
    { title: 'Revision', dataIndex: 'revision', key: 'revision', width: 90 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>
    },
    {
      title: 'Chart',
      key: 'chart',
      ellipsis: true,
      render: (_, r) => `${r.chartName}-${r.chartVersion}`
    },
    { title: 'App version', dataIndex: 'appVersion', key: 'appVersion', width: 110, ellipsis: true },
    {
      title: 'Updated',
      dataIndex: 'updated',
      key: 'updated',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : '-')
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '',
      key: 'actions',
      width: 110,
      render: (_, r) =>
        r.status === 'deployed' ? (
          <Typography.Text type="secondary">Current</Typography.Text>
        ) : (
          <Popconfirm
            title={`Roll back to revision ${r.revision}?`}
            description="This re-applies that revision's manifest to the cluster."
            onConfirm={() => handleRollback(r.revision)}
            okText="Rollback"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              icon={<Icon icon={Undo2} variant="detail" />}
              loading={rollingBack === r.revision}
            >
              Rollback
            </Button>
          </Popconfirm>
        )
    }
  ]

  if (isLoading) return <LoadingState />
  if (error) return <Empty description={error} />
  if (history.length === 0) return <Empty description="No revision history found" />

  return (
    <div className="ml-helm-history-tab">
      <ResizableTable
        tableKey="helm-release-history"
        rowKey="id"
        columns={columns}
        dataSource={history}
        pagination={false}
        size="small"
      />
    </div>
  )
}
