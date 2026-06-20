// Store de check-in por QR (Pinia).
// El socio escanea el QR del gym (en Fase 1 el QR es el gymId como texto, ej "gym-demo").
// Solo puede registrar asistencia en SU propio gym.

import { defineStore } from 'pinia'
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useSocioStore } from './socio'
import { interpretarMembresia } from '../composables/useMembresia'

// Ventana anti-duplicado: no registrar otra entrada dentro de estos minutos.
const MINUTOS_ANTIDUPLICADO = 2

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    procesando: false,
    ultimoResultado: null, // { ok, membresiaVigente, mensaje, nombre, fechaHora }
    error: '',
  }),

  actions: {
    // textoQR: el contenido del QR escaneado (el gymId del gimnasio).
    // Devuelve { ok, membresiaVigente, mensaje }.
    async registrarAsistenciaPorQR(textoQR) {
      const socio = useSocioStore()
      this.error = ''

      const gymIdQR = String(textoQR ?? '').trim()
      if (!gymIdQR) {
        return this._fallo('El código QR está vacío o no es válido.')
      }

      if (!socio.estaVinculado) {
        return this._fallo('Tu cuenta aún no está vinculada a un gimnasio.')
      }

      // El socio solo puede hacer check-in en SU gym.
      if (gymIdQR !== socio.gymId) {
        return this._fallo('Este QR no corresponde a tu gimnasio.')
      }

      this.procesando = true
      try {
        // Anti-duplicado: revisa la última asistencia del socio.
        const yaRegistrado = await this._registroReciente(socio.gymId, socio.socioId)
        if (yaRegistrado) {
          return this._fallo('Ya registraste tu entrada hace un momento.')
        }

        const membresia = interpretarMembresia(socio.estadoMembresia)
        const membresiaVigente = membresia.vigente

        const batch = writeBatch(db)

        const asistenciaRef = doc(collection(db, 'gyms', socio.gymId, 'asistencias'))
        batch.set(asistenciaRef, {
          socioId: socio.socioId,
          socioNombre: socio.nombreSocio || socio.datos?.nombre || '',
          fechaHora: serverTimestamp(),
          metodoCheckin: 'qr_app',
          membresiaVigente,
        })

        const socioRef = doc(db, 'gyms', socio.gymId, 'socios', socio.socioId)
        batch.update(socioRef, {
          totalVisitas: increment(1),
          ultimaVisita: serverTimestamp(),
        })

        await batch.commit()

        const resultado = {
          ok: true,
          membresiaVigente,
          mensaje: membresiaVigente
            ? 'Acceso al corriente.'
            : 'Tu membresía está vencida. Acércate a recepción.',
          nombre: socio.nombreSocio || socio.datos?.nombre || '',
          fechaHora: new Date(),
        }
        this.ultimoResultado = resultado
        return resultado
      } catch (e) {
        return this._fallo(this._mensajeError(e))
      } finally {
        this.procesando = false
      }
    },

    // ¿El socio ya registró asistencia dentro de la ventana anti-duplicado?
    async _registroReciente(gymId, socioId) {
      try {
        const q = query(
          collection(db, 'gyms', gymId, 'asistencias'),
          where('socioId', '==', socioId),
          orderBy('fechaHora', 'desc'),
          limit(1),
        )
        const snap = await getDocs(q)
        if (snap.empty) return false

        const ultima = snap.docs[0].data()
        const ts = ultima.fechaHora
        const fecha = typeof ts?.toDate === 'function' ? ts.toDate() : null
        if (!fecha) return false

        const minutos = (Date.now() - fecha.getTime()) / 60000
        return minutos < MINUTOS_ANTIDUPLICADO
      } catch (e) {
        // Si la consulta falla (p. ej. falta índice), no bloqueamos el check-in;
        // dejamos que el registro proceda y reportamos en consola.
        console.warn('No se pudo verificar duplicado de asistencia:', e)
        return false
      }
    },

    _fallo(mensaje) {
      this.error = mensaje
      const r = { ok: false, membresiaVigente: false, mensaje }
      this.ultimoResultado = r
      return r
    },

    limpiarResultado() {
      this.ultimoResultado = null
      this.error = ''
    },

    _mensajeError(e) {
      const code = e?.code || ''
      if (code === 'permission-denied') {
        return 'No tienes permiso para registrar la asistencia. Contacta a tu gimnasio.'
      }
      if (code === 'unavailable') {
        return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
      }
      return 'No pudimos registrar tu asistencia. Inténtalo de nuevo.'
    },
  },
})
