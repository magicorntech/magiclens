/** MagicLens design tokens — crisp desktop UI (GitHub Desktop / VS Code scale). */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 8,
  xl: 8,
  full: 9999
} as const

export const iconSize = {
  default: 20,
  toolbar: 18,
  action: 16,
  detail: 14,
  micro: 12
} as const

export const iconStroke = 1.8 as const
export const iconLabelGap = 12 as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32
} as const

export const motion = {
  fast: 0.15,
  normal: 0.22,
  slow: 0.32,
  spring: { type: 'spring' as const, stiffness: 420, damping: 32 }
} as const

export const typography = {
  fontSans: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  largeTitle: { size: 28, weight: 600, lineHeight: 1.2 },
  pageTitle: { size: 20, weight: 500, lineHeight: 1.3 },
  sectionTitle: { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: '0.03em' },
  cardTitle: { size: 13, weight: 500, lineHeight: 1.4 },
  body: { size: 13, weight: 400, lineHeight: 1.5 },
  caption: { size: 11, weight: 400, lineHeight: 1.4 }
} as const

export const elevation = {
  sm: 'var(--ml-shadow-sm)',
  md: 'var(--ml-shadow-md)',
  lg: 'var(--ml-shadow-lg)',
  glass: 'var(--ml-glass-bg)'
} as const
