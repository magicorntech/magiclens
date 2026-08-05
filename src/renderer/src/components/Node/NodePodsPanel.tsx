import { useMemo } from 'react'
import { Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { useClusterStore } from '../../stores/clusterStore'
import { useLiveRefetchInterval } from '../../stores/useLiveRefetchInterval'
import { formatBytes, formatCores } from '../../format'
import { ResizableTable } from '../../utils/ResizableTable'
import { StatusTag } from '../ResourceTable/StatusTag'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'

interface NodePodsPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

interface NodePodRow extends ResourceListItem {
  cpuUsageCores?: number
  memoryUsageBytes?: number
}

export function NodePodsPanel({
  clusterId,
  nodeName,
  isActive
}: NodePodsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigateToResource = useClusterStore((s) => s.navigateToResource)
  const refetchInterval = useLiveRefetchInterval(isActive)
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive)
  const { setPagination, paginationProps } = useTablePagination([clusterId, nodeName])

  const nodePods = useMemo(() => {
    if (!podsData || 'error' in podsData) return []
    return podsData.items.filter((p) => p.columns.node === nodeName)
  }, [podsData, nodeName])

  // Single cluster-wide request so all rows get usage at once, not per namespace.
  const metricsQuery = useQuery({
    queryKey: ['namespace-pod-metrics', clusterId, 'ALL'],
    queryFn: () => window.api.pod.getNamespaceMetrics({ clusterId, namespace: 'ALL' }),
    enabled: isActive,
    refetchInterval,
    placeholderData: keepPreviousData
  })

  const metricsByPod = useMemo(() => {
    const map = new Map<string, { cpu: number; memory: number }>()
    const data = metricsQuery.data
    if (!data?.metricsAvailable) return map
    for (const pod of data.pods) {
      const key = pod.namespace ? `${pod.namespace}/${pod.podName}` : pod.podName
      map.set(key, { cpu: pod.cpuUsageCores, memory: pod.memoryUsageBytes })
    }
    return map
  }, [metricsQuery.data])

  const rows: NodePodRow[] = useMemo(
    () =>
      nodePods.map((pod) => {
        const metrics =
          metricsByPod.get(`${pod.namespace}/${pod.name}`) ?? metricsByPod.get(pod.name)
        return {
          ...pod,
          cpuUsageCores: metrics?.cpu,
          memoryUsageBytes: metrics?.memory
        }
      }),
    [nodePods, metricsByPod]
  )

  const columns: ColumnsType<NodePodRow> = [
    { title: t('nodePods.name'), dataIndex: 'name', key: 'name', ellipsis: true },
    { title: t('nodePods.namespace'), dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: t('nodePods.status'),
      key: 'status',
      width: 120,
      render: (_, row) => <StatusTag text={row.statusText} color={row.statusColor} detail={row.statusDetail} />
    },
    {
      title: 'CPU',
      key: 'cpu',
      width: 100,
      render: (_, row) =>
        row.cpuUsageCores !== undefined ? formatCores(row.cpuUsageCores) : '—'
    },
    {
      title: t('nodePods.memory'),
      key: 'memory',
      width: 110,
      render: (_, row) =>
        row.memoryUsageBytes !== undefined ? formatBytes(row.memoryUsageBytes) : '—'
    },
    {
      title: t('nodePods.restarts'),
      key: 'restarts',
      width: 88,
      render: (_, row) => row.columns.restarts ?? '0'
    }
  ]

  if (nodePods.length === 0) {
    return (
      <Typography.Text type="secondary" className="ml-detail-empty">
        {t('nodePods.empty')}
      </Typography.Text>
    )
  }

  return (
    <ResizableTable
      tableKey={`node-pods-${nodeName}`}
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={rows}
      pagination={paginationProps(rows.length)}
      onChange={(config) => setPagination(readPaginationChange(config))}
      onRow={(row) => ({
        onClick: () =>
          navigateToResource(clusterId, {
            kind: 'Pods',
            namespace: row.namespace,
            name: row.name
          })
      })}
    />
  )
}
