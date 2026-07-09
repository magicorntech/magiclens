import { Button, Dropdown, Space } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, RefreshCw, Scissors } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import type { WorkloadKind } from '@shared/types/workload'
import { actionRequiresPermission } from '@shared/workloadActions'
import { useClusterStore } from '../../stores/clusterStore'
import { useWorkloadActions } from './useWorkloadActions'
import { WorkloadActionModals } from './WorkloadActionModals'
import { WorkloadWarningBanners } from './WorkloadWarningBanners'

const QUICK_IDS = new Set(['scale', 'restart'])

const quickIcons: Record<string, React.ReactNode> = {
  scale: <Icon icon={Scissors} variant="detail" />,
  restart: <Icon icon={RefreshCw} variant="detail" />
}

interface WorkloadDetailToolbarProps {
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  target: ResourceMutationTarget
  listQueryKey: unknown[]
}

export function WorkloadDetailToolbar({
  clusterId,
  kind,
  namespace,
  name,
  target,
  listQueryKey
}: WorkloadDetailToolbarProps): React.JSX.Element {
  const isConnected =
    useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.status) === 'connected'
  const workload = useWorkloadActions({
    clusterId,
    kind,
    namespace,
    name,
    target,
    listQueryKey,
    enabled: isConnected
  })

  const menuItems: MenuProps['items'] = workload.visibleActions
    .filter((def) => def.id !== 'editYaml' && def.id !== 'delete')
    .flatMap((def) => {
      const items: MenuProps['items'] = []
      if (def.dividerBefore) items.push({ type: 'divider' })
      const permKey = actionRequiresPermission(def.id)
      const allowed = permKey ? workload.isActionAllowed(def.id) : true
      items.push({
        key: def.id,
        label: def.label,
        danger: def.danger,
        disabled: !allowed,
        onClick: () => void workload.handleAction(def.id)
      })
      return items
    })

  const quick = workload.visibleActions.filter((a) => QUICK_IDS.has(a.id) && workload.isActionAllowed(a.id))

  return (
    <div style={{ marginBottom: 12 }}>
      <WorkloadWarningBanners hpa={workload.context?.hpa} pdb={workload.context?.pdb} />
      <Space wrap>
        {quick.map((a) => (
          <Button key={a.id} icon={quickIcons[a.id]} onClick={() => void workload.handleAction(a.id)}>
            {a.label}
          </Button>
        ))}
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button icon={<Icon icon={MoreHorizontal} variant="detail" />}>Actions</Button>
        </Dropdown>
      </Space>
      <WorkloadActionModals clusterId={clusterId} kind={kind} namespace={namespace} name={name} workload={workload} />
    </div>
  )
}
