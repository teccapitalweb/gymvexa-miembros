// Interpreta el snapshot membresiaActual del socio en algo que la UI pueda mostrar.
// membresiaActual trae (entre otros): plan, fechaFin, estado de vigencia.
//
// Como los nombres/forma exacta pueden variar, somos tolerantes:
//  - vigencia: por campo de estado ('vigente'/'activa'/'al_corriente') y/o por fechaFin.
//  - fechaFin puede ser un Timestamp de Firestore, Date, número (ms) o string ISO.

const ESTADOS_VIGENTES = ['vigente', 'activa', 'activo', 'al_corriente', 'al corriente']
const ESTADOS_VENCIDOS = ['vencida', 'vencido', 'expirada', 'expirado', 'inactiva', 'inactivo']

// Convierte distintos formatos de fecha a un objeto Date (o null).
function aFecha(valor) {
  if (!valor) return null
  // Timestamp de Firestore
  if (typeof valor.toDate === 'function') return valor.toDate()
  if (valor instanceof Date) return valor
  if (typeof valor === 'number') return new Date(valor)
  if (typeof valor === 'string') {
    const d = new Date(valor)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // Objeto plano { seconds, nanoseconds }
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000)
  return null
}

// Días enteros entre hoy y la fecha (positivo = futuro, negativo = pasado).
function diasHasta(fecha) {
  if (!fecha) return null
  const msPorDia = 24 * 60 * 60 * 1000
  const hoy = new Date()
  const a = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const b = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  return Math.round((b - a) / msPorDia)
}

// Devuelve { vigente, dias, fechaFin, plan, etiqueta, tono }.
// tono: 'verde' | 'ambar' | 'rojo' | 'gris' — para colorear la tarjeta.
export function interpretarMembresia(membresia) {
  if (!membresia) {
    return {
      vigente: false,
      dias: null,
      fechaFin: null,
      plan: null,
      etiqueta: 'Sin membresía',
      tono: 'gris',
    }
  }

  const plan = membresia.plan ?? membresia.nombrePlan ?? null
  const fechaFin = aFecha(membresia.fechaFin ?? membresia.fechaVencimiento ?? null)
  const dias = diasHasta(fechaFin)

  const estadoTexto = String(membresia.estado ?? '').toLowerCase().trim()
  let vigente
  if (ESTADOS_VIGENTES.includes(estadoTexto)) {
    vigente = true
  } else if (ESTADOS_VENCIDOS.includes(estadoTexto)) {
    vigente = false
  } else if (dias !== null) {
    // Sin estado claro: nos basamos en la fecha de fin.
    vigente = dias >= 0
  } else {
    vigente = false
  }

  // Si por fecha ya venció, manda la fecha aunque el estado dijera vigente.
  if (dias !== null && dias < 0) vigente = false

  let etiqueta
  let tono
  if (!vigente) {
    etiqueta = 'Membresía vencida'
    tono = 'rojo'
  } else if (dias === null) {
    etiqueta = 'Membresía vigente'
    tono = 'verde'
  } else if (dias === 0) {
    etiqueta = 'Vence hoy'
    tono = 'ambar'
  } else if (dias <= 5) {
    etiqueta = `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`
    tono = 'ambar'
  } else {
    etiqueta = `Vence en ${dias} días`
    tono = 'verde'
  }

  return { vigente, dias, fechaFin, plan, etiqueta, tono }
}

export function useMembresia() {
  return { interpretarMembresia }
}
