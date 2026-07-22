export type OrganizationRole = 'OWNER' | 'ADMIN' | 'TEAM_ADMIN' | 'MEMBER' | 'READ_ONLY'

export type UserStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'REMOVED'

export type PermissionDenialReason =
  | 'USER_DISABLED'
  | 'CLUSTER_NOT_ASSIGNED'
  | 'MAGICLENS_POLICY_DENIED'
  | 'KUBERNETES_RBAC_DENIED'
  | 'SECRET_ACCESS_DENIED'
  | 'ADMIN_PERMISSION_REQUIRED'
  | 'ORGANIZATION_MEMBERSHIP_REQUIRED'

export interface PermissionCheckResult {
  allowed: boolean
  reason?: PermissionDenialReason
  message?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface SessionInfo {
  id: string
  deviceId: string | null
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
}

export interface MeResponse {
  id: string
  name: string
  email: string
  status: UserStatus
  organization: {
    id: string
    name: string
    slug: string
    role: OrganizationRole
  } | null
  kubeconfigs: Array<{
    id: string
    name: string
    visibility: string
    serverEndpoint: string | null
    environment: string | null
  }>
}

export const QUEUE_NAMES = [
  'email',
  'kubeconfig-validation',
  'cluster-health',
  'notifications',
  'maintenance',
  'audit-export',
  'reports'
] as const

export type QueueName = (typeof QUEUE_NAMES)[number]
