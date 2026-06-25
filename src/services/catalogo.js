// Lectura del CATÁLOGO de ejercicios del gym del socio (solo lectura).
//
// Cada ejercicio base vive en Firestore en gyms/{gymId}/ejercicios/base_<baseKey>
// (la regla de Firestore ya permite que el socio LEA el catálogo de SU gym). Las
// rutinas prediseñadas referencian cada ejercicio por `baseKey` y traen un SNAPSHOT
// de nombre/grupo, así que si el ejercicio no está en el catálogo (gym sin catálogo
// importado, o un movimiento aún no sembrado) la UI degrada con gracia usando ese
// snapshot — esta función simplemente devuelve null y el llamador hace el fallback.

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Normaliza el grupo secundario a un arreglo de strings (puede venir como string,
// arreglo, o ausente). Limpia vacíos.
function aArreglo(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean)
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

/**
 * Lee un ejercicio del catálogo del gym por su baseKey.
 * Documento: gyms/{gymId}/ejercicios/base_<baseKey>.
 *
 * @param {string} gymId - id del gym del socio (del claim/contexto vinculado).
 * @param {string} baseKey - clave base del ejercicio (ej. 'sentadilla_barra').
 * @returns {Promise<null | {
 *   id: string, nombre: string, grupoMuscular: string|null,
 *   grupoMuscularSecundario: string[], tipo: string|null, equipo: string|null,
 *   descripcion: string
 * }>} Datos normalizados, o `null` si faltan datos, no existe el doc, o falla la
 *     lectura (el llamador hace fallback al snapshot de la rutina; nunca lanza).
 */
export async function leerEjercicioPorBaseKey(gymId, baseKey) {
  if (!gymId || !baseKey) return null

  try {
    const ref = doc(db, 'gyms', gymId, 'ejercicios', `base_${baseKey}`)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const d = snap.data() || {}
    return {
      id: snap.id,
      // Campos del catálogo (con respaldos tolerantes por si el naming difiere).
      nombre: d.nombre ?? d.nombreEjercicio ?? '',
      grupoMuscular: d.grupoMuscular ?? d.grupo ?? null,
      grupoMuscularSecundario: aArreglo(
        d.grupoMuscularSecundario ?? d.gruposSecundarios ?? d.grupoSecundario,
      ),
      tipo: d.tipo ?? null,
      equipo: d.equipo ?? d.equipamiento ?? null,
      descripcion: d.descripcion ?? '',
    }
  } catch {
    // Sin conexión / permiso / cualquier fallo: degradar a null (fallback en UI).
    return null
  }
}
