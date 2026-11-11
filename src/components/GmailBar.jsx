// Aviso del estado de la revisión del correo, arriba de la lista.
export default function GmailBar({ state, bills, error, onConnect, onOpen, onRetry, onDismiss }) {
  if (state === 'needs-auth') {
    return (
      <div className="gmail-bar">
        <span>📩 Revisa si te llegaron facturas nuevas al correo.</span>
        <div className="gmail-bar-actions">
          <button className="btn-small btn-primary" onClick={onConnect}>
            Revisar Gmail
          </button>
          <button className="btn-small btn-ghost" onClick={onDismiss}>
            Ahora no
          </button>
        </div>
      </div>
    )
  }

  if (state === 'scanning') {
    return (
      <div className="gmail-bar">
        <span>Revisando tu correo…</span>
      </div>
    )
  }

  if (state === 'ready' && bills.length > 0) {
    const nombres = bills.map((b) => b.proveedor).join(', ')
    return (
      <div className="gmail-bar gmail-bar-found">
        <span>
          📩 {bills.length === 1 ? '1 factura nueva' : `${bills.length} facturas nuevas`} en tu
          correo: {nombres}
        </span>
        <button className="btn-small btn-primary" onClick={onOpen}>
          Ver
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="gmail-bar">
        <span className="error-text">{error || 'No se pudo revisar el correo.'}</span>
        <button className="btn-small btn-ghost" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    )
  }

  return null
}
