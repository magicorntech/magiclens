import { Tag } from 'antd'
import type { ArgoHealthStatus, ArgoSyncStatus } from '@shared/types/argocd'

/**
 * Argo's own colour language, kept in one place so the dashboard, the applications table and
 * the attention list can't drift apart. These map onto antd's preset tag colours rather than
 * raw hex so they stay readable in both themes.
 */

const SYNC_COLORS: Record<ArgoSyncStatus, string> = {
  Synced: 'green',
  OutOfSync: 'orange',
  Unknown: 'default'
}

const HEALTH_COLORS: Record<ArgoHealthStatus, string> = {
  Healthy: 'green',
  Progressing: 'blue',
  Degraded: 'red',
  Suspended: 'purple',
  Missing: 'volcano',
  Unknown: 'default'
}

export function ArgoSyncTag({ status }: { status: ArgoSyncStatus }): React.JSX.Element {
  return <Tag color={SYNC_COLORS[status]}>{status}</Tag>
}

export function ArgoHealthTag({ status }: { status: ArgoHealthStatus }): React.JSX.Element {
  return <Tag color={HEALTH_COLORS[status]}>{status}</Tag>
}

export { SYNC_COLORS, HEALTH_COLORS }
