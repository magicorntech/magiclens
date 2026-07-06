import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Input, Space, Splitter, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { CustomResourceKind, DynamicResourceItem } from '@shared/types/discovery'
import { useCustomResourceKinds, useDynamicResourceList } from '../../queries/useDiscovery'
import { useDynamicResourceWatch } from '../../queries/useResourceWatch'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { ResourceRowActions } from '../ResourceTable/ResourceRowActions'
import { useBottomPanel } from '../Layout/BottomPanelContext'

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

function buildDynamicCreateTemplate(kind: CustomResourceKind, namespace: string): string {
  const metaNamespace = kind.namespaced && namespace !== 'ALL' ? `\n  namespace: ${namespace}` : ''
  return `apiVersion: ${kind.apiVersion}\nkind: ${kind.kind}\nmetadata:\n  name: my-${kind.singular}${metaNamespace}\nspec: {}\n`
}

export function CustomResourceBrowserPage({
  clusterId,
  namespace,
  mode
}: CustomResourceBrowserPageProps): React.JSX.Element {
  const { data: kindsData, isLoading: kindsLoading } = useCustomResourceKinds(clusterId, mode === 'installed')
  const [search, setSearch] = useState('')
  const [selectedKind, setSelectedKind] = useState<CustomResourceKind | null>(null)
  const { openYamlEditor } = useBottomPanel()

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

  const watchStatus = useDynamicResourceWatch(
    clusterId,
    namespace,
    selectedKind?.apiVersion ?? null,
    selectedKind?.kind ?? null,
    selectedKind?.plural ?? null,
    selectedKind?.namespaced ?? false,
    !!selectedKind
  )
  const needsPollingFallback = watchStatus === 'fallback-polling' || watchStatus === 'error' || watchStatus === 'disconnected'
  const { data: instancesData, isLoading: instancesLoading } = useDynamicResourceList(
    clusterId,
    selectedKind?.apiVersion ?? null,
    selectedKind?.kind ?? null,
    selectedKind?.namespaced ?? false,
    namespace,
    needsPollingFallback ? 5000 : false
  )

  const instances = instancesData && 'items' in instancesData ? instancesData.items : []
  const instancesError = instancesData && 'error' in instancesData ? instancesData.error : null

  const listQueryKey = useMemo(
    () => [
      'dynamic-resource-list',
      clusterId,
      selectedKind?.apiVersion ?? null,
      selectedKind?.kind ?? null,
      selectedKind?.namespaced ?? false,
      namespace
    ],
    [clusterId, selectedKind, namespace]
  )

  const instanceColumns: ColumnsType<DynamicResourceItem> = useMemo(
    () => [
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
      },
      {
        title: '',
        key: 'actions',
        width: 56,
        render: (_, item) =>
          selectedKind ? (
            <ResourceRowActions
              clusterId={clusterId}
              target={{ type: 'dynamic', apiVersion: selectedKind.apiVersion, kind: selectedKind.kind }}
              namespace={item.namespace}
              name={item.name}
              itemId={item.id}
              listQueryKey={listQueryKey}
            />
          ) : null
      }
    ],
    [clusterId, selectedKind, listQueryKey]
  )

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
                      background: selectedKind?.crdName === row.crdName ? 'var(--ml-selection-bg)' : undefined
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
                  <Space
                    align="start"
                    style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                  >
                    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
                      {selectedKind.kind}{' '}
                      <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                        {selectedKind.apiVersion}
                      </Typography.Text>
                    </Typography.Title>
                    <Button
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={() =>
                        openYamlEditor({
                          title: `New ${selectedKind.kind}`,
                          clusterId,
                          mode: 'create',
                          namespace,
                          initialYaml: buildDynamicCreateTemplate(selectedKind, namespace),
                          listQueryKey
                        })
                      }
                    >
                      Create
                    </Button>
                  </Space>
                  <div style={{ marginBottom: 8 }}>
                    <WatchStatusBadge isError={false} watchStatus={watchStatus} />
                  </div>
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
