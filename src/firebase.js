import { initializeApp } from 'firebase/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
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

// En la app nativa (Android empaquetado con Capacitor) el popup de Google no
// funciona: Google bloquea el login OAuth dentro de un WebView embebido
// ("disallowed_useragent"). Ahí usamos el selector nativo de cuentas de
// Google y con el idToken que devuelve iniciamos sesión en el SDK de
// Firebase (misma sesión/reglas que la versión web).
export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle()
    const idToken = result?.credential?.idToken
    if (!idToken) throw new Error('No se recibió el token de Google.')
    const credential = GoogleAuthProvider.credential(idToken)
    return signInWithCredential(auth, credential)
  }
  return signInWithPopup(auth, googleProvider)
}

export async function logout() {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut()
    } catch (e) {
      console.warn('Error cerrando sesión nativa:', e)
    }
  }
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
