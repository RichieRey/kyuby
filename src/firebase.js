import { initializeApp } from 'firebase/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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

// Scope adicional para que Kyuby pueda, más adelante, leer (solo lectura)
// los correos de facturas del usuario y detectarlas automáticamente en vez
// de depender de la foto/OCR manual. Es de solo lectura, nunca escribe ni
// borra nada en el Gmail del usuario.
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
googleProvider.addScope(GMAIL_READONLY_SCOPE)

// El access token de Google (distinto del idToken/sesión de Firebase) es lo
// que se necesita para llamar a la API de Gmail directamente desde el
// cliente. Firebase NO lo persiste ni lo renueva solo, así que lo guardamos
// nosotros. Vive en sessionStorage (no localStorage): se limpia solo al
// cerrar la pestaña/app y no queda dando vueltas indefinidamente. Es un
// token de corta duración (~1 hora) y de solo-lectura sobre Gmail, así que
// el riesgo de tenerlo ahí es bajo, pero de todas formas se borra en logout.
const GMAIL_TOKEN_KEY = 'kyuby_gmail_access_token'

function storeGmailAccessToken(accessToken) {
  if (!accessToken) return
  try {
    sessionStorage.setItem(GMAIL_TOKEN_KEY, accessToken)
  } catch (e) {
    console.warn('No se pudo guardar el token de Gmail:', e)
  }
}

// Úsalo desde cualquier parte de la app cuando llegue el momento de llamar
// la API de Gmail (fetch a https://gmail.googleapis.com/... con
// `Authorization: Bearer <token>`). Si devuelve null, el usuario tocará
// volver a iniciar sesión para renovar el permiso/token.
export function getGmailAccessToken() {
  try {
    return sessionStorage.getItem(GMAIL_TOKEN_KEY)
  } catch (e) {
    return null
  }
}

function clearGmailAccessToken() {
  try {
    sessionStorage.removeItem(GMAIL_TOKEN_KEY)
  } catch (e) {
    // noop
  }
}

// En la app nativa (Android empaquetado con Capacitor) el popup de Google no
// funciona: Google bloquea el login OAuth dentro de un WebView embebido
// ("disallowed_useragent"). Ahí usamos el selector nativo de cuentas de
// Google y con el idToken que devuelve iniciamos sesión en el SDK de
// Firebase (misma sesión/reglas que la versión web).
//
// En web usamos signInWithRedirect en vez de signInWithPopup: GitHub Pages
// (como casi cualquier hosting moderno) manda una política
// Cross-Origin-Opener-Policy que bloquea la comunicación entre la ventana
// emergente y la app. El login básico igual funciona con popup, pero el
// access token del scope extra (gmail.readonly) se pierde en el camino.
// Con redirect no hay ventana emergente de por medio, así que no hay nada
// que esa política pueda bloquear.
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
  // Esto navega fuera de la app (a accounts.google.com) y de vuelta — no
  // hay nada útil que devolver acá. El resultado se recoge en
  // resolveGoogleRedirect(), que hay que llamar una vez al cargar la app.
  return signInWithRedirect(auth, googleProvider)
}

// Llamar una sola vez al arrancar la app (ver App.jsx). Si el usuario
// acaba de volver de un signInWithRedirect, aquí es donde se recoge el
// access token de Gmail que vino con el resultado.
export async function resolveGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth)
    if (!result) return // no había un redirect pendiente — carga normal
    const credential = GoogleAuthProvider.credentialFromResult(result)
    storeGmailAccessToken(credential?.accessToken)
  } catch (e) {
    console.error('Error resolviendo el login con Google (redirect):', e)
  }
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
