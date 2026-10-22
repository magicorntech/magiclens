import { describe, expect, it } from 'vitest'
import { compareUsageRatio } from './tableSort'

describe('compareUsageRatio', () => {
  it('orders by usage divided by the request, not by raw usage', () => {
    // 0.2 / 0.2 = 100% should rank above 0.5 / 2 = 25% when ascending
    const highPercent = compareUsageRatio(0.2, 0.2, 0.5, 2, 'ascend')
    expect(highPercent).toBeGreaterThan(0)
    const lowPercent = compareUsageRatio(0.5, 2, 0.2, 0.2, 'ascend')
    expect(lowPercent).toBeLessThan(0)
  })

  it('breaks equal percents by absolute usage', () => {
    // both 50%: 1/2 then 0.1/0.2
    expect(compareUsageRatio(1, 2, 0.1, 0.2, 'ascend')).toBeGreaterThan(0)
  })

  it('keeps rows without usage at the bottom when descending', () => {
    // antd negates the result on descend, so a negative result here means
    // the missing row is treated as larger and lands last after that flip
    expect(compareUsageRatio(undefined, 1, 0.4, 1, 'descend')).toBeLessThan(0)
    expect(compareUsageRatio(0.4, 1, undefined, 1, 'descend')).toBeGreaterThan(0)
  })
})
