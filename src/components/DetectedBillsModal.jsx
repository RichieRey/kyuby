import { useEffect, useState } from 'react'
import Modal from './Modal'
import {
  db,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  serverTimestamp,
  getGmailAccessToken,
} from '../firebase'
import { fetchFacturaMessages, GmailAuthError } from '../lib/gmail'
import { detectBillFromMessage } from '../lib/billParsers'
import { formatCOP } from '../lib/billing'

// Busca, entre los items activos, uno que ya corresponda al proveedor
// detectado (por ejemplo "Claro Hogar" ya existente para un correo de
// Claro). Coincidencia simple por nombre — suficiente para el uso personal
// de esta app, sin necesidad de un ID de proveedor más formal.
function matchExistingItem(items, proveedor) {
  const needle = proveedor.toLowerCase()
  return items.find((it) => it.name?.toLowerCase().includes(needle)) || null
}

export default function DetectedBillsModal({ items, onClose }) {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('')
  const [candidates, setCandidates] = useState([])
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const token = getGmailAccessToken()
      if (!token) {
        setStatus('error')
        setErrorMsg(
          'No hay permiso de lectura de Gmail activo. Cierra sesión y vuelve a entrar para autorizarlo.'
        )
        return
      }
      try {
        const [messages, processedSnap] = await Promise.all([
          fetchFacturaMessages(token),
          getDocs(collection(db, 'gmailImports')),
        ])
        if (cancelled) return
        const processedIds = new Set(processedSnap.docs.map((d) => d.id))
        const detected = messages
          .map((m) => detectBillFromMessage(m))
          .filter((d) => d && !processedIds.has(d.messageId))
          .map((d) => ({ ...d, matchedItem: matchExistingItem(items, d.proveedor) }))
        setCandidates(detected)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        console.error('Error buscando facturas en Gmail:', e)
        setStatus('error')
        setErrorMsg(
          e instanceof GmailAuthError
            ? e.message
            : 'No se pudo consultar el correo. Intenta de nuevo en un momento.'
        )
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [items])

  async function markProcessed(candidate, resultStatus) {
    await setDoc(doc(db, 'gmailImports', candidate.messageId), {
      status: resultStatus,
      proveedor: candidate.proveedor,
      valor: candidate.valor,
      at: serverTimestamp(),
    })
  }

  async function handleConfirm(candidate) {
    setBusyId(candidate.messageId)
    try {
      if (candidate.matchedItem) {
        await setDoc(
          doc(db, 'items', candidate.matchedItem.id),
          { amount: candidate.valor },
          { merge: true }
        )
      } else {
        await addDoc(collection(db, 'items'), {
          name: candidate.nombreSugerido,
          category: candidate.categoriaSugerida,
          amount: candidate.valor,
          dueDay: candidate.fechaPago ? candidate.fechaPago.getDate() : 1,
          notes: 'Agregado automáticamente desde Gmail',
          createdAt: serverTimestamp(),
        })
      }
      await markProcessed(candidate, 'confirmed')
      setCandidates((prev) => prev.filter((c) => c.messageId !== candidate.messageId))
    } catch (e) {
      console.error('Error guardando factura detectada:', e)
      alert('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleIgnore(candidate) {
    setBusyId(candidate.messageId)
    try {
      await markProcessed(candidate, 'ignored')
      setCandidates((prev) => prev.filter((c) => c.messageId !== candidate.messageId))
    } catch (e) {
      console.error('Error ignorando factura detectada:', e)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title="Facturas detectadas en tu correo" onClose={onClose}>
      {status === 'loading' && <p className="muted">Buscando en el label "Facturas"…</p>}

      {status === 'error' && <p className="error-text">{errorMsg}</p>}

      {status === 'ready' && candidates.length === 0 && (
        <p className="muted">No hay facturas nuevas por revisar. Todo al día.</p>
      )}

      {status === 'ready' && candidates.length > 0 && (
        <div className="detected-bills-list">
          {candidates.map((c) => (
            <div className="detected-bill-card" key={c.messageId}>
              <div className="detected-bill-info">
                <strong>{c.nombreSugerido}</strong>
                <span className="muted">
                  {c.valor ? formatCOP(c.valor) : 'Monto no disponible aún'}
                  {c.fechaPago ? ` · vence ${c.fechaPago.toLocaleDateString('es-CO')}` : ''}
                </span>
                <span className="muted">
                  {c.matchedItem
                    ? `Se actualizará "${c.matchedItem.name}"`
                    : 'Se creará como servicio nuevo'}
                </span>
                {c.fuente === 'pdf-adjunto' && (
                  <span className="muted">
                    ⚠️ Este proveedor todavía requiere abrir el PDF a mano — próximamente se
                    extrae solo.
                  </span>
                )}
              </div>
              <div className="detected-bill-actions">
                <button
                  className="btn-primary btn-small"
                  disabled={!c.valor || busyId === c.messageId}
                  onClick={() => handleConfirm(c)}
                >
                  Confirmar
                </button>
                <button
                  className="btn-small btn-ghost"
                  disabled={busyId === c.messageId}
                  onClick={() => handleIgnore(c)}
                >
                  Ignorar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
