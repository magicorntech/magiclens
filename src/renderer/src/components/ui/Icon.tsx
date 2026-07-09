import type { LucideIcon, LucideProps } from 'lucide-react'
import { iconSize, iconStroke } from '../../design-system/tokens'

export type IconVariant = 'default' | 'toolbar' | 'action' | 'detail' | 'micro'

export interface IconProps extends Omit<LucideProps, 'ref' | 'size'> {
  icon: LucideIcon
  /** Explicit pixel size — overrides variant when set. */
  size?: number
  /** Preset: default 20, toolbar 18, action 16, detail 14, micro 12. */
  variant?: IconVariant
}

const VARIANT_SIZE: Record<IconVariant, number> = {
  default: iconSize.default,
  toolbar: iconSize.toolbar,
  action: iconSize.action,
  detail: iconSize.detail,
  micro: iconSize.micro
}

/** Lucide-only icon wrapper — consistent size, stroke, and theme color inheritance. */
export function Icon({
  icon: Lucide,
  size,
  variant = 'default',
  strokeWidth = iconStroke,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  color = 'currentColor',
  ...props
}: IconProps): React.JSX.Element {
  return (
    <Lucide
      size={size ?? VARIANT_SIZE[variant]}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      color={color}
      aria-hidden
      {...props}
    />
  )
}
