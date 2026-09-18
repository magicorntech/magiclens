import { useMemo } from 'react'
import { Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { WorkloadKind, WorkloadPodInfo } from '@shared/types/workload'
import { useTranslation } from 'react-i18next'
import { useWorkloadPods } from '../../queries/useWorkloadPods'
import { useClusterStore } from '../../stores/clusterStore'
import { ResizableTable } from '../../utils/ResizableTable'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ErrorState, LoadingState } from '../ResourceTable/EmptyErrorStates'
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
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const { data, isLoading, isError, error, refetch } = useWorkloadPods(
    clusterId,
    kind,
    namespace,
    name,
    isActive
  )
  const { setPagination, paginationProps } = useTablePagination([clusterId, kind, namespace, name])

  const pods = useMemo((): WorkloadPodInfo[] => {
    if (!data || 'error' in data) return []
    return data.pods
  }, [data])

  const loadError =
    (data && 'error' in data ? data.error : null) ??
    (isError ? (error instanceof Error ? error.message : String(error)) : null)

  const columns: ColumnsType<WorkloadPodInfo> = [
    { title: t('nodePods.name'), dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: t('nodePods.status'),
      key: 'status',
      width: 140,
      render: (_, row) => <StatusTag text={row.status} color={statusColor(row)} />
    },
    {
      title: t('resourceDetail.workloadPods.ready'),
      key: 'ready',
      width: 88,
      render: (_, row) => (row.ready ? 'Ready' : 'NotReady')
    },
    {
      title: t('resourceDetail.workloadPods.containers'),
      key: 'containers',
      ellipsis: true,
      render: (_, row) => row.containers.join(', ')
    }
  ]

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
        onClick: () =>
          navigateToResource(clusterId, {
            kind: 'Pods',
            namespace,
            name: row.name
          })
      })}
    />
  )
}
