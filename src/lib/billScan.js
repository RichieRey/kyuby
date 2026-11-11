// Revisión del correo: busca facturas nuevas de los proveedores conocidos y
// devuelve las que todavía no se han confirmado ni ignorado en este hogar.
// No guarda nada; eso pasa cuando el usuario confirma en DetectedBillsModal.

import { getDocs } from 'firebase/firestore'
import { hhCollection } from './household'
import { searchMessageIds, getMessage } from './gmail'
import { gmailQuery, detectBill } from './billParsers'

export async function scanNewBills(accessToken, householdId) {
  const [ids, processedSnap] = await Promise.all([
    searchMessageIds(accessToken, gmailQuery()),
    getDocs(hhCollection(householdId, 'gmailImports')),
  ])
  const processed = new Set(processedSnap.docs.map((d) => d.id))
  const candidates = []
  // Secuencial a propósito: son pocos correos y así no se golpea el límite
  // de peticiones de la Gmail API.
  for (const id of ids) {
    if (processed.has(id)) continue
    const message = await getMessage(accessToken, id)
    const bill = await detectBill(message)
    if (bill) candidates.push(bill)
  }
  return latestPerProvider(candidates)
}

// Si hay varias facturas sin revisar del mismo proveedor (por ejemplo la de
// octubre y la de noviembre), solo se muestra la más reciente. Las anteriores
// van en olderIds para marcarlas como reemplazadas al confirmar o ignorar.
function latestPerProvider(bills) {
  const byProvider = new Map()
  for (const bill of [...bills].sort((a, b) => b.recibido - a.recibido)) {
    const latest = byProvider.get(bill.proveedorId)
    if (latest) latest.olderIds.push(bill.messageId)
    else byProvider.set(bill.proveedorId, { ...bill, olderIds: [] })
  }
  return [...byProvider.values()]
}

// Empareja una factura con un item del hogar: primero por proveedor y,
// si no hay, por nombre.
export function matchItem(items, bill) {
  const prov = bill.proveedor.toLowerCase()
  return (
    items.find((it) => it.proveedor?.toLowerCase() === prov) ||
    items.find((it) => it.name?.toLowerCase().includes(prov)) ||
    null
  )
}
