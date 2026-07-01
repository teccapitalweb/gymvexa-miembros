// Inicialización de Firebase para la App de Miembros de Gymvexa.
//
// IMPORTANTE: Esta app usa la MISMA config web PÚBLICA del proyecto
// "gymteck-1708f" (el mismo del panel), para compartir socios y membresías.
// NO uses aquí la llave de servicio (serviceAccountKey.json): eso es solo
// del backend. Esta es la config pública del cliente (apiKey, authDomain, etc.),
// segura para incluir en una app web.

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getMessaging, isSupported } from 'firebase/messaging'

// TODO: pegar config web de gymteck-1708f
// (Firebase Console -> Configuración del proyecto -> Tus apps -> App web -> SDK config)
const firebaseConfig = {
  apiKey: 'AIzaSyB2J1OWnB1dfCSuSrYJ8v_znJfn4Nxxcx8',
  authDomain: 'gymvexa-miembros.vercel.app',
  projectId: 'gymteck-1708f',
  storageBucket: 'gymteck-1708f.firebasestorage.app',
  messagingSenderId: '215690790783',
  appId: '1:215690790783:web:ee894c5ca1942a5b96bc4a',
}

const app = initializeApp(firebaseConfig)

// Auth + proveedor de Google (popup) para el login de socios.
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Firestore con persistencia offline (igual que el panel), para que la app
// móvil funcione bien con conexión intermitente en el gym.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

// Limpia la caché offline (IndexedDB) de Firestore. Se usa al detectar que el
// socio fue DESVINCULADO, para que no queden datos del socio anterior en el
// dispositivo. Es de MEJOR ESFUERZO: clearIndexedDbPersistence exige que el
// cliente esté terminado y que ninguna otra pestaña lo tenga abierto; si algo
// falla (p. ej. otra pestaña activa) no lanzamos —quien llama recarga la app
// enseguida a un estado limpio de memoria de todos modos—. Tras terminate(),
// `db` queda inutilizable: SIEMPRE recargar la página después de llamar aquí.
export async function limpiarCacheFirestore() {
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch {
    // Best-effort: la recarga posterior deja la app en un estado limpio igual.
  }
}

// Storage (imágenes del foro). El bucket es el de storageBucket de arriba.
export const storage = getStorage(app)

// Messaging (notificaciones push / FCM web).
// Se inicializa de forma PEREZOSA y protegida con isSupported() para no romper
// el arranque en navegadores sin soporte de push (p. ej. Safari iOS fuera de la
// PWA instalada, o navegadores viejos). Devuelve null si no hay soporte.
let _messaging = null
let _messagingIntentado = false
export async function obtenerMessaging() {
  if (_messaging) return _messaging
  if (_messagingIntentado) return _messaging
  _messagingIntentado = true
  try {
    if (await isSupported()) {
      _messaging = getMessaging(app)
    }
  } catch {
    _messaging = null
  }
  return _messaging
}

export default app
