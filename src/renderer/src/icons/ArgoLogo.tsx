import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * Argo CD's octopus mark, Lucide-compatible so it can drop into existing `Icon` / nav slots.
 *
 * Like [[HelmLogo]] this defaults to `currentColor` rather than the brand's fixed orange, so
 * the mark inherits `--ml-text` and stays legible in both themes. Pass `color` explicitly
 * where the brand colour is genuinely wanted.
 */
export const ArgoLogo = forwardRef<SVGSVGElement, LucideProps>(function ArgoLogo(
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
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      {/* Head */}
      <path d="M12 2.5c-3.6 0-6.5 2.8-6.5 6.3 0 1.9.8 3.5 2.1 4.7h8.8a6.2 6.2 0 0 0 2.1-4.7c0-3.5-2.9-6.3-6.5-6.3Z" />
      {/* Eyes */}
      <circle cx="9.8" cy="8.4" r="1.15" fill={color} stroke="none" />
      <circle cx="14.2" cy="8.4" r="1.15" fill={color} stroke="none" />
      {/* Tentacles */}
      <path d="M7.6 13.5c0 2.2-.5 3.6-1.9 4.6-1.2.9-2.2.6-2.5-.3" />
      <path d="M10.2 13.5c0 3-.4 4.9-1.2 6.4-.6 1.1-1.5 1.5-2.1 1.1" />
      <path d="M13.8 13.5c0 3 .4 4.9 1.2 6.4.6 1.1 1.5 1.5 2.1 1.1" />
      <path d="M16.4 13.5c0 2.2.5 3.6 1.9 4.6 1.2.9 2.2.6 2.5-.3" />
      <path d="M12 13.5v6.2" />
    </svg>
  )
})
