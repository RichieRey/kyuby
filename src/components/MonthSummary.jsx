import { formatCOP } from '../lib/billing'

export default function MonthSummary({ rows }) {
  const total = rows.reduce((s, r) => s + (Number(r.item.amount) || 0), 0)
  const pagado = rows
    .filter((r) => r.status === 'pagado')
    .reduce((s, r) => s + (Number(r.payment?.paidAmount ?? r.item.amount) || 0), 0)
  const pendiente = total - pagado
  const vencidos = rows.filter((r) => r.status === 'vencido').length

  return (
    <div className="summary-grid">
      <div className="summary-card">
        <span className="summary-label">Total del mes</span>
        <span className="summary-value">{formatCOP(total)}</span>
      </div>
      <div className="summary-card summary-good">
        <span className="summary-label">Pagado</span>
        <span className="summary-value">{formatCOP(pagado)}</span>
      </div>
      <div className="summary-card summary-warn">
        <span className="summary-label">Pendiente</span>
        <span className="summary-value">{formatCOP(pendiente)}</span>
      </div>
      <div className="summary-card summary-bad">
        <span className="summary-label">Vencidos</span>
        <span className="summary-value">{vencidos}</span>
      </div>
    </div>
  )
}
