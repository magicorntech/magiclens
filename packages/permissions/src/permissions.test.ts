import { describe, expect, it } from 'vitest'
import { evaluatePermission, canAssignRole, canPromoteToAdmin } from './index'

describe('evaluatePermission', () => {
  it('denies disabled users', () => {
    const result = evaluatePermission({
      userStatus: 'DISABLED',
      orgRole: 'MEMBER',
      clusterAssigned: true,
      action: 'list',
      policies: []
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('USER_DISABLED')
  })

  it('enforces read-only on write actions', () => {
    const result = evaluatePermission({
      userStatus: 'ACTIVE',
      orgRole: 'READ_ONLY',
      clusterAssigned: true,
      action: 'delete',
      resourceKind: 'Deployments',
      policies: []
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('MAGICLENS_POLICY_DENIED')
  })

  it('allows owners by default', () => {
    const result = evaluatePermission({
      userStatus: 'ACTIVE',
      orgRole: 'OWNER',
      clusterAssigned: true,
      action: 'delete',
      policies: []
    })
    expect(result.allowed).toBe(true)
  })

  it('applies deny policies first by priority', () => {
    const result = evaluatePermission({
      userStatus: 'ACTIVE',
      orgRole: 'MEMBER',
      clusterAssigned: true,
      action: 'delete',
      resourceKind: 'Deployments',
      policies: [
        { effect: 'DENY', actions: ['delete'], resourceKind: 'Deployments', priority: 1 },
        { effect: 'ALLOW', actions: ['*'], priority: 100 }
      ]
    })
    expect(result.allowed).toBe(false)
  })
})

describe('role assignment', () => {
  it('prevents admin from assigning owner', () => {
    expect(canAssignRole('ADMIN', 'OWNER')).toBe(false)
    expect(canPromoteToAdmin('OWNER')).toBe(true)
  })
})
