import { Button, Typography } from 'antd'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { WorkloadActionId } from '@shared/types/workload'
import { PodDetailView } from '../Pod/PodDetailView'
import { GenericResourceDetailView } from '../Detail/GenericResourceDetailView'
import { Icon } from '../ui/Icon'
import { useWorkloadAuditStore, workloadAuditCommandText } from '../../stores/workloadAuditStore'

interface ResourceDetailPanelProps {
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem
  isActive: boolean
  layout?: 'sidebar' | 'bottom' | 'drawer'
  listQueryKey?: unknown[]
  onClose: () => void
}

const AUDIT_ACTION_KEYS: Partial<Record<WorkloadActionId, string>> = {
  scale: 'resourceDetail.audit.scale',
  restart: 'resourceDetail.audit.restart',
  editYaml: 'resourceDetail.audit.editYaml'
}

function ResourceAuditList({
  clusterId,
  kind,
  namespace,
  name
}: {
  clusterId: string
  kind: string
  namespace: string
  name: string
}): React.JSX.Element | null {
  const { t } = useTranslation()
  const entries = useWorkloadAuditStore((s) => s.entries)
  const matched = entries
    .filter(
      (entry) =>
        entry.clusterId === clusterId &&
        entry.kind === kind &&
        entry.namespace === namespace &&
        entry.name === name
    )
    .slice(0, 5)
  if (matched.length === 0) return null

  return (
    <div className="ml-resource-detail-audit">
      <span className="ml-resource-detail-audit__title">{t('resourceDetail.audit.title')}</span>
      <ul className="ml-resource-detail-audit__list">
        {matched.map((entry) => {
          const command = workloadAuditCommandText(entry.kubectlCommand)
          const when = new Date(entry.timestamp)
          const timeLabel = Number.isNaN(when.getTime()) ? entry.timestamp : when.toLocaleString()
          const actionKey = AUDIT_ACTION_KEYS[entry.action]
          return (
            <li key={entry.id} className="ml-resource-detail-audit__row">
              <span>{timeLabel}</span>
              <span>{actionKey ? t(actionKey) : t('resourceDetail.audit.other', { action: entry.action })}</span>
              <span>
                {entry.success
                  ? t('resourceDetail.audit.success')
                  : entry.error
                    ? t('resourceDetail.audit.failed', { error: entry.error })
                    : t('resourceDetail.audit.failedUnknown')}
              </span>
              {command ? <code className="ml-resource-detail-audit__cmd">{command}</code> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ResourceDetailPanel({
  clusterId,
  kind,
  item,
  isActive,
  layout = 'sidebar',
  listQueryKey,
  onClose
}: ResourceDetailPanelProps): React.JSX.Element {
  const isPod = kind === 'Pods'

  const detailHeader = (
    <div className="ml-resource-detail-header">
      <div>
        <Typography.Text strong style={{ fontSize: 15 }}>
          {item.name}
        </Typography.Text>
        {item.namespace ? (
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {item.namespace}
          </Typography.Text>
        ) : null}
        <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
          {kind}
        </Typography.Text>
      </div>
      <Button type="text" size="small" icon={<Icon icon={X} variant="action" />} onClick={onClose} />
    </div>
  )

  const audit = (
    <ResourceAuditList clusterId={clusterId} kind={kind} namespace={item.namespace} name={item.name} />
  )

  return (
    <div
      className={`ml-resource-detail${layout === 'drawer' ? ' ml-resource-detail--drawer' : ''}${layout === 'sidebar' ? ' ml-resource-detail--sidebar' : ''}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {detailHeader}
      {audit}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isPod ? (
          <PodDetailView
            clusterId={clusterId}
            item={item}
            isActive={isActive}
            listQueryKey={listQueryKey}
            onClose={onClose}
          />
        ) : (
          <GenericResourceDetailView
            key={`${kind}:${item.id}`}
            clusterId={clusterId}
            kind={kind}
            item={item}
            isActive={isActive}
            listQueryKey={listQueryKey}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
