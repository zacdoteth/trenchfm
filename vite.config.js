import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three/addons')) return 'three-addons'
          if (id.includes('three')) return 'three-vendor'
          if (id.includes('react')) return 'react-vendor'
          if (id.includes('socket.io-client')) return 'realtime-vendor'
          if (id.includes('lil-gui')) return 'debug-vendor'
          return 'app-vendor'
        },
      },
    },
  },
  server: {
    port: 8887,
    host: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
})
