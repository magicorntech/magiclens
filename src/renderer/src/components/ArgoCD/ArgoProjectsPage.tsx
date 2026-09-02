import { useMemo, useState } from 'react'
import { Empty, Input, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ArgoProject } from '@shared/types/argocd'
import { useArgoProjects } from '../../queries/useArgoCd'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { AgeCell } from '../ResourceTable/AgeCell'
import { ArgoNotInstalled } from './ArgoNotInstalled'
import { ArgoPageHeader } from './ArgoPageHeader'

/** Repo/destination lists can be long; show the first and reveal the rest on hover. */
function ListCell({ values }: { values: string[] }): React.JSX.Element {
  if (values.length === 0) return <span>—</span>
  const [first, ...rest] = values
  if (rest.length === 0) return <span>{first}</span>
  return (
    <Tooltip title={values.join('\n')}>
      <span>
        {first} <em>+{rest.length}</em>
      </span>
    </Tooltip>
  )
}

export function ArgoProjectsPage({ clusterId }: { clusterId: string }): React.JSX.Element {
  const { data, isLoading } = useArgoProjects(clusterId)
  const [search, setSearch] = useState('')
  const { setPagination, paginationProps } = useTablePagination([clusterId, search])

  const projects = useMemo(() => data?.projects ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      [p.name, p.namespace, p.description].some((v) => v.toLowerCase().includes(q))
    )
  }, [projects, search])

  const columns: ColumnsType<ArgoProject> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Source repos',
      key: 'sourceRepos',
      width: 240,
      ellipsis: true,
      render: (_v, r) => <ListCell values={r.sourceRepos} />
    },
    {
      title: 'Destinations',
      key: 'destinations',
      width: 220,
      ellipsis: true,
      render: (_v, r) => <ListCell values={r.destinations} />
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
        title="Projects"
        subtitle={
          filtered.length === projects.length
            ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${projects.length} projects`
        }
      />
      <ResourceTableToolbar
        search={
          <Input.Search
            className="ml-resource-search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        }
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isLoading && filtered.length === 0 ? (
          <Empty description="No AppProjects found" />
        ) : (
          <ResizableTable
            tableKey="argo-projects"
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
