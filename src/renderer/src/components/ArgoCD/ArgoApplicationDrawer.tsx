import { Button, Drawer, Empty, Modal, Spin, Tooltip, message } from 'antd'
import { Pencil, RefreshCw, RotateCw, Trash2, X } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import type { ArgoHistoryEntry, ArgoManagedResource } from '@shared/types/argocd'
import { useArgoApplicationDetail, useArgoRefresh, useArgoSync } from '../../queries/useArgoCd'
import { ResizableTable } from '../../utils/ResizableTable'
import { AgeCell } from '../ResourceTable/AgeCell'
import { DetailChips, DetailFactGrid, DetailSection } from '../Detail/detailPrimitives'
import { Icon } from '../ui/Icon'
import { ArgoHealthTag, ArgoSyncTag } from './argoStatus'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { ARGO_API_VERSION } from '@shared/types/argocd'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'

/**
 * Applications are a CRD, so edit/delete go through the generic `dynamic` mutation path the
 * custom-resource browser already uses — no Argo-specific write code needed.
 */
const ARGO_APP_TARGET: ResourceMutationTarget = {
  type: 'dynamic',
  apiVersion: ARGO_API_VERSION,
  kind: 'Application',
  plural: 'applications',
  namespaced: true
}

export interface ArgoApplicationTarget {
  namespace: string
  name: string
}

interface ArgoApplicationDrawerProps {
  clusterId: string
  target: ArgoApplicationTarget | null
  onClose: () => void
}

/** Absolute timestamp plus a relative age, the way the resource drawers elsewhere read. */
function When({ iso }: { iso: string | null }): React.JSX.Element {
  if (!iso) return <span>—</span>
  return (
    <span>
      <AgeCell timestamp={iso} /> <span className="ml-argo-muted">({new Date(iso).toLocaleString()})</span>
    </span>
  )
}

function List({ values }: { values: string[] }): React.JSX.Element {
  if (values.length === 0) return <span>—</span>
  return (
    <span className="ml-argo-list">
      {values.map((v) => (
        <span key={v}>{v}</span>
      ))}
    </span>
  )
}

