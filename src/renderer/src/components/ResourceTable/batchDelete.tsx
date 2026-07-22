import type { QueryClient } from '@tanstack/react-query'
import { Modal, message } from 'antd'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { refreshNamespaces } from '../../queries/useNamespaces'

interface ListLike {
  items: { id: string }[]
}
type ListResponse = ListLike | { error: string }

export interface BatchDeleteItem {
  id: string
  namespace: string
  name: string
}

export function removeItemsById(data: ListResponse | undefined, ids: Set<string>): ListResponse | undefined {
  if (!data || 'error' in data) return data
  return { items: data.items.filter((it) => !ids.has(it.id)) }
}

export async function batchDeleteResources(
  queryClient: QueryClient,
  listQueryKey: unknown[],
  clusterId: string,
  target: ResourceMutationTarget,
  items: BatchDeleteItem[]
): Promise<{ deleted: number; failed: string[] }> {
  const previous = queryClient.getQueryData<ListResponse>(listQueryKey)
  const ids = new Set(items.map((i) => i.id))
  queryClient.setQueryData<ListResponse | undefined>(listQueryKey, (old) => removeItemsById(old, ids))

  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const res = await window.api.resource.delete({
          clusterId,
          namespace: item.namespace,
          name: item.name,
          target
        })
        if ('error' in res) return { ok: false as const, name: item.name, error: res.error }
        return { ok: true as const, name: item.name }
      } catch (err) {
        return {
          ok: false as const,
          name: item.name,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    })
  )

  const failed = results.filter((r): r is { ok: false; name: string; error: string } => !r.ok)
  const deleted = results.filter((r) => r.ok).length

  if (failed.length > 0) {
    queryClient.setQueryData(listQueryKey, previous)
  }
  await queryClient.invalidateQueries({ queryKey: listQueryKey })
  if (deleted > 0 && target.type === 'builtin' && target.kind === 'Namespaces') {
    await refreshNamespaces(queryClient, clusterId)
  }

  return { deleted, failed: failed.map((f) => `${f.name}: ${f.error}`) }
}

export function confirmBatchDelete(
  kindLabel: string,
  items: BatchDeleteItem[],
  onConfirm: () => Promise<{ deleted: number; failed: string[] }>
): void {
  const preview = items
    .slice(0, 8)
    .map((i) => (i.namespace ? `${i.namespace}/${i.name}` : i.name))
    .join('\n')
  const more = items.length > 8 ? `\n…and ${items.length - 8} more` : ''

  Modal.confirm({
    title: `Delete ${items.length} ${kindLabel}?`,
    content: (
      <div>
        <pre style={{ margin: '8px 0 0', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {preview}
          {more}
        </pre>
      </div>
    ),
    okText: `Delete ${items.length}`,
    okButtonProps: { danger: true },
    onOk: async () => {
      const { deleted, failed } = await onConfirm()
      if (failed.length > 0) {
        message.error(`Deleted ${deleted}, failed ${failed.length}: ${failed.slice(0, 2).join('; ')}`)
        throw new Error('partial batch delete')
      }
      message.success(`Deleted ${deleted} resource(s)`)
    }
  })
}
