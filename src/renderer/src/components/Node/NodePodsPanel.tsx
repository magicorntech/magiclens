import { useMemo, useState } from 'react'
import { Input, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { ResourceListItem } from '@shared/types/resource'
import { useResourceList } from '../../queries/useResourceList'
import { podMetricsKey, usePodTableMetrics } from '../../queries/usePodTableMetrics'
import { formatBytes } from '../../format'
import { ResizableTable } from '../../utils/ResizableTable'
import { StatusTag } from '../ResourceTable/StatusTag'
import { AgeCell } from '../ResourceTable/AgeCell'
import { ResourceRowActions } from '../ResourceTable/ResourceRowActions'
import { UsageRequestCell } from '../Metrics/UsageRequestCell'
import { useBottomPanelOptional } from '../Layout/BottomPanelContext'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { compareAgeTimestamps, compareColumnValues, compareUsageRatio, statusSorter } from '../../utils/tableSort'

interface NodePodsPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

interface NodePodRow extends ResourceListItem {
  cpuUsageCores?: number
  memoryUsageBytes?: number
}

const PODS_LIST_NAMESPACE = 'ALL'

export function NodePodsPanel({
  clusterId,
  nodeName,
  isActive
}: NodePodsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const openResourceDetail = useBottomPanelOptional()?.openResourceDetail
  const { data: podsData } = useResourceList(clusterId, PODS_LIST_NAMESPACE, 'Pods', isActive)
  const { setPagination, paginationProps } = useTablePagination([clusterId, nodeName])
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const listQueryKey = useMemo(
    () => ['resource-list', clusterId, PODS_LIST_NAMESPACE, 'Pods'],
    [clusterId]
  )

  const nodePods = useMemo(() => {
    if (!podsData || 'error' in podsData) return []
    return podsData.items.filter((p) => p.columns.node === nodeName)
  }, [podsData, nodeName])

  const podMetricsByKey = usePodTableMetrics(clusterId, PODS_LIST_NAMESPACE, isActive)

  const rows: NodePodRow[] = useMemo(
    () =>
      nodePods.map((pod) => {
        const metrics = podMetricsByKey.get(podMetricsKey(pod.namespace, pod.name))
        return {
          ...pod,
          cpuUsageCores: metrics?.cpu,
          memoryUsageBytes: metrics?.memory
        }
      }),
    [nodePods, podMetricsByKey]
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) => row.name.toLowerCase().includes(q) || row.namespace.toLowerCase().includes(q)
    )
  }, [rows, filter])

  const counts = useMemo(() => {
    let running = 0
    let pending = 0
    let failed = 0
    for (const row of rows) {
      if (row.statusColor === 'green') running += 1
      else if (row.statusColor === 'red') failed += 1
      else pending += 1
    }
    return { running, pending, failed }
  }, [rows])

  const columns: ColumnsType<NodePodRow> = [
    {
      title: t('nodePods.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    },
    {
      title: t('nodePods.namespace'),
      dataIndex: 'namespace',
      key: 'namespace',
      width: 140,
      ellipsis: true,
      sorter: (a, b) => a.namespace.localeCompare(b.namespace, undefined, { sensitivity: 'base' })
    },
    {
      title: t('nodePods.ready'),
      key: 'ready',
      width: 72,
      sorter: (a, b) => compareColumnValues('ready', a.columns.ready ?? '', b.columns.ready ?? ''),
      render: (_, row) => row.columns.ready ?? '—'
    },
    {
      title: t('nodePods.status'),
      key: 'status',
      width: 120,
      sorter: statusSorter,
      render: (_, row) => <StatusTag text={row.statusText} color={row.statusColor} detail={row.statusDetail} />
    },
    {
      title: t('nodePods.cpu'),
      key: 'cpu',
      width: 168,
      ellipsis: false,
      sorter: (a, b, order) =>
        compareUsageRatio(
          a.cpuUsageCores,
          Number(a.columns.cpuRequest) || 0,
          b.cpuUsageCores,
          Number(b.columns.cpuRequest) || 0,
          order
        ),
      render: (_, row) => (
        <UsageRequestCell
          usage={row.cpuUsageCores}
          request={Number(row.columns.cpuRequest) || 0}
          formatUsage={(n) => n.toFixed(2)}
          formatRequest={(n) => n.toFixed(2)}
          clusterId={clusterId}
          namespace={row.namespace}
          podName={row.name}
          metric="cpu"
          isActive={isActive}
        />
      )
    },
    {
      title: t('nodePods.memory'),
      key: 'memory',
      width: 180,
      ellipsis: false,
      sorter: (a, b, order) =>
        compareUsageRatio(
          a.memoryUsageBytes,
          Number(a.columns.memoryRequest) || 0,
          b.memoryUsageBytes,
          Number(b.columns.memoryRequest) || 0,
          order
        ),
      render: (_, row) => (
        <UsageRequestCell
          usage={row.memoryUsageBytes}
          request={Number(row.columns.memoryRequest) || 0}
          formatUsage={formatBytes}
          formatRequest={formatBytes}
          clusterId={clusterId}
          namespace={row.namespace}
          podName={row.name}
          metric="memory"
          isActive={isActive}
        />
      )
    },
    {
      title: t('nodePods.restarts'),
      key: 'restarts',
      width: 80,
      sorter: (a, b) => compareColumnValues('restarts', a.columns.restarts ?? '0', b.columns.restarts ?? '0'),
      render: (_, row) => row.columns.restarts ?? '0'
    },
    {
      title: t('nodePods.age'),
      key: 'age',
      width: 88,
      sorter: (a, b) => compareAgeTimestamps(a.ageTimestamp, b.ageTimestamp),
      render: (_, row) => <AgeCell timestamp={row.ageTimestamp} />
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, row) => (
        <ResourceRowActions
          clusterId={clusterId}
          target={{ type: 'builtin', kind: 'Pods' }}
          namespace={row.namespace}
          name={row.name}
          itemId={row.id}
          listQueryKey={listQueryKey}
        />
      )
    }
  ]

  function openPod(row: NodePodRow): void {
    setSelectedId(row.id)
    // Stay on Nodes. The pod opens as its own detail tab beside this node.
    openResourceDetail?.({
      clusterId,
      resourceKind: 'Pods',
      namespace: row.namespace,
      item: row
    })
  }

  if (nodePods.length === 0) {
    return (
      <Typography.Text type="secondary" className="ml-detail-empty">
        {t('nodePods.empty')}
      </Typography.Text>
    )
  }

  return (
    <div className="ml-node-pods">
      <div className="ml-node-pods__bar">
        <div className="ml-node-pods__stats">
          <span className="ml-node-pods__stat ml-node-pods__stat--ok">
            {t('nodePods.running', { count: counts.running })}
          </span>
          <span className="ml-node-pods__stat ml-node-pods__stat--warn">
            {t('nodePods.pending', { count: counts.pending })}
          </span>
          <span className="ml-node-pods__stat ml-node-pods__stat--bad">
            {t('nodePods.failed', { count: counts.failed })}
          </span>
        </div>
        <Input
          allowClear
          size="small"
          className="ml-node-pods__filter"
          placeholder={t('nodePods.filter')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <ResizableTable
        tableKey={`node-pods-${nodeName}`}
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        pagination={paginationProps(filtered.length)}
        onChange={(config) => setPagination(readPaginationChange(config))}
        onRow={(row) => ({
          onClick: () => openPod(row)
        })}
        rowClassName={(row) => (row.id === selectedId ? 'ml-node-pods-row--selected' : '')}
      />
    </div>
  )
}
