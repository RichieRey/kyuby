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
  // Log temporal de diagnóstico — bórralo cuando ya confirmemos que esto
  // quedó funcionando bien. Dice, en consola, si el token de Gmail llegó.
  console.log(
    '[Kyuby] Login con Google OK. ¿Llegó el token de Gmail?',
    credential?.accessToken ? 'SÍ' : 'NO — credential:',
    credential?.accessToken ? '' : credential
  )
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
