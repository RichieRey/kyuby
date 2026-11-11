import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildDefines } from './build-info.js'

// Build empaquetado dentro de la app Android (Capacitor).
// Distinto del build web (vite.config.js): sin base de GitHub Pages,
// sin service worker (Capacitor ya sirve los archivos localmente).
export default defineConfig({
  base: './',
  define: buildDefines,
  build: {
    outDir: 'dist-mobile',
    emptyOutDir: true,
  },
  plugins: [react()],
})