export function ArgoApplicationDrawer({
  clusterId,
  target,
  onClose
}: ArgoApplicationDrawerProps): React.JSX.Element {
  const { data, isLoading } = useArgoApplicationDetail(clusterId, target)
  const sync = useArgoSync(clusterId)
  const refresh = useArgoRefresh(clusterId)
  const { openYamlEditor } = useBottomPanel()
  const detail = data?.detail

  /** Loads the live manifest into the shared YAML editor, same as any other resource. */
  const handleEdit = async (): Promise<void> => {
    if (!target) return
    const res = await window.api.resource.getManifest({
      clusterId,
      namespace: target.namespace,
      name: target.name,
      target: ARGO_APP_TARGET
    })
    if ('error' in res) {
      void message.error(res.error)
      return
    }
    openYamlEditor({
      title: `Application: ${target.name}`,
      clusterId,
      mode: 'edit',
      target: ARGO_APP_TARGET,
      namespace: target.namespace,
      name: target.name,
      initialYaml: res.yaml,
      listQueryKey: ['argocd-applications', clusterId]
    })
    onClose()
  }

  /**
   * Deleting an Application deletes everything it manages — Argo's resources-finalizer tears
   * the workloads down too — so this asks first and says so plainly.
   */
  const handleDelete = (): void => {
    if (!target) return
    Modal.confirm({
      title: `Delete application ${target.name}?`,
      content:
        'Argo CD will also remove every Kubernetes resource this application manages. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await window.api.resource.delete({
          clusterId,
          namespace: target.namespace,
          name: target.name,
          target: ARGO_APP_TARGET
        })
        if ('error' in res) {
          void message.error(res.error)
          return
        }
        void message.success(`Deleted ${target.name}.`)
        onClose()
      }
    })
  }

  const run = (label: string, mutation: typeof sync): void => {
    if (!target) return
    mutation.mutate(target, {
      onSuccess: (res) => {
        if (res.error) void message.error(res.error)
        else void message.success(`${label} requested for ${target.name}.`)
      },
      onError: (err) => void message.error(err instanceof Error ? err.message : String(err))
    })
  }

  const resourceColumns: ColumnsType<ArgoManagedResource> = [
    { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 150, ellipsis: true },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', width: 170, ellipsis: true },
    {
      title: 'Sync',
      key: 'sync',
      width: 110,
      render: (_v, r) => r.syncStatus || '—'
    },
    {
      // Resources with no health concept (ConfigMap, Service) report nothing here.
      title: 'Health',
      key: 'health',
      width: 110,
      render: (_v, r) => r.healthStatus || '—'
    }
  ]

  const historyColumns: ColumnsType<ArgoHistoryEntry> = [
    { title: 'Revision', dataIndex: 'revision', key: 'revision', width: 120 },
    { title: 'Source', dataIndex: 'source', key: 'source', ellipsis: true },
    {
      title: 'Deployed',
      key: 'deployedAt',
      width: 120,
      render: (_v, r) => <AgeCell timestamp={r.deployedAt} />
    }
  ]

  return (
    <Drawer
      open={!!target}
      onClose={onClose}
      width={720}
      closable={false}
      destroyOnHidden
      title={
        <div className="ml-argo-drawer__head">
          <span className="ml-argo-drawer__title">Application: {target?.name}</span>
          <span className="ml-argo-drawer__actions">
            <Tooltip title="Sync">
              <Button
                type="text"
                icon={<Icon icon={RotateCw} variant="detail" />}
                loading={sync.isPending}
                onClick={() => run('Sync', sync)}
              />
            </Tooltip>
            <Tooltip title="Refresh">
              <Button
                type="text"
                icon={<Icon icon={RefreshCw} variant="detail" />}
                loading={refresh.isPending}
                onClick={() => run('Refresh', refresh)}
              />
            </Tooltip>
            <Tooltip title="Edit YAML">
              <Button
                type="text"
                icon={<Icon icon={Pencil} variant="detail" />}
                onClick={() => void handleEdit()}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<Icon icon={Trash2} variant="detail" />}
                onClick={handleDelete}
              />
            </Tooltip>
            <Tooltip title="Close">
              <Button type="text" icon={<Icon icon={X} variant="detail" />} onClick={onClose} />
            </Tooltip>
          </span>
        </div>
      }
    >
      {data?.error ? (
        <Empty description={data.error} />
      ) : isLoading || !detail ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <Spin />
        </div>
      ) : (
        <div className="ml-argo-drawer__body">
          <DetailSection title="Properties">
            <DetailFactGrid
              facts={[
                { label: 'Created', value: <When iso={detail.ageTimestamp} /> },
                { label: 'Name', value: detail.name },
                { label: 'Namespace', value: detail.namespace },
                { label: 'Labels', value: <DetailChips data={detail.labels} /> },
                {
                  label: 'Annotations',
                  value: `${Object.keys(detail.annotations).length} annotations`
                },
                { label: 'Finalizers', value: <List values={detail.finalizers} /> },
                {
                  label: 'Controlled by',
                  value: detail.controlledByName
                    ? `${detail.controlledByKind} ${detail.controlledByName}`
                    : '—'
                }
              ]}
            />
          </DetailSection>

          <DetailSection title="Summary">
            <DetailFactGrid
              facts={[
                { label: 'Sync status', value: <ArgoSyncTag status={detail.syncStatus} /> },
                { label: 'Health status', value: <ArgoHealthTag status={detail.healthStatus} /> },
                { label: 'Project', value: detail.project },
                { label: 'Revision', value: detail.revision || '—' },
                { label: 'Images', value: <List values={detail.images} /> },
                { label: 'External URLs', value: <List values={detail.externalUrls} /> },
                { label: 'Reconciled', value: <When iso={detail.reconciledAt} /> }
              ]}
            />
          </DetailSection>

          <DetailSection title="Source">
            {/* Multi-source apps list every repo, numbered, rather than only the first. */}
            <DetailFactGrid
              facts={detail.sources.flatMap((src, i) => {
                const n = detail.sources.length > 1 ? ` (${i + 1})` : ''
                return [
                  { label: `Repository${n}`, value: src.repoUrl || '—' },
                  ...(src.path || src.chart
                    ? [{ label: `Path${n}`, value: src.path || src.chart }]
                    : []),
                  { label: `Target revision${n}`, value: src.targetRevision || '—' }
                ]
              })}
            />
          </DetailSection>

          <DetailSection title="Destination">
            <DetailFactGrid
              facts={[
                { label: 'Cluster', value: detail.destServer || '—' },
                { label: 'Namespace', value: detail.destNamespace || '—' }
              ]}
            />
          </DetailSection>

          <DetailSection title="Sync policy">
            <DetailFactGrid
              facts={[
                { label: 'Sync', value: detail.syncPolicy },
                { label: 'Sync options', value: <List values={detail.syncOptions} /> }
              ]}
            />
          </DetailSection>

          <DetailSection title={`Managed resources (${detail.managedResources.length})`}>
            {detail.managedResources.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No managed resources" />
            ) : (
              <ResizableTable
                tableKey="argo-managed-resources"
                rowKey="id"
                columns={resourceColumns}
                dataSource={detail.managedResources}
                pagination={false}
                size="small"
                scroll={{ y: 260 }}
              />
            )}
          </DetailSection>

          <DetailSection title="Last operation">
            <DetailFactGrid
              facts={[
                { label: 'Phase', value: detail.lastOperationPhase || '—' },
                { label: 'Message', value: detail.lastOperationMessage || '—' },
                { label: 'Initiated by', value: detail.operationInitiatedBy || '—' },
                { label: 'Started', value: <When iso={detail.operationStartedAt} /> },
                { label: 'Finished', value: <When iso={detail.lastSyncedAt} /> }
              ]}
            />
          </DetailSection>

          <DetailSection title="History">
            {detail.history.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No deployment history" />
            ) : (
              <ResizableTable
                tableKey="argo-history"
                rowKey="id"
                columns={historyColumns}
                dataSource={detail.history}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
              />
            )}
          </DetailSection>

          <DetailSection title={`Events (${detail.events.length})`}>
            {detail.events.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events found" />
            ) : (
              <ul className="ml-argo-events">
                {detail.events.map((e) => (
                  <li key={e.id}>
                    <strong>{e.type}</strong> <AgeCell timestamp={e.timestamp} />
                    <div className="ml-argo-muted">{e.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>
      )}
    </Drawer>
  )
}
