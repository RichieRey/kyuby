import { CATEGORIES, STATUS_META, PERIODICIDADES, formatCOP } from '../lib/billing'

export default function ItemList({ rows, hasItems, onEdit, onPay, onUnpay }) {
  if (!rows.length) {
    return (
      <div className="empty-state">
        {hasItems ? (
          <>
            <p>Este mes no vence ningún servicio ni suscripción.</p>
            <p className="muted">Los que se pagan cada dos meses o más aparecen solo en su mes.</p>
          </>
        ) : (
          <>
            <p>Todavía no tienes servicios ni suscripciones registrados.</p>
            <p className="muted">Dale a "Agregar" para empezar a llevar el control.</p>
          </>
        )}
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) => a.due - b.due)

  return (
    <div className="item-list">
      {sorted.map(({ item, payment, status, due }) => {
        const meta = STATUS_META[status]
        const catMeta = CATEGORIES[item.tipo] || CATEGORIES.otro
        const details = [
          catMeta.label,
          item.proveedor,
          item.periodicidad !== 'mensual' ? PERIODICIDADES[item.periodicidad].label : null,
          `vence ${due.getDate()}/${due.getMonth() + 1}`,
          item.notes,
        ].filter(Boolean)
        return (
          <div className="item-row" key={item.id}>
            <div className="item-main" onClick={() => onEdit(item)}>
              <span className="cat-dot" style={{ background: catMeta.bg, color: catMeta.fg }}>
                {catMeta.icon}
              </span>
              <div className="item-text">
                <span className="item-name">{item.name}</span>
                <span className="item-meta">{details.join(' · ')}</span>
              </div>
            </div>
            <div className="item-right">
              <span className="item-amount">
                {formatCOP(
                  status === 'pagado' ? (payment?.paidAmount ?? item.amount) : item.amount,
                )}
              </span>
              <span className={`status-badge status-${status}`}>{meta.label}</span>
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
