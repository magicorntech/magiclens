import { describe, expect, it } from 'vitest'
import { normalizeEmail, hashToken, safeEqual, generateSecureToken } from './index'

describe('normalizeEmail', () => {
  it('trims, lowercases, and applies Unicode NFC', () => {
    expect(normalizeEmail('  Foo.Bar@Example.COM ')).toBe('foo.bar@example.com')
    const decomposed = 'caf\u0065\u0301@example.com'
    expect(normalizeEmail(decomposed)).toBe('café@example.com'.normalize('NFC'))
  })

  it('makes duplicate detection case-insensitive', () => {
    expect(normalizeEmail('User@Org.com')).toBe(normalizeEmail('user@org.com'))
  })
})

describe('tokens', () => {
  it('hashes tokens deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).not.toBe(hashToken('abd'))
  })

  it('generates unique secure tokens', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken())
  })

  it('safeEqual compares hashes', () => {
    const a = hashToken('x')
    expect(safeEqual(a, hashToken('x'))).toBe(true)
    expect(safeEqual(a, hashToken('y'))).toBe(false)
  })
})
