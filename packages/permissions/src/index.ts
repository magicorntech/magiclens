import type { OrganizationRole, PermissionCheckResult, PermissionDenialReason } from '@magiclens/shared-types'

export interface PolicyInput {
  effect: 'ALLOW' | 'DENY'
  actions: string[]
  resourceKind?: string | null
  namespacePattern?: string | null
  clusterId?: string | null
  priority: number
}

export interface EvaluateInput {
  userStatus: string
  orgRole: OrganizationRole | null
  clusterAssigned: boolean
  action: string
  resourceKind?: string
  namespace?: string
  clusterId?: string
  policies: PolicyInput[]
  kubernetesRbacAllowed?: boolean
}

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'patch',
  'delete',
  'scale',
  'restart',
  'exec',
  'port-forward'
])

function deny(reason: PermissionDenialReason, message: string): PermissionCheckResult {
  return { allowed: false, reason, message }
}

function actionMatches(policyActions: string[], action: string): boolean {
  return policyActions.includes('*') || policyActions.includes(action)
}

function namespaceMatches(pattern: string | null | undefined, namespace?: string): boolean {
  if (!pattern || pattern === '*') return true
  if (!namespace) return false
  if (pattern.endsWith('*')) return namespace.startsWith(pattern.slice(0, -1))
  return pattern === namespace
}

export function evaluatePermission(input: EvaluateInput): PermissionCheckResult {
  if (input.userStatus === 'DISABLED' || input.userStatus === 'SUSPENDED' || input.userStatus === 'REMOVED') {
    return deny('USER_DISABLED', 'Your account is disabled.')
  }

  if (!input.orgRole) {
    return deny('ORGANIZATION_MEMBERSHIP_REQUIRED', 'You are not a member of this organization.')
  }

  if (!input.clusterAssigned) {
    return deny('CLUSTER_NOT_ASSIGNED', 'This cluster is not assigned to you.')
  }

  if (input.orgRole === 'READ_ONLY' && WRITE_ACTIONS.has(input.action)) {
    const override = input.policies.some(
      (p) =>
        p.effect === 'ALLOW' &&
        actionMatches(p.actions, input.action) &&
        (!p.resourceKind || p.resourceKind === input.resourceKind) &&
        namespaceMatches(p.namespacePattern, input.namespace)
    )
    if (!override) {
      return deny(
        'MAGICLENS_POLICY_DENIED',
        `Read-only users cannot perform "${input.action}" unless explicitly allowed.`
      )
    }
  }

  const sorted = [...input.policies].sort((a, b) => a.priority - b.priority)
  let decision: PermissionCheckResult | null = null

  for (const policy of sorted) {
    if (policy.clusterId && input.clusterId && policy.clusterId !== input.clusterId) continue
    if (policy.resourceKind && input.resourceKind && policy.resourceKind !== input.resourceKind) continue
    if (!namespaceMatches(policy.namespacePattern, input.namespace)) continue
    if (!actionMatches(policy.actions, input.action)) continue

    if (policy.effect === 'DENY') {
      return deny(
        'MAGICLENS_POLICY_DENIED',
        `You do not have permission to ${input.action} ${input.resourceKind ?? 'resources'} in this namespace.`
      )
    }
    decision = { allowed: true }
  }

  if (!decision) {
    if (input.orgRole === 'OWNER' || input.orgRole === 'ADMIN') {
      decision = { allowed: true }
    } else if (input.orgRole === 'MEMBER' || input.orgRole === 'TEAM_ADMIN') {
      decision = { allowed: true }
    } else {
      return deny(
        'MAGICLENS_POLICY_DENIED',
        `You do not have permission to ${input.action} ${input.resourceKind ?? 'resources'} in this namespace.`
      )
    }
  }

  if (input.kubernetesRbacAllowed === false) {
    return deny('KUBERNETES_RBAC_DENIED', 'Kubernetes RBAC denied this action.')
  }

  return decision
}

export function canManageUsers(role: OrganizationRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function canAssignRole(actor: OrganizationRole, target: OrganizationRole): boolean {
  if (actor === 'OWNER') return true
  if (actor === 'ADMIN') return target !== 'OWNER' && target !== 'ADMIN'
  return false
}

export function canPromoteToAdmin(actor: OrganizationRole): boolean {
  return actor === 'OWNER' || actor === 'ADMIN'
}
