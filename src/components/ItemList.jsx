import { CATEGORIES, STATUS_META, formatCOP, dueDateFor } from '../lib/billing'

export default function ItemList({ rows, year, month, onEdit, onPay, onUnpay }) {
  if (!rows.length) {
    return (
      <div className="empty-state">
        <p>Todavía no tienes servicios ni suscripciones registrados.</p>
        <p className="muted">Dale a "Agregar" para empezar a llevar el control.</p>
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) => a.item.dueDay - b.item.dueDay)

  return (
    <div className="item-list">
      {sorted.map(({ item, payment, status }) => {
        const meta = STATUS_META[status]
        const catMeta = CATEGORIES[item.category] || CATEGORIES.otro
        const due = dueDateFor(year, month, item.dueDay)
        return (
          <div className="item-row" key={item.id}>
            <div className="item-main" onClick={() => onEdit(item)}>
              <span className="cat-dot" style={{ background: catMeta.color }} />
              <div className="item-text">
                <span className="item-name">{item.name}</span>
                <span className="item-meta">
                  {catMeta.label} · vence {due.getDate()}/{due.getMonth() + 1}
                  {item.notes ? ` · ${item.notes}` : ''}
                </span>
              </div>
            </div>
            <div className="item-right">
              <span className="item-amount">
                {formatCOP(status === 'pagado' ? payment?.paidAmount ?? item.amount : item.amount)}
              </span>
              <span className="status-badge" style={{ color: meta.color, borderColor: meta.color }}>
                {meta.label}
              </span>
              {status === 'pagado' ? (
                <button className="btn-small btn-ghost" onClick={() => onUnpay(item, payment)}>
                  Deshacer
                </button>
              ) : (
                <button className="btn-small btn-primary" onClick={() => onPay(item)}>
                  Pagar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
