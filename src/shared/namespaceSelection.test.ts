import { describe, expect, it } from 'vitest'
import {
  ALL_NAMESPACES,
  filterItemsByNamespaceSelection,
  isAllNamespaces,
  isNoNamespaceSelection,
  listNamespaceParam,
  parseNamespaceSelection,
  serializeNamespaceSelection
} from './namespaceSelection'

describe('namespaceSelection', () => {
  it('parses ALL, empty, and multi values', () => {
    expect(parseNamespaceSelection(undefined)).toEqual([ALL_NAMESPACES])
    expect(parseNamespaceSelection('')).toEqual([])
    expect(parseNamespaceSelection('shop,payments')).toEqual(['shop', 'payments'])
    expect(serializeNamespaceSelection(['shop', 'shop'])).toBe('shop')
    expect(isAllNamespaces('ALL')).toBe(true)
    expect(isNoNamespaceSelection('')).toBe(true)
    expect(listNamespaceParam('shop,payments')).toBe(ALL_NAMESPACES)
  })

  it('filters items for multi-select', () => {
    const items = [{ namespace: 'shop' }, { namespace: 'data' }]
    expect(filterItemsByNamespaceSelection(items, 'shop,payments')).toEqual([{ namespace: 'shop' }])
    expect(filterItemsByNamespaceSelection(items, ALL_NAMESPACES)).toEqual(items)
  })
})
