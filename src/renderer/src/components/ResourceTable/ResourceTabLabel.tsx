import { Pin, Star } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import { kindIconLucide } from '../../icons/resourceKindIcons'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

interface ResourceTabLabelProps {
  kind: ResourceKind
  pinned: boolean
  favorite: boolean
  draggable?: boolean
  onDragStart?: (kind: ResourceKind) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (kind: ResourceKind) => void
  onTogglePin: (kind: ResourceKind) => void
  onToggleFavorite: (kind: ResourceKind) => void
}

export function ResourceTabLabel({
  kind,
  pinned,
  favorite,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onTogglePin,
  onToggleFavorite
}: ResourceTabLabelProps): React.JSX.Element {
  const showIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)

  return (
    <span
      className="ml-resource-tab-label"
      draggable={draggable}
      onDragStart={(e) => {
        e.stopPropagation()
        onDragStart?.(kind)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver?.(e)
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDrop?.(kind)
      }}
    >
      {showIcons && (
        <span className="ml-resource-tab-label-icon">
          <Icon icon={kindIconLucide[kind]} variant="detail" />
        </span>
      )}
      <span className="ml-resource-tab-label-text">{kind}</span>
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
      </span>
    </span>
  )
}
