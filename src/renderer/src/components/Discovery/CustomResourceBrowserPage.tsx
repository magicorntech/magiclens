import { useEffect, useMemo, useState } from 'react'
import { Empty, Input, Space, Splitter, Tag, Typography } from 'antd'
import { Plus, Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import type { CustomResourceKind, DynamicResourceItem } from '@shared/types/discovery'
import type { DynamicResourceFocus } from '@shared/types/navigation'
import { primaryNamespace } from '@shared/namespaceSelection'
import { useCustomResourceKinds, useDynamicResourceList } from '../../queries/useDiscovery'
import { useDynamicResourceWatch } from '../../queries/useResourceWatch'
import { NamespaceSelector } from '../Layout/NamespaceSelector'
import { useClusterStore } from '../../stores/clusterStore'
import { compareAgeTimestamps } from '../../utils/tableSort'
import { readPaginationChange, useTablePagination } from '../../utils/tablePagination'
import { ResizableTable } from '../../utils/ResizableTable'
import { WatchStatusBadge } from '../ResourceTable/WatchStatusBadge'
import { AgeCell } from '../ResourceTable/AgeCell'
import { ResourceRowActions } from '../ResourceTable/ResourceRowActions'
import { ResourceTableToolbar } from '../ResourceTable/ResourceTableToolbar'
import { batchDeleteResources, confirmBatchDelete } from '../ResourceTable/batchDelete'
import { useBottomPanel } from '../Layout/BottomPanelContext'

interface CustomResourceBrowserPageProps {
  clusterId: string
  namespace: string
  mode: 'all' | 'installed'
  initialFocus?: DynamicResourceFocus | null
  onFocusConsumed?: () => void
}

const kindColumns: ColumnsType<CustomResourceKind> = [
  {
    title: 'Kind',
    dataIndex: 'kind',
    key: 'kind',
    ellipsis: true,
    render: (v: string) => <Typography.Text strong>{v}</Typography.Text>
  },
  { title: 'Group', dataIndex: 'group', key: 'group', ellipsis: true },
  {
    title: 'Scope',
    dataIndex: 'namespaced',
    key: 'namespaced',
    width: 88,
    render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'NS' : 'Cluster'}</Tag>
  }
]

function buildDynamicCreateTemplate(kind: CustomResourceKind, namespaceSelection: string): string {
  const ns = primaryNamespace(namespaceSelection)
  const metaNamespace = kind.namespaced && ns && ns !== 'ALL' ? `\n  namespace: ${ns}` : ''
  return `apiVersion: ${kind.apiVersion}\nkind: ${kind.kind}\nmetadata:\n  name: my-${kind.singular}${metaNamespace}\nspec: {}\n`
}

