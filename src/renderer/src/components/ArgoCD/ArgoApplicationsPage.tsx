import { useMemo, useState } from 'react'
import { Button, Empty, Input, Select, Tag, Tooltip, message } from 'antd'
import { RefreshCw, RotateCw } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import type { ArgoApplication } from '@shared/types/argocd'
import {
  useArgoApplications,
  useArgoRefresh,
  useArgoSync,
  useArgoSyncMany
} from '../../queries/useArgoCd'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { AgeCell } from '../ResourceTable/AgeCell'
import { Icon } from '../ui/Icon'
import { ArgoHealthTag, ArgoSyncTag } from './argoStatus'
import { ArgoNotInstalled } from './ArgoNotInstalled'
import { ArgoPageHeader } from './ArgoPageHeader'
import { ArgoApplicationDrawer, type ArgoApplicationTarget } from './ArgoApplicationDrawer'

interface ArgoApplicationsPageProps {
  clusterId: string
}

const ALL = '__all__'

export function ArgoApplicationsPage({ clusterId }: ArgoApplicationsPageProps): React.JSX.Element {
  const { data, isLoading } = useArgoApplications(clusterId)
  const sync = useArgoSync(clusterId)
  const refresh = useArgoRefresh(clusterId)
  const syncMany = useArgoSyncMany(clusterId)

  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState<string>(ALL)
  const [healthFilter, setHealthFilter] = useState<string>(ALL)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [detailTarget, setDetailTarget] = useState<ArgoApplicationTarget | null>(null)
  // Filters change the row set, so paging resets with them rather than stranding the user on
  // a page number that no longer exists.
  const { setPagination, paginationProps } = useTablePagination([
    clusterId,
    search,
    syncFilter,
    healthFilter
  ])

  const applications = useMemo(() => data?.applications ?? [], [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return applications.filter((app) => {
      if (syncFilter !== ALL && app.syncStatus !== syncFilter) return false
      if (healthFilter !== ALL && app.healthStatus !== healthFilter) return false
      if (!q) return true
      return [app.name, app.namespace, app.project, app.repoUrl, app.path, app.destNamespace].some(
        (v) => v.toLowerCase().includes(q)
      )
    })
  }, [applications, search, syncFilter, healthFilter])

  const runAction = (
    label: string,
    mutation: typeof sync,
    target: { namespace: string; name: string }
  ): void => {
    mutation.mutate(target, {
      onSuccess: (res) => {
        if (res.error) void message.error(res.error)
        else void message.success(`${label} requested for ${target.name}.`)
      },
      onError: (err) => void message.error(err instanceof Error ? err.message : String(err))
    })
  }

  const syncSelected = (): void => {
    const targets = applications
      .filter((a) => selectedRowKeys.includes(a.id))
      .map((a) => ({ namespace: a.namespace, name: a.name }))
    if (targets.length === 0) return

    syncMany.mutate(targets, {
      onSuccess: (res) => {
        if (res.error) {
          void message.error(res.error)
          return
        }
        const failed = res.failures?.length ?? 0
        if (failed > 0) void message.warning(`Synced ${res.succeeded ?? 0}, ${failed} failed.`)
        else void message.success(`Sync requested for ${res.succeeded ?? 0} application(s).`)
        setSelectedRowKeys([])
      },
      onError: (err) => void message.error(err instanceof Error ? err.message : String(err))
    })
  }

  const columns: ColumnsType<ArgoApplication> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 220, ellipsis: true },
    {
      title: 'Sync',
      key: 'sync',
      width: 120,
      render: (_v, r) => <ArgoSyncTag status={r.syncStatus} />
    },
    {
      title: 'Health',
      key: 'health',
      width: 130,
      render: (_v, r) => <ArgoHealthTag status={r.healthStatus} />
    },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 140, ellipsis: true },
    {
      title: 'Destination',
      key: 'destination',
      width: 180,
      ellipsis: true,
      render: (_v, r) => r.destNamespace || '—'
    },
    {
      title: 'Source',
      key: 'source',
      ellipsis: true,
      render: (_v, r) => (
        <Tooltip title={`${r.repoUrl}${r.path ? ` / ${r.path}` : ''}`}>
          <span>{r.path || r.repoUrl || '—'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Revision',
      key: 'revision',
      width: 110,
      render: (_v, r) => (r.revision ? <code>{r.revision}</code> : '—')
    },
    {
      title: 'Auto-sync',
      key: 'autoSync',
      width: 110,
      render: (_v, r) =>
        r.autoSync ? <Tag color="blue">Auto</Tag> : <Tag color="default">Manual</Tag>
    },
    {
      title: 'Age',
      key: 'age',
      width: 90,
      render: (_v, r) => <AgeCell timestamp={r.ageTimestamp} />
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      render: (_v, r) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Tooltip title="Sync">
            <Button
              size="small"
              icon={<Icon icon={RotateCw} variant="detail" />}
              onClick={() => runAction('Sync', sync, { namespace: r.namespace, name: r.name })}
            />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button
              size="small"
              icon={<Icon icon={RefreshCw} variant="detail" />}
              onClick={() =>
                runAction('Refresh', refresh, { namespace: r.namespace, name: r.name })
              }
            />
          </Tooltip>
        </span>
      )
    }
  ]

  if (data?.error) {
    // A missing CRD surfaces as a 404 from the list call — show the friendly state instead.
    return /not found|could not find|404/i.test(data.error) ? (
      <ArgoNotInstalled />
    ) : (
      <Empty description={data.error} />
    )
  }

  return (
    <div className="ml-argo-page">
      <ArgoPageHeader
        title="Applications"
        subtitle={
          filtered.length === applications.length
            ? `${applications.length} application${applications.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${applications.length} applications`
        }
      />
      {/* The toolbar's `leading` slot is locked to 200px, which would crush these two selects —
          they live with the actions instead, where the row can size to its content. */}
      <ResourceTableToolbar
        search={
          <Input.Search
            className="ml-resource-search"
            placeholder="Search applications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
        actions={
          <>
            <Select
              value={syncFilter}
              onChange={setSyncFilter}
              style={{ width: 140 }}
              options={[
                { value: ALL, label: 'All sync' },
                { value: 'Synced', label: 'Synced' },
                { value: 'OutOfSync', label: 'Out of sync' },
                { value: 'Unknown', label: 'Unknown' }
              ]}
            />
            <Select
              value={healthFilter}
              onChange={setHealthFilter}
              style={{ width: 150 }}
              options={[
                { value: ALL, label: 'All health' },
                { value: 'Healthy', label: 'Healthy' },
                { value: 'Progressing', label: 'Progressing' },
                { value: 'Degraded', label: 'Degraded' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Missing', label: 'Missing' },
                { value: 'Unknown', label: 'Unknown' }
              ]}
            />
            {selectedRowKeys.length > 0 ? (
              <Button
                type="primary"
                icon={<Icon icon={RotateCw} variant="detail" />}
                loading={syncMany.isPending}
                onClick={syncSelected}
              >
                Sync ({selectedRowKeys.length})
              </Button>
            ) : null}
          </>
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isLoading && filtered.length === 0 ? (
          <Empty description="No applications match your filters" />
        ) : (
          <ResizableTable
            tableKey="argo-applications"
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={isLoading}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={paginationProps(filtered.length)}
            onChange={(paginationConfig) =>
              setPagination(readPaginationChange(paginationConfig))
            }
            size="middle"
            rowClassName={() => 'ml-argo-row--clickable'}
            onRow={(r) => ({
              onClick: (e) => {
                // The row-select checkbox and the per-row Sync/Refresh buttons live inside the
                // row; clicking those must not also open the drawer.
                if ((e.target as HTMLElement).closest('button, .ant-checkbox-wrapper')) return
                setDetailTarget({ namespace: r.namespace, name: r.name })
              }
            })}
          />
        )}
      </div>

      <ArgoApplicationDrawer
        clusterId={clusterId}
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  )
}
