import { useEffect, useState } from 'react'
import { Button, Drawer, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { RolloutRevision, WorkloadKind } from '@shared/types/workload'
import { KubectlCommandPreview } from './KubectlCommandPreview'
import { kubectlRollbackCommand } from '@shared/workloadKubectl'
import { compareText } from '../../utils/tableSort'

interface RolloutHistoryDrawerProps {
  open: boolean
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  mode: 'history' | 'rollback'
  loading?: boolean
  onClose: () => void
  onRollback?: (revision: number, kubectlCommand: string) => void
}

export function RolloutHistoryDrawer({
  open,
  clusterId,
  kind,
  namespace,
  name,
  mode,
  loading,
  onClose,
  onRollback
}: RolloutHistoryDrawerProps): React.JSX.Element {
  const [revisions, setRevisions] = useState<RolloutRevision[]>([])
  const [currentRevision, setCurrentRevision] = useState(0)
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!open || kind !== 'Deployments') return
    setFetching(true)
    void window.api.workload
      .rolloutHistory({ clusterId, kind, namespace, name })
      .then((res) => {
        if ('error' in res) {
          message.error(res.error)
          return
        }
        setRevisions(res.revisions)
        setCurrentRevision(res.currentRevision)
        setSelectedRevision(null)
      })
      .finally(() => setFetching(false))
  }, [open, clusterId, kind, namespace, name])

  const columns: ColumnsType<RolloutRevision> = [
    { title: 'Revision', dataIndex: 'revision', key: 'revision', width: 90, sorter: (a, b) => a.revision - b.revision },
    {
      title: 'ReplicaSet',
      dataIndex: 'replicaSetName',
      key: 'replicaSetName',
      ellipsis: true,
      sorter: (a, b) => compareText(a.replicaSetName, b.replicaSetName)
    },
    {
      title: 'Ready',
      key: 'ready',
      width: 80,
      sorter: (a, b) => a.readyReplicas / Math.max(a.replicas, 1) - b.readyReplicas / Math.max(b.replicas, 1),
      render: (_, r) => `${r.readyReplicas}/${r.replicas}`
    },
    {
      title: 'Images',
      key: 'images',
      ellipsis: true,
      sorter: (a, b) => compareText(a.images.join(', '), b.images.join(', ')),
      render: (_, r) => r.images.join(', ')
    },
    {
      title: '',
      key: 'current',
      width: 80,
      render: (_, r) => (r.isCurrent ? <Tag color="blue">Current</Tag> : null)
    }
  ]

  const selected = revisions.find((r) => r.revision === selectedRevision)

  return (
    <Drawer
      title={mode === 'rollback' ? `Rollback ${name}` : `Rollout history — ${name}`}
      open={open}
      onClose={onClose}
      width={640}
      extra={
        mode === 'rollback' && selectedRevision != null && onRollback ? (
          <Button
            type="primary"
            danger
            loading={loading}
            disabled={selectedRevision === currentRevision}
            onClick={() =>
              onRollback(selectedRevision, kubectlRollbackCommand(name, namespace, selectedRevision))
            }
          >
            Rollback to revision {selectedRevision}
          </Button>
        ) : null
      }
    >
      <p style={{ marginBottom: 12, color: 'var(--ant-color-text-secondary)' }}>
        Current revision: <strong>{currentRevision || '—'}</strong>
      </p>
      <Table
        size="small"
        rowKey="revision"
        loading={fetching}
        dataSource={revisions}
        columns={columns}
        pagination={false}
        rowSelection={
          mode === 'rollback'
            ? {
                type: 'radio',
                selectedRowKeys: selectedRevision != null ? [selectedRevision] : [],
                onChange: (keys) => setSelectedRevision(Number(keys[0]))
              }
            : undefined
        }
        onRow={(record) => ({
          onClick: mode === 'rollback' ? () => setSelectedRevision(record.revision) : undefined,
          style: { cursor: mode === 'rollback' ? 'pointer' : undefined }
        })}
      />
      {mode === 'rollback' && selected ? (
        <div style={{ marginTop: 16 }}>
          <p>
            Rollback from revision <strong>{currentRevision}</strong> to <strong>{selected.revision}</strong>
          </p>
          <KubectlCommandPreview command={kubectlRollbackCommand(name, namespace, selected.revision)} />
        </div>
      ) : null}
    </Drawer>
  )
}
