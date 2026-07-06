import { useEffect, useMemo, useState } from 'react'
import { Empty, Input, Splitter, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { CustomResourceKind, DynamicResourceItem } from '@shared/types/discovery'
import { useCustomResourceKinds, useDynamicResourceList } from '../../queries/useDiscovery'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface CustomResourceBrowserPageProps {
  clusterId: string
  namespace: string
  mode: 'all' | 'installed'
}

const kindColumns: ColumnsType<CustomResourceKind> = [
  { title: 'Kind', dataIndex: 'kind', key: 'kind' },
  { title: 'Group', dataIndex: 'group', key: 'group', ellipsis: true },
  {
    title: 'Scope',
    dataIndex: 'namespaced',
    key: 'namespaced',
    width: 90,
    render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'NS' : 'Cluster'}</Tag>
  }
]

const instanceColumns: ColumnsType<DynamicResourceItem> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
  {
    title: 'Age',
    dataIndex: 'ageTimestamp',
    key: 'age',
    render: (v: string | null) => (v ? new Date(v).toLocaleString() : '-')
  },
  {
    title: 'Labels',
    dataIndex: 'labelKeys',
    key: 'labelKeys',
    render: (keys: string[]) => keys.map((k) => <Tag key={k}>{k}</Tag>)
  }
]

export function CustomResourceBrowserPage({
  clusterId,
  namespace,
  mode
}: CustomResourceBrowserPageProps): React.JSX.Element {
  const { data: kindsData, isLoading: kindsLoading } = useCustomResourceKinds(clusterId, mode === 'installed')
  const [search, setSearch] = useState('')
  const [selectedKind, setSelectedKind] = useState<CustomResourceKind | null>(null)

  const kinds = kindsData && 'kinds' in kindsData ? kindsData.kinds : []
  const kindsError = kindsData && 'error' in kindsData ? kindsData.error : null

  const filteredKinds = useMemo(
    () => kinds.filter((k) => k.kind.toLowerCase().includes(search.toLowerCase()) || k.group.includes(search)),
    [kinds, search]
  )

  useEffect(() => {
    if (selectedKind && !kinds.some((k) => k.crdName === selectedKind.crdName)) {
      setSelectedKind(null)
    }
  }, [kinds, selectedKind])

  const { data: instancesData, isLoading: instancesLoading } = useDynamicResourceList(
    clusterId,
    selectedKind?.apiVersion ?? null,
    selectedKind?.kind ?? null,
    selectedKind?.namespaced ?? false,
    namespace
  )

  const instances = instancesData && 'items' in instancesData ? instancesData.items : []
  const instancesError = instancesData && 'error' in instancesData ? instancesData.error : null

  const title = mode === 'installed' ? 'Installed Operator Resources' : 'Dynamic Custom Resources'
  const description =
    mode === 'installed'
      ? "CRD-backed kinds that currently have at least one live instance — the resources actually in use by operators installed on this cluster."
      : 'Every kind defined by a CustomResourceDefinition on this cluster, browsed generically — no per-kind code required, so newly installed CRDs and operators show up immediately.'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      {kindsLoading ? (
        <LoadingState />
      ) : kindsError ? (
        <Empty description={kindsError} />
      ) : kinds.length === 0 ? (
        <Empty description="No custom resource kinds found on this cluster" />
      ) : (
        <Splitter style={{ flex: 1, minHeight: 0 }}>
          <Splitter.Panel defaultSize="30%" min="20%" max="50%">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingRight: 8 }}>
              <Input.Search
                placeholder="Filter kinds..."
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Table
                  rowKey="crdName"
                  columns={kindColumns}
                  dataSource={filteredKinds}
                  pagination={false}
                  size="small"
                  onRow={(row) => ({
                    onClick: () => setSelectedKind(row),
                    style: {
                      cursor: 'pointer',
                      background: selectedKind?.crdName === row.crdName ? 'rgba(22,119,255,0.08)' : undefined
                    }
                  })}
                />
              </div>
            </div>
          </Splitter.Panel>
          <Splitter.Panel>
            <div style={{ height: '100%', overflow: 'auto', paddingLeft: 8 }}>
              {!selectedKind ? (
                <Empty description="Select a kind on the left to browse its instances" style={{ marginTop: 48 }} />
              ) : instancesLoading ? (
                <LoadingState />
              ) : instancesError ? (
                <Empty description={instancesError} />
              ) : (
                <>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {selectedKind.kind}{' '}
                    <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                      {selectedKind.apiVersion}
                    </Typography.Text>
                  </Typography.Title>
                  {selectedKind.shortNames.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {selectedKind.shortNames.map((s) => (
                        <Tag key={s}>{s}</Tag>
                      ))}
                    </div>
                  )}
                  <Table
                    rowKey="id"
                    columns={instanceColumns}
                    dataSource={instances}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No live instances of this kind' }}
                  />
                </>
              )}
            </div>
          </Splitter.Panel>
        </Splitter>
      )}
    </div>
  )
}