export function CustomResourceBrowserPage({
  clusterId,
  namespace,
  mode,
  initialFocus,
  onFocusConsumed
}: CustomResourceBrowserPageProps): React.JSX.Element {
  const { data: kindsData, isLoading: kindsLoading } = useCustomResourceKinds(clusterId, mode === 'installed')
  const [search, setSearch] = useState('')
  const [selectedKind, setSelectedKind] = useState<CustomResourceKind | null>(null)
  const { openYamlEditor } = useBottomPanel()
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const queryClient = useQueryClient()
  const [selectedInstanceKeys, setSelectedInstanceKeys] = useState<string[]>([])
  const { setPagination: setKindPagination, paginationProps: kindPaginationProps } = useTablePagination([
    clusterId,
    mode,
    search
  ])
  const { setPagination: setInstancePagination, paginationProps: instancePaginationProps } = useTablePagination([
    clusterId,
    namespace,
    selectedKind?.crdName ?? null
  ])

  const kinds = kindsData && 'kinds' in kindsData ? kindsData.kinds : []
  const kindsError = kindsData && 'error' in kindsData ? kindsData.error : null

  const filteredKinds = useMemo(
    () =>
      kinds.filter(
        (k) =>
          k.kind.toLowerCase().includes(search.toLowerCase()) ||
          k.group.toLowerCase().includes(search.toLowerCase()) ||
          k.crdName.toLowerCase().includes(search.toLowerCase())
      ),
    [kinds, search]
  )

  useEffect(() => {
    setSelectedInstanceKeys([])
  }, [selectedKind?.crdName, namespace])

  useEffect(() => {
    if (!initialFocus || kinds.length === 0) return
    const kind = kinds.find(
      (k) => k.kind === initialFocus.kind && k.apiVersion === initialFocus.apiVersion
    )
    if (kind) {
      setSelectedKind(kind)
      setSearch(initialFocus.name)
    }
    onFocusConsumed?.()
  }, [initialFocus, kinds, onFocusConsumed])

  const watchStatus = useDynamicResourceWatch(
    clusterId,
    namespace,
    selectedKind?.apiVersion ?? null,
    selectedKind?.kind ?? null,
    selectedKind?.plural ?? null,
    selectedKind?.namespaced ?? false,
    !!selectedKind
  )
  const needsPollingFallback =
    watchStatus === 'fallback-polling' ||
    watchStatus === 'error' ||
    watchStatus === 'disconnected' ||
    watchStatus === 'reconnecting'
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

  useEffect(() => {
    if (selectedKind && !kinds.some((k) => k.crdName === selectedKind.crdName)) {
      setSelectedKind(null)
    }
  }, [kinds, selectedKind])

  const selectedInstances = useMemo(
    () => instances.filter((item) => selectedInstanceKeys.includes(item.id)),
    [instances, selectedInstanceKeys]
  )

  function handleBatchDelete(): void {
    if (!selectedKind || selectedInstances.length === 0) return
    confirmBatchDelete(selectedKind.kind, selectedInstances, async () => {
      const result = await batchDeleteResources(
        queryClient,
        listQueryKey,
        clusterId,
        {
          type: 'dynamic',
          apiVersion: selectedKind.apiVersion,
          kind: selectedKind.kind,
          plural: selectedKind.plural,
          namespaced: selectedKind.namespaced
        },
        selectedInstances
      )
      if (result.failed.length === 0) {
        setSelectedInstanceKeys([])
      }
      return result
    })
  }

  const instanceColumns: ColumnsType<DynamicResourceItem> = useMemo(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
      {
        title: 'Namespace',
        dataIndex: 'namespace',
        key: 'namespace',
        width: 140,
        ellipsis: true,
        render: (v: string | null) => v || '—'
      },
      {
        title: 'Age',
        dataIndex: 'ageTimestamp',
        key: 'age',
        width: 100,
        sorter: (a, b) => compareAgeTimestamps(a.ageTimestamp, b.ageTimestamp),
        render: (v: string | null) => <AgeCell timestamp={v} />
      },
      {
        title: 'Labels',
        dataIndex: 'labelKeys',
        key: 'labelKeys',
        ellipsis: true,
        render: (keys: string[]) =>
          keys.length === 0 ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : (
            <span className="ml-crd-label-tags">
              {keys.slice(0, 4).map((k) => (
                <Tag key={k}>{k}</Tag>
              ))}
              {keys.length > 4 ? <Tag>+{keys.length - 4}</Tag> : null}
            </span>
          )
      },
      {
        title: '',
        key: 'actions',
        width: 56,
        fixed: 'right',
        render: (_, item) =>
          selectedKind ? (
            <ResourceRowActions
              clusterId={clusterId}
              target={{
                type: 'dynamic',
                apiVersion: selectedKind.apiVersion,
                kind: selectedKind.kind,
                plural: selectedKind.plural,
                namespaced: selectedKind.namespaced
              }}
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

  const title = mode === 'installed' ? 'Installed CRDs' : 'Dynamic Resources'
  const hint =
    mode === 'installed'
      ? 'CRD kinds that currently have at least one live instance'
      : 'Browse any CustomResourceDefinition kind on this cluster'

  return (
    <div className="ml-resource-page ml-crd-browser">
      <div className="ml-crd-browser__header">
        <div className="ml-crd-browser__header-copy">
          <Typography.Title level={4} className="ml-crd-browser__title">
            {title}
          </Typography.Title>
          <Typography.Text type="secondary" className="ml-crd-browser__hint">
            {hint}
          </Typography.Text>
        </div>
        {selectedKind ? <WatchStatusBadge isError={false} watchStatus={watchStatus} /> : null}
      </div>

      {kindsError ? (
        <Empty description={kindsError} />
      ) : (
        <>
          <ResourceTableToolbar
            leading={
              <NamespaceSelector
                clusterId={clusterId}
                value={namespace}
                onChange={(ns) => setSelectedNamespace(clusterId, ns)}
              />
            }
            search={
              <Input.Search
                className="ml-resource-search"
                placeholder="Search kinds…"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            }
            actions={
              selectedKind ? (
                <>
                  {selectedInstanceKeys.length > 0 ? (
                    <button
                      type="button"
                      className="ml-btn ml-btn--ghost ml-btn--danger"
                      onClick={handleBatchDelete}
                    >
                      <Icon icon={Trash2} variant="detail" />
                      <span>Delete ({selectedInstanceKeys.length})</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ml-btn ml-btn--ghost"
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
                    <Icon icon={Plus} variant="detail" />
                    <span>Create</span>
                  </button>
                </>
              ) : null
            }
          />

          <div className="ml-resource-page-body">
            {kindsLoading ? (
              <ResizableTable
                tableKey={`crd-kinds-${mode}`}
                rowKey="crdName"
                columns={kindColumns}
                dataSource={[]}
                loading
                pagination={false}
                size="middle"
              />
            ) : kinds.length === 0 ? (
              <Empty description="No custom resource kinds found on this cluster" />
            ) : filteredKinds.length === 0 ? (
              <Empty description="No kinds match your filter" />
            ) : (
              <Splitter className="ml-crd-browser__splitter">
                <Splitter.Panel defaultSize="34%" min="22%" max="48%">
                  <div className="ml-crd-browser__kinds">
                    <ResizableTable
                      tableKey={`crd-kinds-${mode}`}
                      rowKey="crdName"
                      columns={kindColumns}
                      dataSource={filteredKinds}
                      pagination={kindPaginationProps(filteredKinds.length)}
                      onChange={(paginationConfig) =>
                        setKindPagination(readPaginationChange(paginationConfig))
                      }
                      size="middle"
                      onRow={(row) => ({
                        onClick: () => setSelectedKind(row),
                        className:
                          selectedKind?.crdName === row.crdName
                            ? 'ml-crd-kind-row is-selected'
                            : 'ml-crd-kind-row'
                      })}
                    />
                  </div>
                </Splitter.Panel>
                <Splitter.Panel>
                  <div className="ml-crd-browser__instances">
                    {!selectedKind ? (
                      <Empty
                        description="Select a kind on the left to browse its instances"
                        style={{ marginTop: 48 }}
                      />
                    ) : instancesError ? (
                      <Empty description={String(instancesError)} />
                    ) : (
                      <>
                        <div className="ml-crd-browser__instance-meta">
                          <div className="ml-crd-browser__instance-title">
                            <Typography.Text strong>{selectedKind.kind}</Typography.Text>
                            <Typography.Text type="secondary" className="ml-crd-browser__api">
                              {selectedKind.apiVersion}
                            </Typography.Text>
                          </div>
                          {selectedKind.shortNames.length > 0 ? (
                            <Space size={[4, 4]} wrap>
                              {selectedKind.shortNames.map((s) => (
                                <Tag key={s}>{s}</Tag>
                              ))}
                            </Space>
                          ) : null}
                        </div>
                        <div className="ml-crd-browser__instance-table">
                          <ResizableTable
                            tableKey={`crd-instances-${selectedKind.crdName}`}
                            rowKey="id"
                            columns={instanceColumns}
                            dataSource={instances}
                            loading={instancesLoading}
                            pagination={instancePaginationProps(instances.length)}
                            onChange={(paginationConfig) =>
                              setInstancePagination(readPaginationChange(paginationConfig))
                            }
                            size="middle"
                            locale={{ emptyText: 'No live instances of this kind' }}
                            rowSelection={{
                              selectedRowKeys: selectedInstanceKeys,
                              onChange: (keys) => setSelectedInstanceKeys(keys as string[])
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Splitter.Panel>
              </Splitter>
            )}
          </div>
        </>
      )}
    </div>
  )
}
