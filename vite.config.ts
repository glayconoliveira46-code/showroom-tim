import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Permite acessar pelo IP local (ex: no iPhone 16 na mesma rede)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/posters': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
