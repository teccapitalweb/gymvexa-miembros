// Lógica del PUNTITO de "hay publicaciones nuevas" en la pestaña Foro.
//
// Idea: comparar el post MÁS RECIENTE del foro contra "hasta dónde ya vio" este
// miembro. Si el último post es más nuevo que lo último que vio -> hay novedad.
//
// - Funciona para TODOS (Android, iPhone nuevo y viejo), porque es algo visual
//   dentro de la app: no depende de las notificaciones push.
// - El "hasta dónde ya vio" se guarda en el teléfono (localStorage), así cada
//   quien tiene su propio puntito. No gasta servidor ni Firebase extra (solo un
//   listener de 1 documento: el post más reciente).
// - Para no depender del reloj del teléfono, se guarda el TIMESTAMP del post
//   (hora del servidor), nunca la hora local.
//
// Singleton: un solo listener para toda la app (como useDrawer).

import { ref } from 'vue'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Timestamp (ms) del post más reciente del foro. Lo alimenta el listener.
export const ultimoPostMs = ref(0)
// ¿Hay publicaciones nuevas que este miembro no ha visto?
const hayNuevos = ref(false)

let _unsub = null
let _gymId = null

const LS_VISTO = 'gv-foro-visto-ms' // timestamp (ms) del post más reciente YA visto

function leerVisto() {
  try {
    return Number(localStorage.getItem(LS_VISTO)) || 0
  } catch {
    return 0
  }
}

function recalcular() {
  hayNuevos.value = ultimoPostMs.value > 0 && ultimoPostMs.value > leerVisto()
}

// Arranca el listener del post más reciente del foro de ESTE gym.
// Se llama cuando el socio queda vinculado (ya tenemos su gymId).
export function iniciarAvisosForo(gymId) {
  if (!gymId) return
  if (gymId === _gymId && _unsub) return // ya escuchando este gym
  detenerAvisosForo()
  _gymId = gymId
  const q = query(
    collection(db, 'gyms', gymId, 'foro'),
    orderBy('creadoEn', 'desc'),
    limit(1),
  )
  _unsub = onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data()
        ultimoPostMs.value =
          d.creadoEn && typeof d.creadoEn.toMillis === 'function'
            ? d.creadoEn.toMillis()
            : 0
      } else {
        ultimoPostMs.value = 0
      }
      recalcular()
    },
    () => {
      // Si falla (permiso/conexión), simplemente no mostramos puntito.
    },
  )
}

// Detiene el listener (p. ej. al cerrar sesión).
export function detenerAvisosForo() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
  _gymId = null
  ultimoPostMs.value = 0
  hayNuevos.value = false
}

// Marca el foro como VISTO hasta el post más reciente conocido (apaga el puntito).
// Se llama al entrar al foro (por donde sea: pestaña o notificación).
export function marcarForoVisto() {
  try {
    localStorage.setItem(LS_VISTO, String(ultimoPostMs.value || 0))
  } catch {
    /* no pasa nada */
  }
  recalcular()
}

export function useAvisosForo() {
  return { hayNuevos, marcarForoVisto }
}
