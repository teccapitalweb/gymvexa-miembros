// Store de check-in por QR (Pinia).
// El socio escanea el QR del gym y el registro de asistencia lo hace el BACKEND
// (POST /api/socios/checkin con Admin SDK): valida membresía y anti-duplicado en
// el servidor y NO toca el dinero de la ficha. El cliente ya NO escribe a Firestore.
//
// El QR del gym (en Fase 1 es el gymId como texto, ej "gym-demo") solo confirma que
// el socio está en SU gimnasio; el backend identifica socio + gym por el CLAIM del
// token, así que no necesita datos del QR para registrar la asistencia.

import { defineStore } from 'pinia'
import { useSocioStore } from './socio'
import { registrarCheckin } from '../services/backend'

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    procesando: false,
    ultimoResultado: null, // { ok, registrado, membresiaVigente, mensaje, nombre, fechaHora }
    error: '',
  }),

  actions: {
    // textoQR: el contenido del QR escaneado (el gymId del gimnasio).
    // Devuelve { ok, registrado, membresiaVigente, mensaje, nombre, fechaHora }.
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

      // Guard de cliente: el QR del gym debe ser el del SU gimnasio. El registro
      // real lo hace el backend con el gymId/socioId del claim (no del QR).
      if (socio.gymId && gymIdQR !== socio.gymId) {
        return this._fallo('Este QR no corresponde a tu gimnasio.')
      }

      this.procesando = true
      try {
        // El backend valida membresía y anti-duplicado; genera idempotencyKey solo.
        const r = await registrarCheckin({ metodoCheckin: 'qr_app' })

        const membresiaVigente = !!r.membresiaVigente
        const registrado = r.registrado !== false
        const nombre = r.nombre || socio.nombreSocio || socio.datos?.nombre || ''

        // Mensaje: el del backend si vino; si no, uno acorde al estado.
        let mensaje = r.mensaje
        if (!mensaje) {
          if (!registrado) {
            mensaje = 'Ya registraste tu asistencia hace un momento.'
          } else {
            mensaje = membresiaVigente
              ? 'Acceso al corriente.'
              : 'Tu membresía está vencida. Acércate a recepción.'
          }
        }

        const resultado = {
          ok: true,
          registrado,
          membresiaVigente,
          mensaje,
          nombre,
          fechaHora: new Date(),
        }
        this.ultimoResultado = resultado
        return resultado
      } catch (e) {
        // Errores legibles ya vienen mapeados desde el servicio del backend.
        return this._fallo(
          e?.message || 'No pudimos registrar tu asistencia. Inténtalo de nuevo.',
        )
      } finally {
        this.procesando = false
      }
    },

    _fallo(mensaje) {
      this.error = mensaje
      const r = {
        ok: false,
        registrado: false,
        membresiaVigente: false,
        mensaje,
      }
      this.ultimoResultado = r
      return r
    },

    limpiarResultado() {
      this.ultimoResultado = null
      this.error = ''
    },
  },
})
