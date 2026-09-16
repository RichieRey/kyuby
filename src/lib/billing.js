// Lógica de fechas, estados y cálculos del mes — sin dependencias externas.

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
