import { PushpinFilled, PushpinOutlined, StarFilled } from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import { kindIcons } from '../../resourceConfig/kinds.renderer'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'

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
  const KindIcon = kindIcons[kind]

  return (
    <span
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
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
    >
      {showIcons && (
        <span style={{ fontSize: 14, lineHeight: 1, display: 'inline-flex' }}>
          <KindIcon />
        </span>
      )}
      <span>{kind}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
        <StarFilled
          role="button"
          aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
          style={{ fontSize: 11, color: favorite ? 'var(--ml-primary)' : undefined, opacity: favorite ? 1 : 0.35 }}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(kind)
          }}
        />
        {pinned ? (
          <PushpinFilled
            role="button"
            aria-label="Unpin tab"
            style={{ fontSize: 11, color: 'var(--ml-primary)' }}
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(kind)
            }}
          />
        ) : (
          <PushpinOutlined
            role="button"
            aria-label="Pin tab"
            style={{ fontSize: 11, opacity: 0.45 }}
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(kind)
            }}
          />
        )}
      </span>
    </span>
  )
}
