import { Drawer } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'

interface ResourceDetailDrawerProps {
  open: boolean
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem | null
  isActive: boolean
  listQueryKey?: unknown[]
  onClose: () => void
}

export function ResourceDetailDrawer({
  open,
  clusterId,
  kind,
  item,
  isActive,
  listQueryKey,
  onClose
}: ResourceDetailDrawerProps): React.JSX.Element {
  const layoutMode = useLayoutMode()
  const maskBlur = useDisplaySettingsStore((s) => s.resourceDetailMaskBlur)
  // Keep the panel inside the resource page (not the full app chrome). Pods need a
  // bit more width for logs / exec / metrics tabs.
  const size =
    layoutMode === 'mobile'
      ? '100%'
      : layoutMode === 'compact'
        ? 440
        : kind === 'Pods'
          ? 640
          : 520

  return (
    <Drawer
      title={null}
      closable={false}
      placement="right"
      open={open && !!item}
      onClose={onClose}
      size={size}
      // Render inside the resource page host so the panel stays a window within the
      // workspace instead of covering the entire Electron window.
      getContainer={false}
      rootStyle={{ position: 'absolute' }}
      destroyOnHidden
      className="ml-resource-detail-drawer"
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        mask: { position: 'absolute' }
      }}
      mask={maskBlur ? { blur: true } : true}
      // Let xterm's textarea take keyboard focus inside the drawer without the
      // default focus trap yanking keystrokes back to the drawer wrapper.
      focusable={{ trap: false }}
    >
      {item && (
        <ResourceDetailPanel
          clusterId={clusterId}
          kind={kind}
          item={item}
          isActive={isActive}
          layout="drawer"
          listQueryKey={listQueryKey}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}
