import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  test: {
    environment: 'node',
    include: ['src/shared/**/*.test.ts', 'src/renderer/src/**/*.test.ts', 'src/renderer/src/**/*.test.tsx'],
    setupFiles: ['src/shared/testSetup.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
