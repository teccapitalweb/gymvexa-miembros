// Lógica de NOTIFICACIONES PUSH (FCM web) para la app de socios.
//
// Qué hace:
//  - Detecta el soporte real del dispositivo. Caso especial de iOS: el push solo
//    existe DENTRO de la PWA instalada (standalone) en iOS 16.4+. En Safari normal
//    ni siquiera se puede pedir permiso.
//  - Pide el permiso del navegador de forma controlada (el "soft-ask" visual vive
//    en PushSoftAsk.vue; aquí se dispara el cuadro nativo solo cuando toca).
//  - Obtiene el token del dispositivo (con la llave VAPID) y lo guarda en Firestore
//    bajo la ficha del socio: gyms/{gymId}/socios/{socioId}/pushTokens/{deviceId}.
//  - Permite desactivar: borra ese token guardado.
//
// Multi-dispositivo: cada dispositivo se identifica con un id propio en localStorage,
// así un socio puede tener push en su celular y su tablet sin pisarse, y cuando el
// token rota NO se duplica (se actualiza el MISMO documento).

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getToken, deleteToken } from 'firebase/messaging'
import { db, obtenerMessaging } from '../firebase'
import { useSocioStore } from '../stores/socio'

// Llave pública VAPID (Web Push certificate) del proyecto gymteck-1708f.
// Es PÚBLICA por diseño: segura para vivir en el cliente.
const VAPID_KEY =
  'BCGTZ3Y6aZXDdQTx6Pa_B00T_BAzDARYTT3QdrM1niE_Wu87IxkVMTXK5IF9KgXWEeQia82fOu7ZrF3SxkO_t0c'

const LS_DEVICE = 'gv-device-id' // id estable de este dispositivo
const LS_ON = 'gv-push-on' // marca local: este dispositivo tiene push activo
const LS_ASK = 'gv-push-ask-v1' // marca: ya mostramos el soft-ask una vez

// --- Detección de plataforma ---
function esStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  )
}

export function esIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad moderno se reporta como "MacIntel" con pantalla táctil
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// ¿Se puede recibir push AQUÍ y AHORA?
// En iOS, las APIs de push solo existen dentro de la app instalada (standalone).
export async function pushSoportado() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false
  if (esIOS() && !esStandalone()) return false
  // Confirmación final por parte de Firebase (revisa las APIs subyacentes).
  const m = await obtenerMessaging()
  return !!m
}

// En iOS, ¿el motivo de no soportar es que falta instalar la app?
export function iosNecesitaInstalar() {
  return esIOS() && !esStandalone()
}

// ¿Existen las APIs de push en este navegador? En iOS solo aparecen desde 16.4.
export function apiPushExiste() {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

// iOS instalado como PWA pero SIN las APIs de push => iOS anterior a 16.4.
// OJO: esto NO es "permiso bloqueado"; es que la función todavía no existe en
// ese iOS. Por eso amerita un mensaje distinto ("actualiza tu iPhone").
export function iosDesactualizado() {
  return esIOS() && esStandalone() && !apiPushExiste()
}

// Id estable de este dispositivo (se crea una vez y se reutiliza).
function deviceId() {
  let id = null
  try {
    id = localStorage.getItem(LS_DEVICE)
  } catch {
    /* localStorage no disponible */
  }
  if (!id) {
    id =
      (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
      'd' + Date.now() + Math.random().toString(36).slice(2)
    try {
      localStorage.setItem(LS_DEVICE, id)
    } catch {
      /* no pasa nada */
    }
  }
  return id
}

// --- Estado del soft-ask (¿ya lo mostramos una vez?) ---
export function yaPreguntado() {
  try {
    return localStorage.getItem(LS_ASK) === '1'
  } catch {
    return false
  }
}
export function marcarPreguntado() {
  try {
    localStorage.setItem(LS_ASK, '1')
  } catch {
    /* no pasa nada */
  }
}

// Permiso actual del navegador: 'default' | 'granted' | 'denied'.
export function permisoActual() {
  return 'Notification' in window ? Notification.permission : 'denied'
}

// ¿Este dispositivo está activo? (permiso concedido + marca local de activación)
export function pushActivoLocal() {
  if (permisoActual() !== 'granted') return false
  try {
    return localStorage.getItem(LS_ON) === '1'
  } catch {
    return false
  }
}

// Activa push: pide permiso (si hace falta), saca el token y lo guarda en Firestore.
// Devuelve { ok, motivo } para que la UI muestre el mensaje correcto.
//   motivos: 'sin_socio' | 'ios_instalar' | 'no_soportado' | 'denegado'
//            | 'error_token' | 'error_guardar'
export async function activarPush() {
  const socio = useSocioStore()
  if (!socio.gymId || !socio.socioId) return { ok: false, motivo: 'sin_socio' }

  if (!(await pushSoportado())) {
    return { ok: false, motivo: iosNecesitaInstalar() ? 'ios_instalar' : 'no_soportado' }
  }

  // Permiso del navegador (cuadro nativo). Si ya estaba 'denied', no se puede.
  let permiso = permisoActual()
  if (permiso === 'default') {
    try {
      permiso = await Notification.requestPermission()
    } catch {
      permiso = 'denied'
    }
  }
  if (permiso !== 'granted') return { ok: false, motivo: 'denegado' }

  // Token del dispositivo (usa el service worker ya registrado en main.js).
  const m = await obtenerMessaging()
  if (!m) return { ok: false, motivo: 'no_soportado' }

  let token = ''
  try {
    const reg = await navigator.serviceWorker.ready
    token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  } catch {
    return { ok: false, motivo: 'error_token' }
  }
  if (!token) return { ok: false, motivo: 'error_token' }

  // Guardar el token bajo la ficha del socio (un doc por dispositivo).
  try {
    const ref = doc(db, 'gyms', socio.gymId, 'socios', socio.socioId, 'pushTokens', deviceId())
    await setDoc(ref, {
      token,
      plataforma: esIOS() ? 'ios' : 'web',
      userAgent: (navigator.userAgent || '').slice(0, 300),
      actualizado: serverTimestamp(),
    })
  } catch {
    return { ok: false, motivo: 'error_guardar' }
  }

  try {
    localStorage.setItem(LS_ON, '1')
  } catch {
    /* no pasa nada */
  }
  return { ok: true }
}

// Desactiva push: borra el token guardado de ESTE dispositivo.
export async function desactivarPush() {
  const socio = useSocioStore()
  try {
    if (socio.gymId && socio.socioId) {
      const ref = doc(db, 'gyms', socio.gymId, 'socios', socio.socioId, 'pushTokens', deviceId())
      await deleteDoc(ref)
    }
  } catch {
    /* si falla el borrado remoto, igual apagamos localmente */
  }
  // Invalida el token en FCM (mejor higiene; no es crítico si falla).
  try {
    const m = await obtenerMessaging()
    if (m) await deleteToken(m)
  } catch {
    /* no pasa nada */
  }
  try {
    localStorage.removeItem(LS_ON)
  } catch {
    /* no pasa nada */
  }
  return { ok: true }
}
