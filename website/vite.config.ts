import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const modules = path.resolve(__dirname, '../node_modules')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      antd: path.resolve(modules, 'antd'),
      'lucide-react': path.resolve(modules, 'lucide-react'),
      '@ant-design/icons': path.resolve(modules, '@ant-design/icons')
    }
  },
  server: { port: 4174, strictPort: true }
})
