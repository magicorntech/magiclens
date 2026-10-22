export interface DevToolsKeyInput {
  key: string
  meta?: boolean
  control?: boolean
  alt?: boolean
  shift?: boolean
}

/** Keyboard paths that open Chromium DevTools or the element inspector. */
export function isDevToolsShortcut(input: DevToolsKeyInput): boolean {
  const key = input.key.toLowerCase()
  if (key === 'f12') return true
  const inspect = key === 'i' || key === 'j' || key === 'c'
  if (!inspect) return false
  if (input.meta && input.alt) return true
  if (input.control && input.shift) return true
  return false
}
