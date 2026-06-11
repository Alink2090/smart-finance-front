import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA plugin is optional — only loaded if installed
let pwaPlugin = null
try {
  const { VitePWA } = await import('vite-plugin-pwa')
  pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'SmartFinance Manager',
      short_name: 'SmartFinance',
      description: 'Gestion financière personnelle intelligente',
      theme_color: '#111118',
      background_color: '#0a0a0f',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/dashboard',
      scope: '/',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      categories: ['finance', 'productivity'],
      lang: 'fr',
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 100, maxAgeSeconds: 300 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
  })
} catch (_) {
  // vite-plugin-pwa not installed — skip PWA
}

export default defineConfig({
  plugins: [react(), pwaPlugin].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          recharts: ['recharts'],
        },
      },
    },
  },
})
