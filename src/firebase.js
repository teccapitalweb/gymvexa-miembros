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
} from 'firebase/firestore'

// TODO: pegar config web de gymteck-1708f
// (Firebase Console -> Configuración del proyecto -> Tus apps -> App web -> SDK config)
const firebaseConfig = {
  apiKey: 'AIzaSyB2J1OWnB1dfCSuSrYJ8v_znJfn4Nxxcx8',
  authDomain: 'gymteck-1708f.firebaseapp.com',
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

export default app
