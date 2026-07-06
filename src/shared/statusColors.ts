export const statusColors = {
  healthy: 'green',
  warning: 'gold',
  error: 'red',
  unknown: 'default'
} as const

export type StatusColorKey = keyof typeof statusColors
