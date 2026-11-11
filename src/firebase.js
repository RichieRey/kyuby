import { initializeApp } from 'firebase/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
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
  getDocs,
  serverTimestamp,
  enableIndexedDbPersistence,
} from 'firebase/firestore'

// La config web de Firebase llega por variables de entorno (VITE_FIREBASE_*):
// en local desde .env.local (ver .env.example) y en GitHub Actions desde los
// Secrets del repo. No es un secreto: la seguridad está en las reglas de
// Firestore y en los dominios autorizados de Authentication.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)
if (missing.length) {
  throw new Error(
    `Falta la config de Firebase (${missing.join(', ')}). ` +
      'En local crea .env.local a partir de .env.example; en GitHub revisa los Secrets VITE_FIREBASE_*.'
  )
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

// Scope adicional para que Kyuby pueda, más adelante, leer (solo lectura)
// los correos de facturas del usuario y detectarlas automáticamente en vez
// de depender de la foto/OCR manual. Es de solo lectura, nunca escribe ni
// borra nada en el Gmail del usuario.
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
googleProvider.addScope(GMAIL_READONLY_SCOPE)

// El access token de Google (distinto del idToken/sesión de Firebase) es lo
// que se necesita para llamar a la API de Gmail desde el cliente. Firebase no
// lo guarda ni lo renueva, así que lo guardamos nosotros con su hora de
// emisión. Dura una hora; lo damos por vencido a los 55 minutos. Va en
// localStorage para que, si se vuelve a abrir la app dentro de esa hora, la
// revisión del correo arranque sola. Es de solo lectura y se borra al salir.
const GMAIL_TOKEN_KEY = 'kyuby_gmail_token'
const GMAIL_TOKEN_TTL_MS = 55 * 60 * 1000

function storeGmailAccessToken(accessToken) {
  if (!accessToken) return
  try {
    localStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify({ token: accessToken, at: Date.now() }))
  } catch (e) {
    console.warn('No se pudo guardar el token de Gmail:', e)
  }
}

// Token vigente para la API de Gmail, o null si no hay o ya venció.
export function getGmailAccessToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(GMAIL_TOKEN_KEY) || 'null')
    if (!saved?.token || Date.now() - saved.at > GMAIL_TOKEN_TTL_MS) return null
    return saved.token
  } catch {
    return null
  }
}

export function clearGmailAccessToken() {
  try {
    localStorage.removeItem(GMAIL_TOKEN_KEY)
    sessionStorage.removeItem('kyuby_gmail_access_token') // formato anterior
  } catch {
    // noop
  }
}

// Pide un token nuevo de Gmail sin cerrar la sesión de Kyuby. Abre la
// ventana de Google (en Android, el selector de cuentas), así que debe
// llamarse desde un toque del usuario para que el navegador no la bloquee.
export async function connectGmail() {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({
      scopes: [GMAIL_READONLY_SCOPE],
    })
    storeGmailAccessToken(result?.credential?.accessToken)
  } else {
    const result = await reauthenticateWithPopup(auth.currentUser, googleProvider)
    storeGmailAccessToken(GoogleAuthProvider.credentialFromResult(result)?.accessToken)
  }
  const token = getGmailAccessToken()
  if (!token) throw new Error('Google no entregó el permiso de Gmail.')
  return token
}

// En la app nativa (Android empaquetado con Capacitor) el popup de Google no
// funciona: Google bloquea el login OAuth dentro de un WebView embebido
// ("disallowed_useragent"). Ahí usamos el selector nativo de cuentas de
// Google y con el idToken que devuelve iniciamos sesión en el SDK de
// Firebase (misma sesión/reglas que la versión web).
//
// En web volvimos a signInWithPopup (el login por redirect falló peor: el
// handler de Firebase entre github.io y firebaseapp.com necesita guardar
// estado entre dominios y varios navegadores modernos ya lo bloquean por
// defecto — daba "The requested action is invalid"). El aviso de
// "Cross-Origin-Opener-Policy... window.close" que se ve en consola con
// popup es cosmético (Firebase ya lo maneja internamente); no debería
// impedir que el accessToken llegue.
export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({
      scopes: [GMAIL_READONLY_SCOPE],
    })
    const idToken = result?.credential?.idToken
    if (!idToken) throw new Error('No se recibió el token de Google.')
    storeGmailAccessToken(result?.credential?.accessToken)
    const credential = GoogleAuthProvider.credential(idToken)
    return signInWithCredential(auth, credential)
  }
  const result = await signInWithPopup(auth, googleProvider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  storeGmailAccessToken(credential?.accessToken)
  return result
}

export async function logout() {
  clearGmailAccessToken()
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
  getDocs,
  serverTimestamp,
}
