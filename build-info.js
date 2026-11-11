// Fecha del build (hora de Bogotá) y commit corto, para mostrar la versión en
// la app. En GitHub Actions GITHUB_SHA viene solo; en local dice "local".
const date = new Date().toLocaleDateString('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const buildDefines = {
  'import.meta.env.VITE_BUILD_DATE': JSON.stringify(date),
  'import.meta.env.VITE_BUILD_SHA': JSON.stringify((process.env.GITHUB_SHA || 'local').slice(0, 7)),
}
