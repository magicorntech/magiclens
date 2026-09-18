/** MagicLens design tokens — crisp desktop UI (GitHub Desktop / VS Code scale). */
export const radius = {
  xs: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0
} as const

export const iconSize = {
  default: 20,
  toolbar: 18,
  action: 16,
  detail: 14,
  micro: 12
} as const

export const iconStroke = 1.8 as const
export const iconLabelGap = 8 as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48
} as const

export const motion = {
  fast: 0.12,
  normal: 0.18,
  slow: 0.28,
  spring: { type: 'spring' as const, stiffness: 420, damping: 32 }
} as const

export const typography = {
  fontSans: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  largeTitle: { size: 28, weight: 600, lineHeight: 1.2 },
  pageTitle: { size: 20, weight: 500, lineHeight: 1.3 },
  sectionTitle: { size: 12, weight: 500, lineHeight: 1.4, letterSpacing: '0.03em' },
  cardTitle: { size: 13, weight: 500, lineHeight: 1.4 },
  body: { size: 13, weight: 400, lineHeight: 1.5 },
  caption: { size: 11, weight: 400, lineHeight: 1.4 }
} as const

export const elevation = {
  sm: 'none',
  md: 'none',
  lg: 'var(--ml-shadow-lg)',
  glass: 'var(--ml-glass-bg)'
} as const

/** Default MagicLens coral accent */
export const brandAccent = '#FF5F6D' as const
