import { useEffect, useMemo, useState } from 'react'
import { Empty, Input, Splitter, Tag } from 'antd'
import { Boxes, Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { batchDeleteResources, confirmBatchDelete } from '../ResourceTable/batchDelete'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { Icon } from '../ui/Icon'
import './crd-browser.css'

interface CustomResourceBrowserPageProps {
  clusterId: string
  namespace: string
  initialMode?: 'all' | 'installed'
  initialFocus?: DynamicResourceFocus | null
  onFocusConsumed?: () => void
}

type CrdTab = 'all' | 'installed'

function buildDynamicCreateTemplate(kind: CustomResourceKind, namespaceSelection: string): string {
  const ns = primaryNamespace(namespaceSelection)
  const metaNamespace = kind.namespaced && ns && ns !== 'ALL' ? `\n  namespace: ${ns}` : ''
  return `apiVersion: ${kind.apiVersion}\nkind: ${kind.kind}\nmetadata:\n  name: my-${kind.singular}${metaNamespace}\nspec: {}\n`
}

function groupKinds(kinds: CustomResourceKind[]): { group: string; items: CustomResourceKind[] }[] {
  const map = new Map<string, CustomResourceKind[]>()
  for (const kind of kinds) {
    const group = kind.group || 'core'
    const list = map.get(group)
    if (list) list.push(kind)
    else map.set(group, [kind])
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.kind.localeCompare(b.kind))
    }))
}

