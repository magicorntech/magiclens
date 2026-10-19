import { describe, expect, it } from 'vitest'
import { parseCpuQuantity, parseMemoryQuantity, usagePercent } from './quantity'

describe('parseCpuQuantity', () => {
  it('parses millicores and cores', () => {
    expect(parseCpuQuantity('250m')).toBeCloseTo(0.25)
    expect(parseCpuQuantity('2')).toBe(2)
    expect(parseCpuQuantity(undefined)).toBe(0)
  })
})

describe('parseMemoryQuantity', () => {
  it('parses binary and decimal units', () => {
    expect(parseMemoryQuantity('128Mi')).toBe(128 * 1024 * 1024)
    expect(parseMemoryQuantity('1Gi')).toBe(1024 ** 3)
    expect(parseMemoryQuantity('1000M')).toBe(1e9)
    expect(parseMemoryQuantity(undefined)).toBe(0)
  })
})

describe('usagePercent', () => {
  it('returns null without a request', () => {
    expect(usagePercent(1, 0)).toBeNull()
  })

  it('rounds to one decimal', () => {
    expect(usagePercent(1, 2)).toBe(50)
    expect(usagePercent(3, 2)).toBe(150)
  })
})
