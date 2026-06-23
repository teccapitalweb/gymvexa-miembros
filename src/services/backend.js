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
