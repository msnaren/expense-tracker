import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IP addresses (127.0.0.1 and localhost)
    port: 5173,
    strictPort: true
  }
})
