import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
} from 'firebase/firestore'

// ⚠️ Reemplaza con la config de TU proyecto Firebase:
// Firebase Console → ⚙️ Configuración del proyecto → "Tus apps" → Config
const firebaseConfig = {
  apiKey: 'AIzaSyC3MnBWDeey6AvwqbUIAidIGLn1qEJPEC8',
  authDomain: 'kuyby-11789.firebaseapp.com',
  projectId: 'kuyby-11789',
  storageBucket: 'kuyby-11789.firebasestorage.app',
  messagingSenderId: '502227907291',
  appId: '1:502227907291:web:f70bc2862b9d7d9d2612fe',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

try {
  enableIndexedDbPersistence(db)
} catch (e) {
  console.warn('Persistencia offline no disponible:', e)
}

export const googleProvider = new GoogleAuthProvider()

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export function logout() {
  return signOut(auth)
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb)
}

export {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
}
