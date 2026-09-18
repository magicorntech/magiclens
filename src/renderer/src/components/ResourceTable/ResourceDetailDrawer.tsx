import { Drawer } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'

const DETAIL_WIDTH_KEY = 'ml.resourceDetailDrawerWidth'
const DETAIL_MIN_WIDTH = 380

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
  const defaultWidth = layoutMode === 'compact' ? 440 : kind === 'Pods' ? 640 : 520
  const { width, resizing, handleProps } = useResizableDrawerWidth({
    storageKey: DETAIL_WIDTH_KEY,
    defaultWidth,
    minWidth: DETAIL_MIN_WIDTH
  })
  const isMobile = layoutMode === 'mobile'
  const size = isMobile ? '100%' : width

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
      className={`ml-resource-detail-drawer${resizing ? ' ml-resource-detail-drawer--resizing' : ''}`}
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
        <>
          {!isMobile ? (
            <button
              type="button"
              className="ml-detail-resize-handle"
              aria-label="Resize detail panel"
              title="Drag to resize"
              {...handleProps}
            />
          ) : null}
          <ResourceDetailPanel
            clusterId={clusterId}
            kind={kind}
            item={item}
            isActive={isActive}
            layout="drawer"
            listQueryKey={listQueryKey}
            onClose={onClose}
          />
        </>
      )}
    </Drawer>
  )
}
