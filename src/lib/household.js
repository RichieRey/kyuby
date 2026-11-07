// Hogar: los datos de Kyuby (items, pagos, facturas importadas) viven dentro
// de households/{householdId}. Solo los miembros del hogar (memberIds) pueden
// leerlos o escribirlos; eso lo hacen cumplir las reglas de Firestore.
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// Colección dentro del hogar: 'items' | 'payments' | 'gmailImports'
export function hhCollection(householdId, name) {
  return collection(db, 'households', householdId, name)
}

export function hhDoc(householdId, name, id) {
  return doc(db, 'households', householdId, name, id)
}

// Escucha el hogar del usuario. cb recibe el hogar ({ id, ...data }) o null
// si todavía no pertenece a ninguno. Si por alguna razón está en varios,
// se usa el más antiguo.
export function watchMyHousehold(uid, cb, onError) {
  const q = query(collection(db, 'households'), where('memberIds', 'array-contains', uid))
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) return cb(null)
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0))
      cb(list[0])
    },
    onError
  )
}

export async function createHousehold(user, name) {
  const ref = await addDoc(collection(db, 'households'), {
    name: name.trim() || 'Mi hogar',
    ownerId: user.uid,
    memberIds: [user.uid],
    members: { [user.uid]: user.email || '' },
    createdAt: serverTimestamp(),
  })
  return ref.id
}
