import { describe, expect, it } from 'vitest'
import { normalizeEmail } from '@magiclens/auth'

describe('unique email registration contract', () => {
  it('collapses case and whitespace to one identity', () => {
    const a = normalizeEmail('  Admin@MagicLens.Local ')
    const b = normalizeEmail('admin@magiclens.local')
    expect(a).toBe(b)
  })
})
