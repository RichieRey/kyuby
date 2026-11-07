// Migración única de los datos de antes del modelo por hogar.
// Hasta nov-2026 Kyuby guardaba items, payments y gmailImports en la raíz de
// Firestore. Esto los COPIA al hogar con los mismos IDs (así los pagos siguen
// apuntando a su item). Los originales no se tocan.
import {
  collection,
  getDocs,
  writeBatch,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { hhDoc } from './household'

const LEGACY_COLLECTIONS = ['items', 'payments', 'gmailImports']
const BATCH_LIMIT = 400

// Hogares con una copia en curso en esta pestaña, para no mostrar el aviso de
// "falta copiar" mientras la copia inicial todavía está corriendo.
const inProgress = new Set()
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeMigrations(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isMigrating(householdId) {
  return inProgress.has(householdId)
}

async function readLegacy(name) {
  try {
    const snap = await getDocs(collection(db, name))
    return snap.docs
  } catch (e) {
    // Usuarios nuevos no tienen permiso sobre las colecciones viejas: no hay nada que copiar.
    if (e?.code === 'permission-denied') return null
    throw e
  }
}

export async function migrateLegacyData(householdId, uid) {
  if (inProgress.has(householdId)) return null
  inProgress.add(householdId)
  notify()
  try {
    return await copyLegacy(householdId, uid)
  } finally {
    inProgress.delete(householdId)
    notify()
  }
}

async function copyLegacy(householdId, uid) {
  const counts = {}
  let hadAccess = false

  for (const name of LEGACY_COLLECTIONS) {
    const docs = await readLegacy(name)
    if (docs === null) {
      counts[name] = 0
      continue
    }
    hadAccess = true
    counts[name] = docs.length
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      docs.slice(i, i + BATCH_LIMIT).forEach((d) => {
        batch.set(hhDoc(householdId, name, d.id), d.data())
      })
      await batch.commit()
    }
  }

  await updateDoc(doc(db, 'households', householdId), {
    legacyMigration: {
      at: serverTimestamp(),
      by: uid,
      skipped: !hadAccess,
      counts,
    },
  })
  return { hadAccess, counts }
}