export function CustomResourceBrowserPage({
  clusterId,
  namespace,
  initialMode = 'all',
  initialFocus,
  onFocusConsumed
}: CustomResourceBrowserPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CrdTab>(initialMode)
  const [search, setSearch] = useState('')
  const [selectedKind, setSelectedKind] = useState<CustomResourceKind | null>(null)
  const { openYamlEditor } = useBottomPanel()
  const setSelectedNamespace = useClusterStore((s) => s.setSelectedNamespace)
  const queryClient = useQueryClient()
  const [selectedInstanceKeys, setSelectedInstanceKeys] = useState<string[]>([])
  const { setPagination: setInstancePagination, paginationProps: instancePaginationProps } = useTablePagination([
    clusterId,
    namespace,
    selectedKind?.crdName ?? null
  ])

  const allQuery = useCustomResourceKinds(clusterId, false, tab === 'all')
  const installedQuery = useCustomResourceKinds(clusterId, true, tab === 'installed')
  const kindsQuery = tab === 'installed' ? installedQuery : allQuery
  const kinds = kindsQuery.data && 'kinds' in kindsQuery.data ? kindsQuery.data.kinds : []
  const kindsError = kindsQuery.data && 'error' in kindsQuery.data ? kindsQuery.data.error : null

  const filteredKinds = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return kinds
    return kinds.filter(
      (kind) =>
        kind.kind.toLowerCase().includes(q) ||
        kind.group.toLowerCase().includes(q) ||
        kind.crdName.toLowerCase().includes(q) ||
        kind.shortNames.some((name) => name.toLowerCase().includes(q))
    )
  }, [kinds, search])

  const groups = useMemo(() => groupKinds(filteredKinds), [filteredKinds])

  useEffect(() => {
    setTab(initialMode)
  }, [initialMode])

  useEffect(() => {
    setSelectedInstanceKeys([])
  }, [selectedKind?.crdName, namespace])

  useEffect(() => {
    if (!initialFocus) return
    setTab('all')
  }, [initialFocus])

  useEffect(() => {
    if (!initialFocus || kinds.length === 0) return
    const kind = kinds.find((item) => item.kind === initialFocus.kind && item.apiVersion === initialFocus.apiVersion)
    if (kind) setSelectedKind(kind)
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
    if (selectedKind && !kinds.some((kind) => kind.crdName === selectedKind.crdName)) {
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
      if (result.failed.length === 0) setSelectedInstanceKeys([])
      return result
    })
  }

  const instanceColumns: ColumnsType<DynamicResourceItem> = useMemo(
    () => [
      { title: t('crdBrowser.colName'), dataIndex: 'name', key: 'name', ellipsis: true },
      {
        title: t('crdBrowser.colNamespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        width: 140,
        ellipsis: true,
        render: (value: string | null) => value || '—'
      },
      {
        title: t('crdBrowser.colAge'),
        dataIndex: 'ageTimestamp',
        key: 'age',
        width: 100,
        sorter: (a, b) => compareAgeTimestamps(a.ageTimestamp, b.ageTimestamp),
        render: (value: string | null) => <AgeCell timestamp={value} />
      },
      {
        title: t('crdBrowser.colLabels'),
        dataIndex: 'labelKeys',
        key: 'labelKeys',
        ellipsis: true,
        render: (keys: string[]) =>
          keys.length === 0 ? (
            <span className="ml-crd-muted">—</span>
          ) : (
            <span className="ml-crd-label-tags">
              {keys.slice(0, 4).map((key) => (
                <Tag key={key}>{key}</Tag>
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
    [clusterId, selectedKind, listQueryKey, t]
  )

  return (
    <div className="ml-crd-browser">
      <header className="ml-crd-browser__header">
        <div className="ml-crd-browser__brand">
          <Icon icon={Boxes} variant="toolbar" />
          <span>
            {t('crdBrowser.brand')} <span>/</span> {t('crdBrowser.browser')}
          </span>
        </div>
        <div className="ml-crd-browser__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={tab === 'all' ? 'is-active' : undefined}
            onClick={() => setTab('all')}
          >
            {t('crdBrowser.tabAll')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'installed'}
            className={tab === 'installed' ? 'is-active' : undefined}
            onClick={() => setTab('installed')}
          >
            {t('crdBrowser.tabInstalled')}
          </button>
        </div>
        <span className="ml-crd-browser__header-count">
          {t('crdBrowser.kindCount', { count: filteredKinds.length })}
        </span>
      </header>

      {kindsError ? (
        <div className="ml-crd-browser__empty">
          <Empty description={kindsError} />
        </div>
      ) : (
        <Splitter className="ml-crd-browser__splitter">
          <Splitter.Panel defaultSize="32%" min="22%" max="46%">
            <aside className="ml-crd-browser__kinds">
              <div className="ml-crd-browser__search">
                <Input
                  allowClear
                  prefix={<Icon icon={Search} variant="micro" />}
                  placeholder={t('crdBrowser.searchKinds')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="ml-crd-browser__kind-scroll">
                {kindsQuery.isLoading ? (
                  <p className="ml-crd-browser__status">{t('common.loading')}</p>
                ) : kinds.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      tab === 'installed' ? t('crdBrowser.emptyInstalled') : t('crdBrowser.emptyKinds')
                    }
                  />
                ) : filteredKinds.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('crdBrowser.emptyFilter')} />
                ) : (
                  groups.map((group) => (
                    <section key={group.group} className="ml-crd-group">
                      <h2>{group.group}</h2>
                      {group.items.map((kind) => (
                        <button
                          key={kind.crdName}
                          type="button"
                          className={`ml-crd-kind${selectedKind?.crdName === kind.crdName ? ' is-selected' : ''}`}
                          onClick={() => setSelectedKind(kind)}
                        >
                          <span className="ml-crd-kind__name">{kind.kind}</span>
                          <span className="ml-crd-kind__meta">
                            {kind.version}
                            <i className={kind.namespaced ? 'is-ns' : 'is-cluster'}>
                              {kind.namespaced ? t('crdBrowser.namespaced') : t('crdBrowser.cluster')}
                            </i>
                            {kind.instanceCount != null ? <b>{kind.instanceCount}</b> : null}
                          </span>
                        </button>
                      ))}
                    </section>
                  ))
                )}
              </div>
            </aside>
          </Splitter.Panel>
          <Splitter.Panel>
            <section className="ml-crd-browser__instances">
              {!selectedKind ? (
                <div className="ml-crd-browser__empty">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('crdBrowser.pickKind')} />
                </div>
              ) : (
                <>
                  <div className="ml-crd-browser__instance-bar">
                    <div className="ml-crd-browser__instance-title">
                      <strong>{selectedKind.kind}</strong>
                      <span>{selectedKind.apiVersion}</span>
                      {selectedKind.shortNames.map((name) => (
                        <Tag key={name}>{name}</Tag>
                      ))}
                    </div>
                    <div className="ml-crd-browser__instance-actions">
                      <WatchStatusBadge isError={false} watchStatus={watchStatus} />
                      <NamespaceSelector
                        clusterId={clusterId}
                        value={namespace}
                        onChange={(ns) => setSelectedNamespace(clusterId, ns)}
                      />
                      {selectedInstanceKeys.length > 0 ? (
                        <button type="button" className="ml-btn ml-btn--ghost ml-btn--danger" onClick={handleBatchDelete}>
                          <Icon icon={Trash2} variant="detail" />
                          <span>{t('crdBrowser.deleteCount', { count: selectedInstanceKeys.length })}</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ml-btn ml-btn--ghost"
                        onClick={() =>
                          openYamlEditor({
                            title: t('crdBrowser.newKind', { kind: selectedKind.kind }),
                            clusterId,
                            mode: 'create',
                            namespace,
                            initialYaml: buildDynamicCreateTemplate(selectedKind, namespace),
                            listQueryKey
                          })
                        }
                      >
                        <Icon icon={Plus} variant="detail" />
                        <span>{t('crdBrowser.create')}</span>
                      </button>
                    </div>
                  </div>
                  {instancesError ? (
                    <div className="ml-crd-browser__empty">
                      <Empty description={String(instancesError)} />
                    </div>
                  ) : (
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
                        locale={{ emptyText: t('crdBrowser.emptyInstances') }}
                        rowSelection={{
                          selectedRowKeys: selectedInstanceKeys,
                          onChange: (keys) => setSelectedInstanceKeys(keys as string[])
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </Splitter.Panel>
        </Splitter>
      )}
    </div>
  )
}
