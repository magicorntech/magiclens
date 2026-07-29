import { GripVertical, Pin, Star, X } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import { kindIconLucide } from '../../icons/resourceKindIcons'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

interface ResourceTabLabelProps {
  kind: ResourceKind
  pinned: boolean
  favorite: boolean
  closable?: boolean
  reorderable?: boolean
  onDragHandlePointerDown?: (e: React.PointerEvent) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
  onClose?: (kind: ResourceKind) => void
}

export function ResourceTabLabel({
  kind,
  pinned,
  favorite,
  closable = false,
  reorderable = false,
  onDragHandlePointerDown,
  onTogglePin,
  onToggleFavorite,
  onClose
}: ResourceTabLabelProps): React.JSX.Element {
  const showIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)

  return (
    <span className="ml-resource-tab-label">
      {reorderable ? (
        <button
          type="button"
          className="ml-resource-tab-drag-handle"
          aria-label="Drag to reorder tab"
          onPointerDown={onDragHandlePointerDown}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon={GripVertical} variant="micro" />
        </button>
      ) : null}
      {showIcons && (
        <span className="ml-resource-tab-label-icon">
          <Icon icon={kindIconLucide[kind]} variant="micro" />
        </span>
      )}
      <span className="ml-resource-tab-label-text" title={kind}>
        {kind}
      </span>
      <span className="ml-resource-tab-label-actions">
        <button
          type="button"
          className={`ml-resource-tab-action${favorite ? ' ml-resource-tab-action--active' : ''}`}
          aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(kind)
          }}
        >
          <Icon icon={Star} variant="micro" fill={favorite ? 'var(--ml-primary)' : 'none'} />
        </button>
        <button
          type="button"
          className={`ml-resource-tab-action${pinned ? ' ml-resource-tab-action--active' : ''}`}
          aria-label={pinned ? 'Unpin tab' : 'Pin tab'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(kind)
          }}
        >
          <Icon icon={Pin} variant="micro" fill={pinned ? 'var(--ml-primary)' : 'none'} />
        </button>
        {closable ? (
          <button
            type="button"
            className="ml-resource-tab-action ml-resource-tab-action--close"
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation()
              onClose?.(kind)
            }}
          >
            <Icon icon={X} variant="micro" />
          </button>
        ) : null}
      </span>
    </span>
  )
}
