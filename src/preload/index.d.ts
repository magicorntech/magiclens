import type { MagicLensApi } from './index'

declare global {
  interface Window {
    api: MagicLensApi
  }
}

export {}
