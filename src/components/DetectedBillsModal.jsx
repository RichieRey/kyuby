import { useState } from 'react'
import { writeBatch, doc, collection } from 'firebase/firestore'
import Modal from './Modal'
import { db, serverTimestamp } from '../firebase'
import { matchItem } from '../lib/billScan'
import { formatCOP, toISODate } from '../lib/billing'

// Muestra las facturas nuevas encontradas en Gmail. Al confirmar, actualiza
// (o crea) el item del hogar; al ignorar, solo la marca como revisada. En
// los dos casos queda registrada en gmailImports para no volver a mostrarla.
// Si la factura no trae fecha límite, se pide antes de confirmar.
export default function DetectedBillsModal({ householdId, items, candidates, onResolved, onClose }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  // Fecha de vencimiento escrita a mano para las facturas que no la traen,
  // por messageId ('YYYY-MM-DD').
  const [fechas, setFechas] = useState({})

  const hhPath = ['households', householdId]

  function markProcessed(batch, bill, status) {
    batch.set(doc(db, ...hhPath, 'gmailImports', bill.messageId), {
      status,
      proveedor: bill.proveedor,
      valor: bill.valor ?? null,
      at: serverTimestamp(),
    })
    for (const olderId of bill.olderIds || []) {
      batch.set(doc(db, ...hhPath, 'gmailImports', olderId), {
        status: 'superseded',
        proveedor: bill.proveedor,
        at: serverTimestamp(),
      })
    }
  }

  // Fecha que se va a guardar: la de la factura o la que escribió el usuario.
  function fechaFor(bill, item) {
    if (bill.fechaPago) return toISODate(bill.fechaPago)
    return fechas[bill.messageId] ?? item?.vencimiento ?? ''
  }

  async function resolve(bill, confirm) {
    setBusyId(bill.messageId)
    setError('')
    try {
      const batch = writeBatch(db)
      if (confirm) {
        const item = matchItem(items, bill)
        const vencimiento = fechaFor(bill, item)
        if (item) {
          const update = { amount: bill.valor, proveedor: item.proveedor || bill.proveedor }
          if (vencimiento) update.vencimiento = vencimiento
          batch.set(doc(db, ...hhPath, 'items', item.id), update, { merge: true })
        } else {
          batch.set(doc(collection(db, ...hhPath, 'items')), {
            name: bill.nombreSugerido,
            tipo: bill.categoriaSugerida,
            proveedor: bill.proveedor,
            amount: bill.valor,
            periodicidad: 'mensual',
            vencimiento,
            notes: 'Agregado desde Gmail',
            active: true,
            createdAt: serverTimestamp(),
          })
        }
      }
      markProcessed(batch, bill, confirm ? 'confirmed' : 'ignored')
      await batch.commit()
      onResolved(bill.messageId)
    } catch (e) {
      console.error('Error guardando la factura detectada:', e)
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title="Facturas nuevas en tu correo" onClose={onClose}>
      {candidates.length === 0 && (
        <p className="muted">No hay facturas nuevas por revisar. Todo al día.</p>
      )}

      {candidates.length > 0 && (
        <div className="detected-bills-list">
          {candidates.map((c) => {
            const item = matchItem(items, c)
            const fecha = fechaFor(c, item)
            return (
              <div className="detected-bill-card" key={c.messageId}>
                <div className="detected-bill-info">
                  <strong>
                    {c.proveedor} · {formatCOP(c.valor)}
                  </strong>
                  <span className="muted">
                    {c.fechaPago
                      ? `Pagar hasta el ${c.fechaPago.toLocaleDateString('es-CO')}`
                      : 'La factura no trae fecha límite'}
                    {` · llegó el ${c.recibido.toLocaleDateString('es-CO')}`}
                  </span>
                  {!c.fechaPago && (
                    <label className="detected-bill-date">
                      <span>¿Hasta cuándo se paga?</span>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) =>
                          setFechas((prev) => ({ ...prev, [c.messageId]: e.target.value }))
                        }
                      />
                    </label>
                  )}
                  <span className="muted">
                    {item
                      ? `Se actualizará "${item.name}"`
                      : `Se creará "${c.nombreSugerido}" como servicio nuevo`}
                  </span>
                  {!c.probado && (
                    <span className="muted">
                      Lector sin probar para este proveedor: revisa que el valor esté bien.
                    </span>
                  )}
                </div>
                <div className="detected-bill-actions">
                  <button
                    className="btn-primary btn-small"
                    disabled={busyId === c.messageId || !fecha}
                    title={fecha ? undefined : 'Escribe la fecha de vencimiento'}
                    onClick={() => resolve(c, true)}
                  >
                    Confirmar
                  </button>
                  <button
                    className="btn-small btn-ghost"
                    disabled={busyId === c.messageId}
                    onClick={() => resolve(c, false)}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}
