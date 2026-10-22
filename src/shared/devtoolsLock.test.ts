import { describe, expect, it } from 'vitest'
import { isDevToolsShortcut } from './devtoolsLock'

describe('devtools lock', () => {
  it('blocks the shortcuts that open DevTools', () => {
    expect(isDevToolsShortcut({ key: 'F12' })).toBe(true)
    expect(isDevToolsShortcut({ key: 'i', meta: true, alt: true })).toBe(true)
    expect(isDevToolsShortcut({ key: 'j', control: true, shift: true })).toBe(true)
    expect(isDevToolsShortcut({ key: 'c', meta: true, alt: true })).toBe(true)
    expect(isDevToolsShortcut({ key: 'r', meta: true })).toBe(false)
    expect(isDevToolsShortcut({ key: 'i', meta: true })).toBe(false)
  })
})
