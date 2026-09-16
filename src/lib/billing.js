// Lógica de fechas, estados y cálculos del mes — sin dependencias externas.

export const CATEGORIES = {
  servicio: { label: 'Servicio público', color: '#38bdf8' },
  suscripcion: { label: 'Suscripción', color: '#a78bfa' },
  otro: { label: 'Otro', color: '#94a3b8' },
}

export function daysInMonth(year, month) {
  // month: 0-11
  return new Date(year, month + 1, 0).getDate()
}

export function dueDateFor(year, month, dueDay) {
  const d = Math.min(dueDay, daysInMonth(year, month))
  return new Date(year, month, d)
}

export function paymentId(itemId, year, month) {
  return `${itemId}_${year}_${String(month + 1).padStart(2, '0')}`
}

// status: 'pagado' | 'vencido' | 'proximo' (<=5 días) | 'pendiente'
export function statusFor(item, payment, year, month, today = new Date()) {
  if (payment?.paid) return 'pagado'
  const due = dueDateFor(year, month, item.dueDay)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((due - todayMid) / 86400000)
  if (diffDays < 0) return 'vencido'
  if (diffDays <= 5) return 'proximo'
  return 'pendiente'
}

export const STATUS_META = {
  pagado: { label: 'Pagado', color: '#22c55e' },
  vencido: { label: 'Vencido', color: '#ef4444' },
  proximo: { label: 'Próximo', color: '#f59e0b' },
  pendiente: { label: 'Pendiente', color: '#64748b' },
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
