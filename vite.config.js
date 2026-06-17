import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = le SW s'installe mais attend notre signal pour s'activer
      // C'est le seul mode qui permet d'afficher une bannière et de contrôler le moment du reload
      registerType: 'prompt',

      // Génère un SW Workbox complet avec precaching de tous les assets buildés
      injectRegister: 'auto',

      // Stratégies de cache Workbox
      workbox: {
        // Précache tous les fichiers produits par le build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],

        // Navigation fallback → SPA routing offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//], // ne pas intercepter les appels API

        // Stratégies runtime
        runtimeCaching: [
          {
            // API Django → NetworkFirst : essaie le réseau, fallback cache si offline
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sf-api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts et autres ressources externes → StaleWhileRevalidate
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'sf-fonts-cache' },
          },
          {
            // Images statiques → CacheFirst (longue durée)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sf-images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],

        // Nettoie les anciens caches Workbox automatiquement
        cleanupOutdatedCaches: true,

        // skipWaiting + clientsClaim gérés côté React (via postMessage)
        // On NE met PAS skipWaiting: true ici — c'est le bouton UI qui le déclenche
        skipWaiting: false,
        clientsClaim: true,
      },

      manifest: {
        name: 'SmartFinance',
        short_name: 'SmartFinance',
        description: 'Gestion financière personnelle intelligente',
        theme_color: '#111118',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        categories: ['finance', 'productivity'],
      },

      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],

      devOptions: {
        // Active le SW en dev pour tester (désactiver si ça gêne le HMR)
        enabled: false,
        type: 'module',
      },
    }),
  ],
})
