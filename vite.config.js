import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  css: {
    modules: {
      // Keep readable classnames in dev; keep smaller/unique in prod.
      generateScopedName: mode === 'development' ? '[name]__[local]' : '[hash:base64:8]',
    },
  },
}))
