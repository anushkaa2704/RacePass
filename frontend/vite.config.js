import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration
// This tells Vite how to build our React app
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // Frontend runs on this port
    host: true,  // Expose on LAN so phone can access via IP
    open: true   // Auto-open browser when you run 'npm run dev'
  }
})
