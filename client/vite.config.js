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
    allowedHosts: true, 
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
