import { formatCOP } from '../lib/billing'

export default function AlertBanner({ alerts }) {
  if (!alerts.length) return null

  const vencidos = alerts.filter((a) => a.status === 'vencido')
  const proximos = alerts.filter((a) => a.status === 'proximo')

  return (
    <div className="alert-banner">
      {vencidos.length > 0 && (
        <div className="alert-row alert-danger">
          <span className="alert-icon">⚠️</span>
          <span>
            <strong>{vencidos.length}</strong> {vencidos.length === 1 ? 'pago vencido' : 'pagos vencidos'}:{' '}
            {vencidos.map((a) => a.item.name).join(', ')}
          </span>
        </div>
      )}
      {proximos.length > 0 && (
        <div className="alert-row alert-warning">
          <span className="alert-icon">⏰</span>
          <span>
            <strong>{proximos.length}</strong> {proximos.length === 1 ? 'pago próximo a vencer' : 'pagos próximos a vencer'} (5 días o menos):{' '}
            {proximos.map((a) => `${a.item.name} (${formatCOP(a.item.amount)})`).join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
