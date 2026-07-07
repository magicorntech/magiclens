import { useQueryClient } from '@tanstack/react-query'
import { Button, Dropdown, Modal, message } from 'antd'
import type { MenuProps } from 'antd'
import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useBottomPanel } from '../Layout/BottomPanelContext'
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

  async function openEditor(): Promise<void> {
    const hideLoading = message.loading(`Loading ${name}...`, 0)
    try {
      const res = await window.api.resource.getManifest({ clusterId, namespace, name, target })
      if ('error' in res) {
        message.error(`Failed to load manifest: ${res.error}`)
        return
      }
      openYamlEditor({
        title: `Edit: ${name}`,
        clusterId,
        mode: 'edit',
        target,
        namespace,
        name,
        initialYaml: res.yaml,
        listQueryKey
      })
    } finally {
      hideLoading()
    }
  }

  async function handleDelete(): Promise<void> {
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

  const menuItems: MenuProps['items'] = [
    { key: 'edit', label: 'Edit YAML', icon: <EditOutlined />, onClick: () => openEditor() },
    { type: 'divider' },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: confirmDelete }
  ]

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </div>
  )
}
