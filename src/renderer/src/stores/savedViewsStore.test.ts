import { describe, expect, it } from 'vitest'
import { viewsMatchCurrent, type SavedResourceView } from './savedViewsStore'

const view: SavedResourceView = {
  id: 'v1',
  name: 'pods shop',
  kind: 'Pods',
  namespace: 'shop',
  search: 'store',
  sort: { columnKey: 'name', order: 'ascend' },
  createdAt: '2026-01-01',
  lastUsedAt: '2026-01-01'
}

describe('viewsMatchCurrent', () => {
  it('matches kind, namespace, search, and sort', () => {
    expect(
      viewsMatchCurrent(view, 'Pods', 'shop', 'store', { columnKey: 'name', order: 'ascend' })
    ).toBe(true)
    expect(
      viewsMatchCurrent(view, 'Deployments', 'shop', 'store', { columnKey: 'name', order: 'ascend' })
    ).toBe(false)
  })
})
