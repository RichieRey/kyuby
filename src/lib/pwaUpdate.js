// Actualización automática de la PWA (solo web). El service worker lo
// registra vite-plugin-pwa; con registerType 'autoUpdate' el worker nuevo se
// activa apenas se instala (skipWaiting + clientsClaim). Aquí:
// 1. se busca versión nueva al abrir, cada hora y al volver a la pestaña;
// 2. cuando el worker nuevo toma el control, se recarga la página una vez
//    para que la pestaña abierta no se quede con la versión vieja.
import { Capacitor } from '@capacitor/core'

const CHECK_EVERY_MS = 60 * 60 * 1000

export function setupPwaUpdates() {
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return

  // En la primera visita no había worker controlando: ahí no se recarga.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {})
    setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  })
}
