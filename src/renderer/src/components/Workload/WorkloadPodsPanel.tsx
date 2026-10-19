import { useMemo } from 'react'
import { Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceListItem } from '@shared/types/resource'
import type { WorkloadKind, WorkloadPodInfo } from '@shared/types/workload'
import { useTranslation } from 'react-i18next'
import { useWorkloadPods } from '../../queries/useWorkloadPods'
import { ResizableTable } from '../../utils/ResizableTable'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { compareText } from '../../utils/tableSort'
import { useBottomPanelOptional } from '../Layout/BottomPanelContext'
import { ErrorState, LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResourceRowActions } from '../ResourceTable/ResourceRowActions'
import { StatusTag } from '../ResourceTable/StatusTag'

interface WorkloadPodsPanelProps {
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  isActive: boolean
}

function statusColor(pod: WorkloadPodInfo): string {
  if (pod.status === 'Failed') return 'red'
  if (pod.status === 'Pending' || !pod.ready) return 'gold'
  return 'green'
}

export function WorkloadPodsPanel({
  clusterId,
  kind,
  namespace,
  name,
  isActive
}: WorkloadPodsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const openResourceDetail = useBottomPanelOptional()?.openResourceDetail
  const { data, isLoading, isError, error, refetch } = useWorkloadPods(
    clusterId,
    kind,
    namespace,
    name,
    isActive
  )
  const { setPagination, paginationProps } = useTablePagination([clusterId, kind, namespace, name])
  const listQueryKey = useMemo(
    () => ['workload-pods', clusterId, kind, namespace, name],
    [clusterId, kind, namespace, name]
  )

  const pods = useMemo((): WorkloadPodInfo[] => {
    if (!data || 'error' in data) return []
    return data.pods
  }, [data])

  const loadError =
    (data && 'error' in data ? data.error : null) ??
    (isError ? (error instanceof Error ? error.message : String(error)) : null)

  const columns: ColumnsType<WorkloadPodInfo> = [
    {
      title: t('nodePods.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => compareText(a.name, b.name)
    },
    {
      title: t('nodePods.status'),
      key: 'status',
      width: 140,
      sorter: (a, b) => compareText(a.status, b.status),
      render: (_, row) => <StatusTag text={row.status} color={statusColor(row)} />
    },
    {
      title: t('resourceDetail.workloadPods.ready'),
      key: 'ready',
      width: 88,
      sorter: (a, b) => Number(a.ready) - Number(b.ready),
      render: (_, row) => (row.ready ? 'Ready' : 'NotReady')
    },
    {
      title: t('resourceDetail.workloadPods.containers'),
      key: 'containers',
      ellipsis: true,
      sorter: (a, b) => compareText(a.containers.join(', '), b.containers.join(', ')),
      render: (_, row) => row.containers.join(', ')
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, row) => (
        <ResourceRowActions
          clusterId={clusterId}
          target={{ type: 'builtin', kind: 'Pods' }}
          namespace={namespace}
          name={row.name}
          itemId={`${namespace}/${row.name}`}
          listQueryKey={listQueryKey}
        />
      )
    }
  ]

  function openPod(row: WorkloadPodInfo): void {
    const item: ResourceListItem = {
      id: `${namespace}/${row.name}`,
      name: row.name,
      namespace,
      ageTimestamp: null,
      statusText: row.status,
      statusColor: statusColor(row),
      columns: { ready: row.ready ? 'Ready' : 'NotReady' }
    }
    openResourceDetail?.({ clusterId, resourceKind: 'Pods', namespace, item })
  }

  if (isLoading) return <LoadingState />
  if (loadError) return <ErrorState message={loadError} onRetry={() => void refetch()} />
  if (pods.length === 0) {
    return (
      <Typography.Text type="secondary" className="ml-detail-empty">
        {t('resourceDetail.workloadPods.empty')}
      </Typography.Text>
    )
  }

  return (
    <ResizableTable
      tableKey={`workload-pods-${kind}-${namespace}-${name}`}
      rowKey="name"
      size="small"
      columns={columns}
      dataSource={pods}
      pagination={paginationProps(pods.length)}
      onChange={(config) => setPagination(readPaginationChange(config))}
      onRow={(row) => ({
        onClick: () => openPod(row)
      })}
    />
  )
}
