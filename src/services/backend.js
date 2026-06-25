// src/services/backend.js
// Cliente del backend de Gymvexa (Railway) para la App de Miembros.
//
// SEGURIDAD: la app NUNCA usa una api-key (es un cliente público y se filtraría).
// La autenticación es por el ID TOKEN de Firebase del propio usuario: el backend
// lo verifica, comprueba email_verified, busca la ficha del socio por email y le
// asigna el custom claim { gymId, socioId, rol: "socio" }. Aquí solo mandamos el
// token y, si todo sale bien, refrescamos el token para activar el claim nuevo.

import { auth } from '../firebase'

// URL del backend. Configurable por VITE_BACKEND_URL; cae a la de producción.
const BACKEND_URL = (
  import.meta.env?.VITE_BACKEND_URL ||
  'https://gymvexa-backend-production.up.railway.app'
).replace(/\/+$/, '') // sin barra final

const ENDPOINT_VINCULAR = `${BACKEND_URL}/api/vincular-socio`
// Vinculación POR CÓDIGO (QR / tecleado) que genera el panel en la ficha del socio.
const ENDPOINT_VINCULAR_CODIGO = `${BACKEND_URL}/api/socios/vincular`
// Check-in del socio: el backend (Admin SDK) registra la asistencia de forma
// segura (valida membresía/anti-duplicado) SIN que el cliente toque Firestore.
const ENDPOINT_CHECKIN = `${BACKEND_URL}/api/socios/checkin`
// Cumpleaños del día en el gym: el backend (Admin SDK) detecta quién cumple hoy
// y devuelve solo nombres (la app no puede leer fichas de otros socios).
const ENDPOINT_CUMPLEANOS = `${BACKEND_URL}/api/socios/cumpleanos-hoy`
// Foro: avisa al backend de un like/comentario para que CREE la notificación al
// autor del post (las reglas no dejan que el cliente cree notificaciones).
const ENDPOINT_FORO_NOTIFICAR = `${BACKEND_URL}/api/foro/notificar`
// Progreso + rachas del socio: el backend (Admin SDK) lee las asistencias (que la
// app NO puede leer directo) y devuelve el resumen ya calculado (racha semanal,
// visitas, días entrenados, promedio…). El cliente solo lo pinta.
const ENDPOINT_PROGRESO = `${BACKEND_URL}/api/socios/progreso`

// Construye un Error con status + mensaje legible (para que la UI ramifique).
function errorBackend(mensaje, { status = null, data = null, red = false } = {}) {
  const e = new Error(mensaje)
  e.status = status
  e.data = data
  e.red = red
  return e
}

// Mensaje de respaldo si el backend no devolvió uno propio.
function mensajePorStatus(status) {
  switch (status) {
    case 401:
      return 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.'
    case 403:
      return 'Debes verificar tu correo electrónico antes de vincular tu cuenta.'
    case 404:
      return 'Tu correo no está registrado como socio.'
    case 409:
      return 'No pudimos vincular tu cuenta.'
    default:
      return 'No pudimos completar la vinculación. Inténtalo más tarde.'
  }
}

/**
 * Vincula al usuario autenticado con su ficha de socio en el backend.
 *
 * @param {{ gymId?: string }} [opciones] - gymId SOLO como pista de desambiguación
 *        (por ahora no se envía; el backend resuelve por email del token).
 * @returns {Promise<{ ok: true, gymId: string|null, socioId: string|null }>}
 * @throws {Error} con `.status` (404/403/409/401 o null en red) y `.message` legible.
 */
export async function vincularSocioEnBackend(opciones = {}) {
  const user = auth.currentUser
  if (!user) {
    throw errorBackend('No hay una sesión activa. Vuelve a iniciar sesión.')
  }

  // 1) ID token actual del usuario.
  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    throw errorBackend('No pudimos validar tu sesión. Inténtalo de nuevo.')
  }

  // 2) Cuerpo: vacío por defecto; gymId solo si se pasa como pista.
  const body = {}
  if (opciones.gymId) body.gymId = opciones.gymId

  // 3) POST al backend.
  let res
  try {
    res = await fetch(ENDPOINT_VINCULAR, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw errorBackend(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { red: true },
    )
  }

  // Parseo tolerante (la respuesta podría no traer JSON).
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  // 4a) Éxito: refresca el token para que el claim nuevo quede activo.
  if (res.ok) {
    try {
      await user.getIdToken(true)
    } catch {
      // No crítico: el claim ya quedó asignado; se activará en el próximo refresco.
    }
    return {
      ok: true,
      gymId: data?.gymId ?? null,
      socioId: data?.socioId ?? null,
    }
  }

  // 4b) Error: status + mensaje legible (el del backend si vino).
  throw errorBackend(data?.error || mensajePorStatus(res.status), {
    status: res.status,
    data,
  })
}

