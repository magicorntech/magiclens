/// <reference types="vite/client" />

import type { HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: HTMLAttributes<HTMLElement> & {
        src?: string
        partition?: string
        allowpopups?: boolean | string
        webpreferences?: string
      }
    }
  }
}

