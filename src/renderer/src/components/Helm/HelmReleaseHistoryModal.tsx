import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Modal, Popconfirm, Tag, Typography, message } from 'antd'
import { History, Undo2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmReleaseHistoryEntry } from '@shared/types/helm'
import { useHelmHistory } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'

interface HelmReleaseHistoryModalProps {
  clusterId: string
  namespace: string
  name: string
  open: boolean
  onClose: () => void
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

export function HelmReleaseHistoryModal({
  clusterId,
  namespace,
  name,
  open,
  onClose
}: HelmReleaseHistoryModalProps): React.JSX.Element {
  const { data, isLoading } = useHelmHistory(open ? clusterId : null, namespace, name)
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
        message.warning(`Rolled back with ${res.warnings.length} resource warning(s): ${res.warnings[0]}`)
      } else {
        message.success(`Rolled back "${name}" to revision ${targetRevision} (new revision ${res.newRevision})`)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['helm-history', clusterId, namespace, name] }),
        queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] }),
        queryClient.invalidateQueries({ queryKey: ['helm-charts', clusterId] })
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
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
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
            <Button size="small" icon={<Icon icon={Undo2} variant="detail" />} loading={rollingBack === r.revision}>
              Rollback
            </Button>
          </Popconfirm>
        )
    }
  ]

  return (
    <Modal
      title={
        <>
          <Icon icon={History} variant="action" /> History — {name}{' '}
          <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
            {namespace}
          </Typography.Text>
        </>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <Empty description={error} />
      ) : history.length === 0 ? (
        <Empty description="No revision history found" />
      ) : (
        <ResizableTable tableKey="helm-release-history" rowKey="id" columns={columns} dataSource={history} pagination={false} size="small" />
      )}
    </Modal>
  )
}
