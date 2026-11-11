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
        // El HTML no va en el precache: se pide primero a la red (abajo, NetworkFirst)
        // para que cada deploy se vea sin Ctrl+F5. JS y CSS llevan hash en el nombre,
        // así que pueden ir en precache sin quedar viejos.
        globPatterns: ['**/*.{js,css}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Páginas: red primero; si no hay red o tarda más de 3 s, la copia guardada.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'kyuby-html', networkTimeoutSeconds: 3 },
          },
          // Firebase/Google endpoints: siempre red, nunca cache
          {
            urlPattern: /^https:\/\/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|www\.googleapis\.com)\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
