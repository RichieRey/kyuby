import { formatCOP, daysUntil, describeDays } from '../lib/billing'

// Avisos del mes: vencidos en rojo y próximos a vencer con lo que falta.
export default function AlertBanner({ alerts }) {
  if (!alerts.length) return null

  const byDue = [...alerts].sort((a, b) => a.due - b.due)
  const vencidos = byDue.filter((a) => a.status === 'vencido')
  const proximos = byDue.filter((a) => a.status === 'proximo')

  return (
    <div className="alert-banner">
      {vencidos.length > 0 && (
        <div className="alert-row alert-danger">
          <span className="alert-icon">⚠️</span>
          <span>
            <strong>{vencidos.length === 1 ? 'Vencido:' : `${vencidos.length} vencidos:`}</strong>{' '}
            {vencidos
              .map(
                (a) =>
                  `${a.item.name} venció ${describeDays(daysUntil(a.due))} (${formatCOP(a.item.amount)})`,
              )
              .join(' · ')}
          </span>
        </div>
      )}
      {proximos.length > 0 && (
        <div className="alert-row alert-warning">
          <span className="alert-icon">⏰</span>
          <span>
            <strong>Por vencer:</strong>{' '}
            {proximos
              .map(
                (a) =>
                  `${a.item.name} vence ${describeDays(daysUntil(a.due))} (${formatCOP(a.item.amount)})`,
              )
              .join(' · ')}
          </span>
        </div>
      )}
    </div>
  )
}
