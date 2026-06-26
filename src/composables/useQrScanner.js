// useQrScanner: motor de cámara robusto para el escáner de QR.
//
// Compartido por VincularView (vincular socio) y CheckinView (check-in), que
// antes duplicaban el mismo arranque frágil: start({ facingMode: 'environment' })
// directo + clasificación de errores por substring. Eso etiquetaba mal casi todo
// como "no hay cámara" (un permiso denegado o un webview embebido caían ahí).
//
// Flujo robusto:
//   1. Detecta navegador embebido (Instagram/Facebook/TikTok/Gmail…) o ausencia
//      de la API de cámara -> mensaje guía (abrir en Chrome/Safari).
//   2. Html5Qrcode.getCameras() para ENUMERAR primero (y disparar el permiso).
//   3. Elige la trasera por label; si su .start falla, hace fallback a las demás.
//   4. Clasifica errores por e.name (DOMException), NO por el texto del mensaje.
//
// Cada vista conserva su propio estado de UI y su opción de escribir el código
// a mano (ese es el respaldo cuando la cámara no está disponible).
import { Html5Qrcode } from 'html5-qrcode'

// Patrones de User-Agent de webviews embebidos que suelen bloquear la cámara.
const PATRONES_EMBEBIDO = [
  'Instagram',
  'FBAN', 'FBAV', 'FB_IAB', 'Messenger', // Facebook / Messenger in-app
  'TikTok', 'musical_ly',
  'Line/',
  'Twitter',
  'Snapchat',
  'Pinterest',
  'GSA/', // Google app (donde se abren muchos enlaces de Gmail)
]

// Mensaje guía cuando la app vive dentro de otra app (in-app webview).
const MSG_EMBEBIDO =
  'Parece que abriste esto dentro de otra app. Para escanear, abre el enlace ' +
  'en Chrome o Safari. También puedes escribir tu código a mano.'

function detectarNavegadorEmbebido() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  return PATRONES_EMBEBIDO.some((p) => ua.includes(p))
}

// Construye un Error ya "amigable": .mensaje es lo que se muestra al socio,
// .causa es una etiqueta interna del motivo (permiso, sin-camara, embebido…).
function errorCamara(mensaje, causa) {
  const e = new Error(mensaje)
  e.mensaje = mensaje
  e.causa = causa
  return e
}

// Clasifica un error de cámara por su TIPO (e.name / DOMException), no por el
// texto del mensaje, y devuelve un mensaje claro para el socio.
function clasificar(e) {
  const name = String(e?.name || '')
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'No diste permiso para usar la cámara. Actívalo en los ajustes del navegador e inténtalo de nuevo.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'No encontramos una cámara en este dispositivo. Usa la opción de escribir tu código.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La cámara está siendo usada por otra app. Ciérrala e inténtalo de nuevo.'
  }
  return 'No pudimos iniciar la cámara. Inténtalo de nuevo o escribe tu código a mano.'
}

export function useQrScanner(elementId) {
  let instancia = null
  let procesando = false // evita callbacks duplicados de un mismo escaneo

  const config = { fps: 10, qrbox: { width: 240, height: 240 } }

  // Elige la cámara trasera por label; si no hay pista, la última (heurística
  // típica: en móviles la trasera suele listarse al final).
  function elegirTrasera(camaras) {
    const trasera = camaras.find((c) =>
      /back|rear|environment|trasera|posterior/i.test(c.label || ''),
    )
    return (trasera || camaras[camaras.length - 1]).id
  }

  async function arrancarCon(idOrConstraint, onScan) {
    instancia = new Html5Qrcode(elementId)
    await instancia.start(
      idOrConstraint,
      config,
      (texto) => {
        if (procesando) return
        procesando = true
        onScan(texto)
      },
      () => {}, // ruido normal mientras no hay QR; lo ignoramos
    )
  }

  // Inicia la cámara con el flujo robusto. Lanza un Error con .mensaje listo
  // para mostrar si no se pudo (la vista lo asigna a su propio `error`).
  async function iniciar(onScan) {
    procesando = false

    // 1) Sin API de cámara o webview embebido -> mensaje guía, no "sin cámara".
    const sinApi =
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    if (sinApi || detectarNavegadorEmbebido()) {
      throw errorCamara(MSG_EMBEBIDO, 'embebido')
    }

    // 2) Enumerar cámaras primero (también dispara el prompt de permiso).
    let camaras
    try {
      camaras = await Html5Qrcode.getCameras()
    } catch (e) {
      throw errorCamara(clasificar(e), e?.name || 'permiso')
    }
    if (!camaras || camaras.length === 0) {
      throw errorCamara(
        'No encontramos una cámara en este dispositivo. Usa la opción de escribir tu código.',
        'sin-camara',
      )
    }

    // 3) Probar la trasera; si falla (y no fue permiso), fallback a las demás.
    const traseraId = elegirTrasera(camaras)
    const orden = [traseraId, ...camaras.map((c) => c.id).filter((id) => id !== traseraId)]
    let ultimoError = null
    for (const id of orden) {
      try {
        await arrancarCon(id, onScan)
        return // arrancó OK
      } catch (e) {
        ultimoError = e
        await liberar() // limpia la instancia fallida antes de reintentar
        procesando = false
        // Permiso denegado: probar otra cámara no ayuda, cortamos.
        if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') break
      }
    }
    throw errorCamara(clasificar(ultimoError), ultimoError?.name || 'inicio')
  }

  // Detiene el escaneo y libera el hardware (stop + clear). Idempotente.
  async function liberar() {
    if (!instancia) return
    try {
      if (instancia.isScanning) await instancia.stop()
      instancia.clear()
    } catch (e) {
      // El objetivo es liberar el hardware; ignoramos errores al detener.
      console.warn('Error al liberar la cámara:', e)
    } finally {
      instancia = null
    }
  }

  return { iniciar, liberar }
}
