import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: false, // מאפשר גישה מכתובות IP חיצוניות
    allowedHosts: true, // Allow all hosts (required for dynamic Cloudflare tunnels)
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    padding: 'none',
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
