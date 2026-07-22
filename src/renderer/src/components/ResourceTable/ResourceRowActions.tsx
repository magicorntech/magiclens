import { useQueryClient } from '@tanstack/react-query'
import { Button, Dropdown, Modal, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useResourcePermissions } from '../../queries/useMetricsRange'
import { useBottomPanel } from '../Layout/BottomPanelContext'
import { refreshNamespaces } from '../../queries/useNamespaces'
import { batchDeleteResources, removeItemsById } from './batchDelete'

interface ListLike {
  items: { id: string }[]
}
type ListResponse = ListLike | { error: string }

function removeById(data: ListResponse | undefined, id: string): ListResponse | undefined {
  return removeItemsById(data, new Set([id]))
}

interface ResourceRowActionsProps {
  clusterId: string
  target: ResourceMutationTarget
  namespace: string
  name: string
  itemId: string
  /** React Query key of the list this row belongs to — used for optimistic delete + targeted
   * invalidation after edit, without touching any other resource kind's cache. */
  listQueryKey: unknown[]
}

export function ResourceRowActions({
  clusterId,
  target,
  namespace,
  name,
  itemId,
  listQueryKey
}: ResourceRowActionsProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const { openYamlEditor } = useBottomPanel()
  const { data: permissions } = useResourcePermissions(clusterId, target, namespace, name, true)

  const canEdit = (permissions?.canGet ?? true) && ((permissions?.canUpdate ?? true) || (permissions?.canPatch ?? true))
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
      if (target.type === 'builtin' && target.kind === 'Namespaces') {
        await refreshNamespaces(queryClient, clusterId)
      }
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

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: canEdit ? (
        'Edit YAML'
      ) : (
        <Tooltip title="You don't have permission to update this resource">Edit YAML</Tooltip>
      ),
      icon: <Icon icon={Pencil} variant="detail" />,
      disabled: !canEdit
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: canDelete ? (
        'Delete'
      ) : (
        <Tooltip title="You don't have permission to delete this resource">Delete</Tooltip>
      ),
      icon: <Icon icon={Trash2} variant="detail" />,
      danger: true,
      disabled: !canDelete
    }
  ]

  function handleMenuClick({ key }: { key: string }): void {
    if (key === 'edit') openEditor()
    if (key === 'delete') confirmDelete()
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
        <Button size="small" icon={<Icon icon={MoreHorizontal} variant="detail" />} />
      </Dropdown>
    </div>
  )
}
