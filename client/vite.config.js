/**
 * Preview: client/vite.config.js
 * Description: Frontend application module.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // '.trycloudflare.com' covers the rotating tunnel hostname used by
    // `npm run start` (net mode, startup.sh). Local/LAN access via
    // localhost/127.0.0.1/private IPs is allowed by Vite regardless of this list.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true
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
