import { Button, Dropdown, Modal, Space, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, Pencil, PlayCircle, RefreshCw, Scissors, Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { useQueryClient } from '@tanstack/react-query'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import type { WorkloadKind, WorkloadActionId } from '@shared/types/workload'
import { actionRequiresPermission } from '@shared/workloadActions'
import { useResourcePermissions } from '../../queries/useMetricsRange'
import { useClusterStore } from '../../stores/clusterStore'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { batchDeleteResources, removeItemsById } from './batchDelete'
import { useWorkloadActions } from '../Workload/useWorkloadActions'
import { WorkloadActionModals } from '../Workload/WorkloadActionModals'

interface ListLike {
  items: { id: string }[]
}
type ListResponse = ListLike | { error: string }

function removeById(data: ListResponse | undefined, id: string): ListResponse | undefined {
  return removeItemsById(data, new Set([id]))
}

const QUICK_ACTIONS = new Set(['scale', 'restart'])

const actionIcons: Partial<Record<string, React.ReactNode>> = {
  scale: <Icon icon={Scissors} variant="detail" />,
  restart: <Icon icon={RefreshCw} variant="detail" />,
  resume: <Icon icon={PlayCircle} variant="detail" />,
  resumeRollout: <Icon icon={PlayCircle} variant="detail" />
}

interface WorkloadResourceRowActionsProps {
  clusterId: string
  kind: WorkloadKind
  target: ResourceMutationTarget
  namespace: string
  name: string
  itemId: string
  listQueryKey: unknown[]
  compact?: boolean
}

export function WorkloadResourceRowActions({
  clusterId,
  kind,
  target,
  namespace,
  name,
  itemId,
  listQueryKey,
  compact
}: WorkloadResourceRowActionsProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const { openYamlEditor } = useBottomPanel()
  const clusterStatus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.status)
  const isConnected = clusterStatus === 'connected'
  const { data: permissions } = useResourcePermissions(clusterId, target, namespace, name, isConnected)

  const workload = useWorkloadActions({
    clusterId,
    kind,
    namespace,
    name,
    target,
    listQueryKey,
    enabled: isConnected
  })

  const canEdit =
    (permissions?.canGet ?? true) && ((permissions?.canUpdate ?? true) || (permissions?.canPatch ?? true))
  const canDelete = permissions?.canDelete ?? true

  function openEditor(): void {
    if (!canEdit) return
    openYamlEditor({
      title: `Edit: ${name}`,
      clusterId,
      mode: 'edit',
      target,
      namespace,
      name,
      initialYaml: '',
      listQueryKey
    })
  }

  async function handleDelete(): Promise<void> {
    if (!canDelete) return
    const previous = queryClient.getQueryData<ListResponse>(listQueryKey)
    queryClient.setQueryData<ListResponse | undefined>(listQueryKey, (old) => removeById(old, itemId))
    try {
      const res = await window.api.resource.delete({ clusterId, namespace, name, target })
      if ('error' in res) {
        queryClient.setQueryData(listQueryKey, previous)
        message.error(`Delete failed: ${res.error}`)
        return
      }
      message.success(`Deleted "${name}"`)
      await queryClient.invalidateQueries({ queryKey: listQueryKey })
    } catch (err) {
      queryClient.setQueryData(listQueryKey, previous)
      message.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function confirmDelete(): void {
    Modal.confirm({
      title: `Delete "${name}"?`,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: handleDelete
    })
  }

  const menuItems: MenuProps['items'] = workload.visibleActions.flatMap((def) => {
    const items: MenuProps['items'] = []
    if (def.dividerBefore) items.push({ type: 'divider' })
    if (def.id === 'editYaml') {
      items.push({
        key: 'editYaml',
        label: canEdit ? (
          'Edit YAML'
        ) : (
          <Tooltip title="You don't have permission to update this resource">Edit YAML</Tooltip>
        ),
        icon: <Icon icon={Pencil} variant="detail" />,
        disabled: !canEdit
      })
      return items
    }
    if (def.id === 'delete') {
      items.push({
        key: 'delete',
        label: canDelete ? (
          def.label
        ) : (
          <Tooltip title="You don't have permission to delete this resource">{def.label}</Tooltip>
        ),
        icon: <Icon icon={Trash2} variant="detail" />,
        danger: true,
        disabled: !canDelete
      })
      return items
    }
    const permKey = actionRequiresPermission(def.id)
    const allowed = permKey ? workload.isActionAllowed(def.id) : true
    items.push({
      key: def.id,
      label: allowed ? (
        def.label
      ) : (
        <Tooltip title={workload.actionDeniedReason(def.id)}>{def.label}</Tooltip>
      ),
      icon: actionIcons[def.id],
      danger: def.danger,
      disabled: !allowed
    })
    return items
  })

  function handleMenuClick({ key }: { key: string }): void {
    if (key === 'editYaml') openEditor()
    else if (key === 'delete') confirmDelete()
    else void workload.handleAction(key as WorkloadActionId)
  }

  const quickActions = workload.visibleActions.filter((a) => QUICK_ACTIONS.has(a.id) && workload.isActionAllowed(a.id))

  const controls = (
    <>
      {!compact && quickActions.length > 0 ? (
        <Space size={4}>
          {quickActions.map((a) => (
            <Tooltip key={a.id} title={a.label}>
              <Button
                size="small"
                icon={actionIcons[a.id]}
                onClick={(e) => {
                  e.stopPropagation()
                  void workload.handleAction(a.id)
                }}
              />
            </Tooltip>
          ))}
        </Space>
      ) : null}
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
        <Button size="small" icon={<Icon icon={MoreHorizontal} variant="detail" />} />
      </Dropdown>
      <WorkloadActionModals clusterId={clusterId} kind={kind} namespace={namespace} name={name} workload={workload} />
    </>
  )

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {controls}
    </div>
  )
}
