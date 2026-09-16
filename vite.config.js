import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site: https://richierey.github.io/kyuby/
export default defineConfig({
  base: '/kyuby/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/fox-mark.png'],
      manifest: {
        name: 'Kyuby',
        short_name: 'Kyuby',
        description: 'Home Bills & Subs',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        start_url: '/kyuby/',
        scope: '/kyuby/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Firebase/Google endpoints: siempre red, nunca cache
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|www\.googleapis\.com)\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
