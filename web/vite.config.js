import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Anime Manager',
        short_name: 'AnimeMgr',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ff5500',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    allowedHosts: ['unliquefied-indexically-zavier.ngrok-free.dev'],
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: '/index.html',
    }
  },
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
