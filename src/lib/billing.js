// Lógica de fechas, estados y cálculos del mes — sin dependencias externas.

// Tipo del item (campo `tipo`). Hasta nov-2026 se llamaba `category`.
export const CATEGORIES = {
  servicio: { label: 'Servicio público', icon: '💡', bg: 'rgba(96, 165, 250, 0.16)', fg: '#60a5fa' },
  suscripcion: { label: 'Suscripción', icon: '🎬', bg: 'rgba(192, 132, 252, 0.16)', fg: '#c084fc' },
  otro: { label: 'Otro', icon: '🦊', bg: 'rgba(245, 121, 60, 0.16)', fg: '#f5793c' },
}

export function daysInMonth(year, month) {
  // month: 0-11
  return new Date(year, month + 1, 0).getDate()
}

export function dueDateFor(year, month, dueDay) {
  const d = Math.min(dueDay, daysInMonth(year, month))
  return new Date(year, month, d)
}

// ---- Periodicidad --------------------------------------------------------

export const PERIODICIDADES = {
  mensual: { label: 'Mensual', meses: 1 },
  bimestral: { label: 'Bimestral', meses: 2 },
  trimestral: { label: 'Trimestral', meses: 3 },
  semestral: { label: 'Semestral', meses: 6 },
  anual: { label: 'Anual', meses: 12 },
}

// Sugerencias para el campo proveedor (se puede escribir cualquier otro).
export const PROVEEDORES_SUGERIDOS = [
  'Vanti',
  'Enel',
  'Acueducto de Bogotá',
  'ETB',
  'Claro',
  'Movistar',
  'Tigo',
  'WOM',
  'Netflix',
  'Spotify',
  'Disney+',
  'Prime Video',
  'Max',
  'YouTube Premium',
  'Google One',
  'iCloud',
]

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseISODate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m - 1, day: d }
}

// Lleva cualquier item al formato de la fase 2. Los items guardados antes
// (category + dueDay, todo mensual) se leen con valores por defecto y pasan
// al formato nuevo la próxima vez que se editen.
export function normalizeItem(raw) {
  const tipo = raw.tipo || raw.category || 'servicio'
  const periodicidad = PERIODICIDADES[raw.periodicidad] ? raw.periodicidad : 'mensual'
  let vencimiento = parseISODate(raw.vencimiento) ? raw.vencimiento : null
  if (!vencimiento) {
    const now = new Date()
    vencimiento = toISODate(dueDateFor(now.getFullYear(), now.getMonth(), Number(raw.dueDay) || 1))
  }
  return {
    ...raw,
    tipo: CATEGORIES[tipo] ? tipo : 'otro',
    proveedor: raw.proveedor || '',
    periodicidad,
    vencimiento,
  }
}

// Fecha en que el item vence dentro del mes (year, month), o null si según
// su periodicidad no le toca ese mes. El día sale de la fecha de vencimiento;
// si el mes es más corto (ej. día 31 en febrero) se usa el último día.
export function dueDateInMonth(item, year, month) {
  const anchor = parseISODate(item.vencimiento)
  if (!anchor) return null
  const step = PERIODICIDADES[item.periodicidad]?.meses || 1
  const diff = (year - anchor.year) * 12 + (month - anchor.month)
  if (((diff % step) + step) % step !== 0) return null
  return dueDateFor(year, month, anchor.day)
}

export function paymentId(itemId, year, month) {
  return `${itemId}_${year}_${String(month + 1).padStart(2, '0')}`
}

// Con cuántos días de anticipación avisar. Se elige por hogar
// (households/{id}.alertDias); si no se ha elegido, 5.
export const DIAS_AVISO = [1, 3, 5, 7]
export const DEFAULT_DIAS_AVISO = 5

// Días que faltan para una fecha (negativo si ya pasó), contando desde hoy.
export function daysUntil(due, today = new Date()) {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - todayMid) / 86400000)
}

// Texto corto para los días que faltan: "hoy", "mañana", "en 3 días",
// "ayer", "hace 4 días".
export function describeDays(days) {
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  if (days === -1) return 'ayer'
  return days > 0 ? `en ${days} días` : `hace ${-days} días`
}

// status: 'pagado' | 'vencido' | 'proximo' (faltan diasAviso días o menos) | 'pendiente'
export function statusFor(
  item,
  payment,
  year,
  month,
  diasAviso = DEFAULT_DIAS_AVISO,
  today = new Date()
) {
  if (payment?.paid) return 'pagado'
  const due = dueDateInMonth(item, year, month)
  if (!due) return null
  const diffDays = daysUntil(due, today)
  if (diffDays < 0) return 'vencido'
  if (diffDays <= diasAviso) return 'proximo'
  return 'pendiente'
}

export const STATUS_META = {
  pagado: { label: 'Pagado' },
  vencido: { label: 'Vencido' },
  proximo: { label: 'Próximo' },
  pendiente: { label: 'Pendiente' },
}

export function monthLabel(year, month) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[month]} ${year}`
}

export function addMonths(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function formatCOP(n) {
  if (n === null || n === undefined || isNaN(n)) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}
