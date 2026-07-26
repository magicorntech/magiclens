import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * Official Helm ship's-wheel mark (simplified), Lucide-compatible so it can
 * drop into existing `Icon` / nav slots via `currentColor`.
 */
export const HelmLogo = forwardRef<SVGSVGElement, LucideProps>(function HelmLogo(
  {
    size = 24,
    color = 'currentColor',
    strokeWidth: _strokeWidth,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    className,
    ...props
  },
  ref
) {
  const s = typeof size === 'number' ? size : Number.parseInt(String(size), 10) || 24
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden
      {...props}
    >
      {/* Outer ring */}
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm0 1.75a8.75 8.75 0 1 1 0 17.5 8.75 8.75 0 0 1 0-17.5Z" />
      {/* Hub */}
      <circle cx="12" cy="12" r="2.35" />
      {/* Spokes */}
      <rect x="11.15" y="3.4" width="1.7" height="5.2" rx="0.5" />
      <rect x="11.15" y="15.4" width="1.7" height="5.2" rx="0.5" />
      <rect x="3.4" y="11.15" width="5.2" height="1.7" rx="0.5" />
      <rect x="15.4" y="11.15" width="5.2" height="1.7" rx="0.5" />
      {/* Diagonal spokes */}
      <g transform="rotate(45 12 12)">
        <rect x="11.15" y="3.4" width="1.7" height="5.2" rx="0.5" />
        <rect x="11.15" y="15.4" width="1.7" height="5.2" rx="0.5" />
        <rect x="3.4" y="11.15" width="5.2" height="1.7" rx="0.5" />
        <rect x="15.4" y="11.15" width="5.2" height="1.7" rx="0.5" />
      </g>
      {/* Rim handles (8 knobs) */}
      <circle cx="12" cy="2.15" r="1.05" />
      <circle cx="12" cy="21.85" r="1.05" />
      <circle cx="2.15" cy="12" r="1.05" />
      <circle cx="21.85" cy="12" r="1.05" />
      <circle cx="5.05" cy="5.05" r="1.05" />
      <circle cx="18.95" cy="5.05" r="1.05" />
      <circle cx="5.05" cy="18.95" r="1.05" />
      <circle cx="18.95" cy="18.95" r="1.05" />
    </svg>
  )
})
