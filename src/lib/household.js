// Hogar: los datos de Kyuby (items, pagos, facturas importadas) viven dentro
// de households/{householdId}. Solo los miembros del hogar (memberIds) pueden
// leerlos o escribirlos; eso lo hacen cumplir las reglas de Firestore.
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  arrayUnion,
  serverTimestamp,
  Timestamp,
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
    onError,
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

// ---- Invitaciones ---------------------------------------------------------
// Un miembro genera un código de 8 caracteres (invites/{code}) que vence en
// 48 horas y sirve una sola vez. Quien lo recibe inicia sesión, lo escribe y
// queda agregado a memberIds. Las reglas verifican el código en el servidor.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O ni 1/I
const CODE_LENGTH = 8
export const INVITE_HOURS = 48

function generateCode() {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

export function normalizeCode(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function createInvite(householdId, uid) {
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_HOURS * 3600 * 1000)
  // Un choque de códigos es casi imposible, pero si ocurre las reglas rechazan
  // la escritura (sería una actualización) y se intenta con otro código.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    try {
      await setDoc(doc(db, 'invites', code), {
        householdId,
        createdBy: uid,
        createdAt: serverTimestamp(),
        expiresAt,
        usedBy: null,
      })
      return { code, expiresAt: expiresAt.toDate() }
    } catch (e) {
      if (e?.code !== 'permission-denied' || attempt === 2) throw e
    }
  }
}

export class JoinError extends Error {}

export async function joinHousehold(user, rawCode) {
  const code = normalizeCode(rawCode)
  if (code.length !== CODE_LENGTH) throw new JoinError('El código tiene 8 caracteres.')

  const inviteRef = doc(db, 'invites', code)
  const snap = await getDoc(inviteRef)
  if (!snap.exists()) throw new JoinError('Ese código no existe. Revísalo con quien te lo envió.')
  const invite = snap.data()
  if (invite.usedBy) throw new JoinError('Ese código ya se usó. Pide uno nuevo.')
  if (invite.expiresAt.toMillis() <= Date.now())
    throw new JoinError('Ese código venció. Pide uno nuevo.')

  // Las dos escrituras van juntas: entrar al hogar y marcar el código como usado.
  const batch = writeBatch(db)
  batch.update(doc(db, 'households', invite.householdId), {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: user.email || '',
    lastInviteCode: code,
  })
  batch.update(inviteRef, { usedBy: user.uid, usedAt: serverTimestamp() })
  await batch.commit()
  return invite.householdId
}