// --------------------------------------------------------------------------
// Vinculación POR CÓDIGO (QR de la ficha del socio o código tecleado).
// --------------------------------------------------------------------------

// Normaliza un código a su forma canónica: MAYÚSCULAS y solo A-Z/0-9
// (quita guion, espacios y cualquier separador). El backend espera 8 chars.
export function normalizarCodigo(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

// Extrae el código del contenido de un QR. El panel codifica un deep link
// https://gymvexa-miembros.vercel.app/vincular?c=CODIGO, pero toleramos también
// que el QR contenga solo el código suelto.
export function extraerCodigoDeQR(texto) {
  const t = String(texto ?? '').trim()
  if (!t) return ''

  // 1) ¿Es una URL? Leemos el parámetro ?c=.
  try {
    const url = new URL(t)
    const c = url.searchParams.get('c')
    if (c) return normalizarCodigo(c)
  } catch {
    // No es una URL absoluta; seguimos con heurísticas.
  }

  // 2) ¿Trae un "c=..." aunque no parsee como URL?
  const m = t.match(/[?&]c=([^&\s]+)/i)
  if (m) return normalizarCodigo(m[1])

  // 3) Asumimos que el texto ES el código.
  return normalizarCodigo(t)
}

// Mensaje de respaldo por status para el endpoint de vinculación por código.
function mensajePorCodigo(status) {
  switch (status) {
    case 400:
      return 'El código no es válido. Revísalo e inténtalo de nuevo.'
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.'
    case 403:
      return 'Debes verificar tu correo electrónico antes de vincular tu cuenta.'
    case 404:
      return 'Ese código no existe. Pídele a tu gimnasio que te muestre tu QR de nuevo.'
    case 409:
      return 'Ese código ya se usó o expiró. Pídele uno nuevo a tu gimnasio.'
    default:
      return 'No pudimos vincular tu cuenta. Inténtalo más tarde.'
  }
}

/**
 * Vincula al usuario autenticado con su ficha de socio usando el CÓDIGO del QR
 * (o tecleado). POST /api/socios/vincular { codigo } con Bearer <idToken>.
 *
 * NO refresca el token aquí: tras un OK, la capa de UI debe llamar a
 * auth.refrescarClaims(true) para activar el claim nuevo y poder leer la ficha.
 *
 * @param {string} codigo - Código de 8 chars (con o sin guion; se normaliza).
 * @returns {Promise<{ ok: true, gymId: string|null, socioId: string|null, mensaje: string }>}
 * @throws {Error} con `.status` (400/401/403/404/409 o null en red) y `.message` legible.
 */
export async function vincularSocioPorCodigo(codigo) {
  const user = auth.currentUser
  if (!user) {
    throw errorBackend('No hay una sesión activa. Vuelve a iniciar sesión.', {
      status: 401,
    })
  }

  const codigoNorm = normalizarCodigo(codigo)
  if (codigoNorm.length !== 8) {
    throw errorBackend('El código debe tener 8 caracteres (formato XXXX-XXXX).', {
      status: 400,
    })
  }

  // ID token actual del usuario.
  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    throw errorBackend('No pudimos validar tu sesión. Inténtalo de nuevo.', {
      status: 401,
    })
  }

  let res
  try {
    res = await fetch(ENDPOINT_VINCULAR_CODIGO, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codigo: codigoNorm }),
    })
  } catch {
    throw errorBackend(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { red: true },
    )
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (res.ok) {
    return {
      ok: true,
      gymId: data?.gymId ?? null,
      socioId: data?.socioId ?? null,
      mensaje: data?.mensaje || data?.message || '¡Listo! Tu cuenta quedó vinculada.',
    }
  }

  throw errorBackend(data?.error || data?.mensaje || mensajePorCodigo(res.status), {
    status: res.status,
    data,
  })
}

// --------------------------------------------------------------------------
// Check-in del socio (registro de asistencia vía backend).
// --------------------------------------------------------------------------

