import { describe, expect, it } from 'vitest'
import { TLS_CERT_WARN_DAYS, tlsCertStatus } from './tlsCerts'

describe('tlsCertStatus', () => {
  it('classifies remaining days', () => {
    expect(tlsCertStatus(null)).toBe('invalid')
    expect(tlsCertStatus(-1)).toBe('expired')
    expect(tlsCertStatus(0)).toBe('expiring')
    expect(tlsCertStatus(TLS_CERT_WARN_DAYS)).toBe('expiring')
    expect(tlsCertStatus(TLS_CERT_WARN_DAYS + 1)).toBe('ok')
  })
})
