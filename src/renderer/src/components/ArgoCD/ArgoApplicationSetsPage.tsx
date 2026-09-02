import { useMemo, useState } from 'react'
import { Empty, Input, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ArgoApplicationSet } from '@shared/types/argocd'
import { useArgoApplicationSets } from '../../queries/useArgoCd'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { AgeCell } from '../ResourceTable/AgeCell'
import { ArgoNotInstalled } from './ArgoNotInstalled'
import { ArgoPageHeader } from './ArgoPageHeader'

export function ArgoApplicationSetsPage({
  clusterId
}: {
  clusterId: string
}): React.JSX.Element {
  const { data, isLoading } = useArgoApplicationSets(clusterId)
  const [search, setSearch] = useState('')
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

  const sets = useMemo(() => data?.applicationSets ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sets
    return sets.filter((s) =>
      [s.name, s.namespace, ...s.generators].some((v) => v.toLowerCase().includes(q))
    )
  }, [sets, search])

  const columns: ColumnsType<ArgoApplicationSet> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 260, ellipsis: true },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', width: 180, ellipsis: true },
    {
      title: 'Generators',
      key: 'generators',
      render: (_v, r) =>
        r.generators.length === 0 ? (
          '—'
        ) : (
          <span>
            {r.generators.map((g) => (
              <Tag key={g}>{g}</Tag>
            ))}
          </span>
        )
    },
    {
      title: 'Applications',
      dataIndex: 'applicationCount',
      key: 'applicationCount',
      width: 130
    },
    {
      title: 'Age',
      key: 'age',
      width: 90,
      render: (_v, r) => <AgeCell timestamp={r.ageTimestamp} />
    }
  ]

  if (data?.error) {
    return /not found|could not find|404/i.test(data.error) ? (
      <ArgoNotInstalled />
    ) : (
      <Empty description={data.error} />
    )
  }

  return (
    <div className="ml-argo-page">
      <ArgoPageHeader
        title="Application Sets"
        subtitle={
          filtered.length === sets.length
            ? `${sets.length} application set${sets.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${sets.length} application sets`
        }
      />
      <ResourceTableToolbar
        search={
          <Input.Search
            className="ml-resource-search"
            placeholder="Search application sets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isLoading && filtered.length === 0 ? (
          <Empty description="No ApplicationSets found" />
        ) : (
          <ResizableTable
            tableKey="argo-application-sets"
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={isLoading}
            pagination={paginationProps(filtered.length)}
            onChange={(paginationConfig) => setPagination(readPaginationChange(paginationConfig))}
            size="middle"
          />
        )}
      </div>
    </div>
  )
}