// Clave de idempotencia por check-in: evita duplicados por doble toque / reintento
// de red (el backend descarta una repetición con la misma clave).
function generarIdempotencyKey() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {
    // Sin crypto.randomUUID disponible; usamos un respaldo simple.
  }
  return `ck-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Mensaje de respaldo por status para el endpoint de check-in.
function mensajePorCheckin(status) {
  switch (status) {
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.'
    case 403:
      return 'Tu gimnasio está suspendido o tu acceso venció. Acércate a recepción.'
    case 404:
      return 'No encontramos tu ficha de socio. Contacta a tu gimnasio.'
    default:
      return 'No pudimos registrar tu asistencia. Inténtalo de nuevo.'
  }
}

/**
 * Registra la asistencia (check-in) del socio autenticado.
 * POST /api/socios/checkin con Bearer <idToken>. El backend toma gymId y socioId
 * del CLAIM del token (no se envían) y valida membresía + anti-duplicado.
 *
 * @param {{ metodoCheckin?: string, idempotencyKey?: string }} [opciones]
 * @returns {Promise<{ ok: true, tipo: 'entrada'|'salida', registrado: boolean, duracionMinutos: number|null, membresiaVigente: boolean, nombre: string, mensaje: string }>}
 *          `tipo` indica si fue entrada o salida (toggle con el mismo QR);
 *          `duracionMinutos` viene en la salida; `registrado` es false si fue duplicado.
 * @throws {Error} con `.status` (403/404/401/500 o null en red) y `.message` legible.
 */
export async function registrarCheckin({ metodoCheckin = 'qr_app', idempotencyKey } = {}) {
  const user = auth.currentUser
  if (!user) {
    throw errorBackend('No hay una sesión activa. Vuelve a iniciar sesión.', {
      status: 401,
    })
  }

  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    throw errorBackend('No pudimos validar tu sesión. Inténtalo de nuevo.', {
      status: 401,
    })
  }

  // Una clave de idempotencia por cada check-in (si no se pasó una explícita).
  const body = {
    metodoCheckin,
    idempotencyKey: idempotencyKey || generarIdempotencyKey(),
  }

  let res
  try {
    res = await fetch(ENDPOINT_CHECKIN, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw errorBackend(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { red: true },
    )
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (res.ok) {
    return {
      ok: true,
      // 'entrada' por defecto si el backend no lo especifica (compat).
      tipo: data?.tipo === 'salida' ? 'salida' : 'entrada',
      // Default true: solo es duplicado si el backend lo dice explícitamente.
      registrado: data?.registrado !== false,
      duracionMinutos:
        typeof data?.duracionMinutos === 'number' ? data.duracionMinutos : null,
      membresiaVigente: !!data?.membresiaVigente,
      nombre: data?.nombre || '',
      mensaje: data?.mensaje || data?.message || '',
    }
  }

  throw errorBackend(data?.error || data?.mensaje || mensajePorCheckin(res.status), {
    status: res.status,
    data,
  })
}

// --------------------------------------------------------------------------
// Cumpleaños del día en el gym (comunidad).
// --------------------------------------------------------------------------

/**
 * Consulta quién cumple años HOY en el gimnasio del socio autenticado.
 * GET /api/socios/cumpleanos-hoy con Bearer <idToken>. El backend (Admin SDK)
 * los calcula y devuelve SOLO el nombre + un flag `esYo` (las reglas no dejan
 * que la app lea las fichas de otros socios, así que esto pasa por el servidor).
 *
 * Degrada en silencio: si no hay sesión o el backend falla, devuelve [] para no
 * romper la campanita (el cumpleañero sigue viendo su felicitación propia, que
 * la app calcula localmente sin depender de este endpoint).
 *
 * @returns {Promise<Array<{ nombre: string, esYo: boolean }>>}
 */
export async function obtenerCumpleanosHoy() {
  const user = auth.currentUser
  if (!user) return []

  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    return []
  }

  let res
  try {
    res = await fetch(ENDPOINT_CUMPLEANOS, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    })
  } catch {
    return [] // sin conexión: la campanita sigue con la felicitación local
  }

  if (!res.ok) return []

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!data?.ok || !Array.isArray(data.cumpleaneros)) return []

  // Solo entradas con nombre real; normalizamos esYo a booleano.
  return data.cumpleaneros
    .filter((c) => c && String(c.nombre || '').trim())
    .map((c) => ({ nombre: String(c.nombre).trim(), esYo: c.esYo === true }))
}

// --------------------------------------------------------------------------
// Foro: notificar un like/comentario (el backend crea la notificación).
// --------------------------------------------------------------------------

/**
 * Avisa al backend de que el socio dio like o comentó un post, para que CREE la
 * notificación al AUTOR (las reglas no dejan que el cliente la cree). El backend
 * resuelve el destinatario leyendo el propio post y nunca notifica al autor de
 * sí mismo. "Fire and forget": degrada en silencio si falla, porque la noti es
 * secundaria y NO debe romper el like/comentario que ya se guardó en Firestore.
 *
 * @param {string} postId - id del post reaccionado/comentado.
 * @param {'like'|'comentario'} tipo - tipo de aviso.
 * @returns {Promise<void>}
 */
export async function notificarForo(postId, tipo) {
  const user = auth.currentUser
  if (!user || !postId) return

  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    return
  }

  try {
    await fetch(ENDPOINT_FORO_NOTIFICAR, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId, tipo }),
    })
  } catch {
    // Silencioso a propósito: el aviso es secundario.
  }
}

// --------------------------------------------------------------------------
// Progreso + rachas del socio.
// --------------------------------------------------------------------------

// Clave de la rutina activa del socio en localStorage (la misma que usa RutinasView).
const STORAGE_RUTINA_ACTIVA = 'gv-rutina-activa'

/**
 * Lee la META semanal (nº de días programados) de la rutina activa del socio que
 * vive en localStorage. Si hay una rutina activa con días asignados, devuelve esa
 * cantidad para que la racha use la meta REAL del socio; si no, devuelve null y el
 * backend aplica su meta por defecto. Nunca lanza (degrada a null).
 *
 * @returns {number|null} días/semana programados (>=1) o null si no hay rutina activa.
 */
export function metaSemanalDeRutinaActiva() {
  try {
    const raw = localStorage.getItem(STORAGE_RUTINA_ACTIVA)
    if (!raw) return null
    // Compat: la versión vieja guardaba solo el id como string plano (sin días).
    if (raw[0] !== '{') return null
    const obj = JSON.parse(raw)
    if (!obj || !obj.rutinaId) return null
    // Nº de días programados: claves de asignacion {diaId: sesion}; respaldo: dias[].
    const porAsignacion =
      obj.asignacion && typeof obj.asignacion === 'object'
        ? Object.keys(obj.asignacion).length
        : 0
    const porDias = Array.isArray(obj.dias) ? obj.dias.length : 0
    const n = porAsignacion || porDias
    return n >= 1 ? n : null
  } catch {
    return null
  }
}

// Mensaje de respaldo por status para el endpoint de progreso.
function mensajePorProgreso(status) {
  switch (status) {
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.'
    case 403:
      return 'No pudimos verificar tu acceso. Acércate a recepción.'
    case 404:
      return 'No encontramos tu ficha de socio. Contacta a tu gimnasio.'
    default:
      return 'No pudimos cargar tu progreso. Inténtalo de nuevo.'
  }
}

/**
 * Obtiene el resumen de PROGRESO + RACHAS del socio autenticado.
 * GET /api/socios/progreso con Bearer <idToken>. El backend toma gymId/socioId del
 * CLAIM del token (no se envían), lee las asistencias con Admin SDK y calcula todo.
 *
 * Si el socio tiene una rutina activa con días programados, se manda ?meta=N para
 * que la racha use SU meta real (días/semana de su plan). Si no, se omite y el
 * backend usa su meta por defecto.
 *
 * @param {{ meta?: number }} [opciones] - meta semanal explícita (override). Si no
 *        se pasa, se infiere de la rutina activa en localStorage.
 * @returns {Promise<{ totalVisitas:number, visitasEsteMes:number,
 *          visitasEstaSemana:number, diasEntrenados:number, rachaActual:number,
 *          rachaMasLarga:number, promedioPorSemana:number, primeraVisita:string|null,
 *          ultimaVisita:string|null, meta:number }>}
 * @throws {Error} con `.status` (401/403/404/500 o null en red) y `.message` legible.
 */
export async function obtenerProgreso(opciones = {}) {
  const user = auth.currentUser
  if (!user) {
    throw errorBackend('No hay una sesión activa. Vuelve a iniciar sesión.', {
      status: 401,
    })
  }

  let idToken
  try {
    idToken = await user.getIdToken()
  } catch {
    throw errorBackend('No pudimos validar tu sesión. Inténtalo de nuevo.', {
      status: 401,
    })
  }

  // Meta: la explícita si vino; si no, la de la rutina activa del socio.
  const meta =
    typeof opciones.meta === 'number' && opciones.meta >= 1
      ? Math.floor(opciones.meta)
      : metaSemanalDeRutinaActiva()

  let url = ENDPOINT_PROGRESO
  if (meta) url += `?meta=${encodeURIComponent(meta)}`

  let res
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    })
  } catch {
    throw errorBackend(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { red: true },
    )
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (res.ok) {
    const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      totalVisitas: n(data?.totalVisitas),
      visitasEsteMes: n(data?.visitasEsteMes),
      visitasEstaSemana: n(data?.visitasEstaSemana),
      diasEntrenados: n(data?.diasEntrenados),
      rachaActual: n(data?.rachaActual),
      rachaMasLarga: n(data?.rachaMasLarga),
      promedioPorSemana: n(data?.promedioPorSemana),
      primeraVisita: data?.primeraVisita ?? null,
      ultimaVisita: data?.ultimaVisita ?? null,
      // La meta efectiva la decide el backend; si no vino, refleja la enviada o 3.
      meta: n(data?.meta) || meta || 3,
    }
  }

  throw errorBackend(data?.error || data?.mensaje || mensajePorProgreso(res.status), {
    status: res.status,
    data,
  })
}
