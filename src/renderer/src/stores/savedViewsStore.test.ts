import { describe, expect, it } from 'vitest'
import {
  migrateSavedViews,
  savedViewAppliesOnCluster,
  savedViewsForCluster,
  useSavedViewsStore,
  viewsMatchCurrent,
  type SavedResourceView
} from './savedViewsStore'

const view: SavedResourceView = {
  id: 'v1',
  name: 'pods shop',
  kind: 'Pods',
  namespace: 'shop',
  search: 'store',
  sort: { columnKey: 'name', order: 'ascend' },
  clusterId: 'cluster-a',
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

describe('migrateSavedViews', () => {
  it('keeps the persist key and fills a missing clusterId', () => {
    const options = useSavedViewsStore.persist.getOptions()
    expect(options.name).toBe('magiclens-saved-views')
    expect(options.version).toBe(1)
    expect(options.migrate).toBe(migrateSavedViews)

    const withoutCluster: Record<string, unknown> = { ...view }
    delete withoutCluster.clusterId
    const migrated = migrateSavedViews({
      views: [
        withoutCluster,
        { ...view, id: 'v2', clusterId: 'cluster-b' },
        { ...view, id: 'v3', clusterId: 12 as unknown as string }
      ]
    })

    expect(migrated.views).toHaveLength(3)
    expect(migrated.views[0]).toMatchObject({ id: 'v1', name: 'pods shop', kind: 'Pods', clusterId: '' })
    expect(migrated.views[1].clusterId).toBe('cluster-b')
    expect(migrated.views[2].clusterId).toBe('')
  })
})

describe('savedViewsForCluster', () => {
  const views: SavedResourceView[] = [
    { ...view, id: 'a', clusterId: 'cluster-a' },
    { ...view, id: 'b', clusterId: 'cluster-b' },
    { ...view, id: 'legacy', clusterId: '' }
  ]

  it('lists this cluster and keeps cluster-less views in the legacy group', () => {
    expect(savedViewsForCluster(views, 'cluster-a')).toEqual({
      cluster: [views[0]],
      legacy: [views[2]]
    })
    expect(savedViewsForCluster(views, 'cluster-b')).toEqual({
      cluster: [views[1]],
      legacy: [views[2]]
    })
  })
})

describe('savedViewAppliesOnCluster', () => {
  it('refuses a view saved on a different cluster and allows a legacy view', () => {
    expect(savedViewAppliesOnCluster(view, 'cluster-a')).toBe(true)
    expect(savedViewAppliesOnCluster(view, 'cluster-b')).toBe(false)
    expect(savedViewAppliesOnCluster({ clusterId: '' }, 'cluster-b')).toBe(true)
  })
})
