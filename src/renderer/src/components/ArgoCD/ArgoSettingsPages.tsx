import { useMemo, useState } from 'react'
import { Empty, Input, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceListItem } from '@shared/types/resource'
import type { ArgoClusterEntry, ArgoRepository } from '@shared/types/argocd'
import { useArgoClusters, useArgoRepositories } from '../../queries/useArgoCd'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { ResourceDetailDrawer } from '../ResourceTable/ResourceDetailDrawer'
import { AgeCell } from '../ResourceTable/AgeCell'
import { ArgoNotInstalled } from './ArgoNotInstalled'
import { ArgoPageHeader } from './ArgoPageHeader'

/**
 * Argo's repository and cluster registrations, read from the labelled Secrets in Argo's
 * namespace.
 *
 * The tables themselves only ever show what identifies an entry — the main-process service
 * never decodes a repository's credential keys, so nothing sensitive reaches these lists.
 * Clicking a row opens the app's standard Secret detail drawer, which already provides the
 * properties view, the masked data fields, and the edit/delete actions; reusing it keeps these
 * pages identical to every other resource in the app instead of inventing a parallel UI.
 */

/** Adapts a registry row to the shape the shared resource drawer expects. */
function toSecretItem(row: { id: string; namespace: string; ageTimestamp: string | null }): ResourceListItem {
  return {
    id: row.id,
    name: row.id,
    namespace: row.namespace,
    ageTimestamp: row.ageTimestamp,
    statusText: '',
    statusColor: '',
    columns: {}
  }
}

function notInstalled(error: string | undefined): React.JSX.Element | null {
  if (!error) return null
  return /not found|could not find|404/i.test(error) ? (
    <ArgoNotInstalled />
  ) : (
    <Empty description={error} />
  )
}

export function ArgoRepositoriesPage({ clusterId }: { clusterId: string }): React.JSX.Element {
  const { data, isLoading } = useArgoRepositories(clusterId)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ResourceListItem | null>(null)
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

  const repositories = useMemo(() => data?.repositories ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repositories
    return repositories.filter((r) =>
      [r.name, r.url, r.type, r.project].some((v) => v.toLowerCase().includes(q))
    )
  }, [repositories, search])

  const columns: ColumnsType<ArgoRepository> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 220, ellipsis: true },
    { title: 'Type', key: 'type', width: 100, render: (_v, r) => <Tag>{r.type}</Tag> },
    {
      title: 'URL',
      key: 'url',
      ellipsis: true,
      render: (_v, r) => (
        <Tooltip title={r.url}>
          <span>{r.url || '—'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Project',
      key: 'project',
      width: 160,
      // An empty project means the repo is available to every project.
      render: (_v, r) => r.project || <span className="ml-argo-muted">all</span>
    },
    {
      title: 'Age',
      key: 'age',
      width: 90,
      render: (_v, r) => <AgeCell timestamp={r.ageTimestamp} />
    }
  ]

  const failure = notInstalled(data?.error)
  if (failure) return failure

  return (
    <div className="ml-argo-page">
      <ArgoPageHeader
        title="Repositories"
        subtitle={
          filtered.length === repositories.length
            ? `${repositories.length} repositor${repositories.length === 1 ? 'y' : 'ies'}`
            : `${filtered.length} of ${repositories.length} repositories`
        }
      />
      <ResourceTableToolbar
        search={
          <Input.Search
            className="ml-resource-search"
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isLoading && filtered.length === 0 ? (
          <Empty description="No repositories registered" />
        ) : (
          <ResizableTable
            tableKey="argo-repositories"
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={isLoading}
            pagination={paginationProps(filtered.length)}
            onChange={(p) => setPagination(readPaginationChange(p))}
            size="middle"
            rowClassName={() => 'ml-argo-row--clickable'}
            onRow={(r) => ({ onClick: () => setSelected(toSecretItem(r)) })}
          />
        )}
      </div>

      <ResourceDetailDrawer
        open={!!selected}
        clusterId={clusterId}
        kind="Secrets"
        item={selected}
        isActive
        listQueryKey={['argocd-repositories', clusterId]}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

export function ArgoClustersPage({ clusterId }: { clusterId: string }): React.JSX.Element {
  const { data, isLoading } = useArgoClusters(clusterId)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ResourceListItem | null>(null)
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

  const clusters = useMemo(() => data?.clusters ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clusters
    return clusters.filter((c) => [c.name, c.server].some((v) => v.toLowerCase().includes(q)))
  }, [clusters, search])

  const columns: ColumnsType<ArgoClusterEntry> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 260, ellipsis: true },
    { title: 'Server', dataIndex: 'server', key: 'server', ellipsis: true },
    {
      title: 'Age',
      key: 'age',
      width: 90,
      render: (_v, r) => <AgeCell timestamp={r.ageTimestamp} />
    }
  ]

  const failure = notInstalled(data?.error)
  if (failure) return failure

  return (
    <div className="ml-argo-page">
      <ArgoPageHeader
        title="Clusters"
        subtitle={
          filtered.length === clusters.length
            ? `${clusters.length} cluster${clusters.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${clusters.length} clusters`
        }
      />
      <ResourceTableToolbar
        search={
          <Input.Search
            className="ml-resource-search"
            placeholder="Search clusters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isLoading && filtered.length === 0 ? (
          <Empty description="No clusters registered" />
        ) : (
          <ResizableTable
            tableKey="argo-clusters"
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={isLoading}
            pagination={paginationProps(filtered.length)}
            onChange={(p) => setPagination(readPaginationChange(p))}
            size="middle"
            rowClassName={() => 'ml-argo-row--clickable'}
            onRow={(r) => ({ onClick: () => setSelected(toSecretItem(r)) })}
          />
        )}
      </div>

      <ResourceDetailDrawer
        open={!!selected}
        clusterId={clusterId}
        kind="Secrets"
        item={selected}
        isActive
        listQueryKey={['argocd-clusters', clusterId]}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
