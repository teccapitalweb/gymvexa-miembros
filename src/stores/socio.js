// Store del SOCIO vinculado al usuario logueado (Pinia).
// Resuelve la ficha del socio por su email (multi-tenant) y la mantiene en vivo.
// App de solo lectura de los propios datos del socio.

import { defineStore } from 'pinia'
import {
  collectionGroup,
  query,
  where,
  limit,
  getDocs,
  doc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'
import { vincularSocioEnBackend } from '../services/backend'

// Mantenemos la función de baja del listener fuera del state (no es serializable).
let _unsubSocio = null

export const useSocioStore = defineStore('socio', {
  state: () => ({
    socioId: null,
    gymId: null,
    datos: null,          // documento del socio (datos crudos de Firestore)
    cargando: false,      // true mientras resolvemos la vinculación
    resuelto: false,      // true cuando ya intentamos vincular al menos una vez
    noVinculado: false,   // true si el email no corresponde a ningún socio
    error: '',            // mensaje de error legible en español

    // --- Estado del CLAIM de socio (credencial segura para ESCRITURAS) ---
    // La lectura de datos funciona aunque el claim falle; el claim es necesario
    // para guardar rutinas/entrenamientos en el futuro.
    claimOk: false,       // true si el backend asignó/confirmó el claim
    claimEstado: 'pendiente', // 'pendiente'|'ok'|'no_verificado'|'conflicto'|'sesion'|'error'|'no_socio'
    avisoClaim: '',       // aviso amable cuando el claim no se pudo asignar (no bloquea lectura)
  }),

  getters: {
    datosSocio: (state) => state.datos,
    estaVinculado: (state) => !!state.socioId && !!state.gymId && !state.noVinculado,

    // membresiaActual es un snapshot con plan, fechaFin, estado de vigencia, etc.
    estadoMembresia: (state) => state.datos?.membresiaActual ?? null,

    // Dinero en centavos -> pesos (number). La UI formatea con centavosAPesos.
    saldoPesos: (state) => (Number(state.datos?.saldoActual) || 0) / 100,
    deudaPesos: (state) => (Number(state.datos?.deudaActual) || 0) / 100,

    nombreSocio: (state) => state.datos?.nombre ?? '',
  },

  actions: {
    // Busca la ficha del socio por el email del usuario autenticado.
    // Usa collectionGroup sobre "socios" porque no conocemos el gymId de antemano.
    async vincularSocio() {
      const auth = useAuthStore()
      const email = auth.correo
      if (!email) {
        this.error = 'No hay una sesión activa.'
        return
      }

      // Si ya está vinculado al mismo socio, no repetimos.
      if (this.estaVinculado && this.datos?.email === email) return

      this.cargando = true
      this.error = ''
      this.noVinculado = false

      // Asegura el claim de socio ANTES de leer/suscribir, para que el token ya
      // lo lleve. Nunca rompe el flujo de lectura (su propio try/catch interno).
      await this._asegurarClaim()

      try {
        const q = query(
          collectionGroup(db, 'socios'),
          where('email', '==', email),
          limit(1),
        )
        const snap = await getDocs(q)

        if (snap.empty) {
          this.noVinculado = true
          this.socioId = null
          this.gymId = null
          this.datos = null
          return
        }

        const docSnap = snap.docs[0]
        // El gymId se obtiene del path: gyms/{gymId}/socios/{socioId}
        const gymId = docSnap.ref.parent.parent?.id ?? null

        this.socioId = docSnap.id
        this.gymId = gymId
        this.datos = { id: docSnap.id, ...docSnap.data() }

        // Abrimos el listener en vivo para saldo/membresía.
        this.suscribirSocio()
      } catch (e) {
        this.error = this._mensajeError(e)
      } finally {
        this.cargando = false
        this.resuelto = true
      }
    },

    // Llama al backend para asignar/confirmar el claim { gymId, socioId, rol }.
    // Refleja el resultado en claimOk/claimEstado/avisoClaim SIN lanzar: la
    // lectura de datos debe seguir funcionando aunque el claim no se asigne.
    async _asegurarClaim() {
      this.claimEstado = 'pendiente'
      this.avisoClaim = ''
      this.claimOk = false
      try {
        await vincularSocioEnBackend()
        this.claimOk = true
        this.claimEstado = 'ok'
      } catch (e) {
        const status = e?.status ?? null
        if (status === 404) {
          // El backend no encontró socio con este correo. El lookup de abajo lo
          // reflejará como "noVinculado"; no mostramos aviso adicional.
          this.claimEstado = 'no_socio'
        } else if (status === 403) {
          this.claimEstado = 'no_verificado'
          this.avisoClaim =
            'Verifica tu correo electrónico para activar el guardado de tus entrenamientos.'
        } else if (status === 409) {
          this.claimEstado = 'conflicto'
          this.avisoClaim =
            e?.message ||
            'No pudimos vincular tu cuenta. Revisa el mensaje e inténtalo de nuevo.'
        } else if (status === 401) {
          this.claimEstado = 'sesion'
          this.avisoClaim =
            'Tu sesión expiró. Cierra sesión y vuelve a entrar para sincronizar tu cuenta.'
        } else {
          this.claimEstado = 'error'
          this.avisoClaim =
            'No pudimos sincronizar tu cuenta. Puedes ver tus datos, pero guardar entrenamientos podría no estar disponible aún.'
        }
      }
    },

    // Reintenta solo la vinculación del claim (sin recargar todo).
    async reintentarClaim() {
      await this._asegurarClaim()
    },

    // Escucha en vivo el documento del socio (saldo, membresía, visitas).
    suscribirSocio() {
      if (!this.gymId || !this.socioId) return
      this.desuscribirSocio()
      const ref = doc(db, 'gyms', this.gymId, 'socios', this.socioId)
      _unsubSocio = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            this.datos = { id: snap.id, ...snap.data() }
          }
        },
        (e) => {
          this.error = this._mensajeError(e)
        },
      )
    },

    desuscribirSocio() {
      if (_unsubSocio) {
        _unsubSocio()
        _unsubSocio = null
      }
    },

    // Limpia todo (p. ej. al cerrar sesión).
    reset() {
      this.desuscribirSocio()
      this.socioId = null
      this.gymId = null
      this.datos = null
      this.cargando = false
      this.resuelto = false
      this.noVinculado = false
      this.error = ''
      this.claimOk = false
      this.claimEstado = 'pendiente'
      this.avisoClaim = ''
    },

    _mensajeError(e) {
      const code = e?.code || ''
      if (code === 'permission-denied') {
        return 'No tienes permiso para ver estos datos. Contacta a tu gimnasio.'
      }
      if (code === 'unavailable') {
        return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
      }
      if (code === 'failed-precondition') {
        // Suele indicar que falta un índice de Firestore.
        return 'La consulta necesita un índice de Firestore. Revisa la consola.'
      }
      return 'No pudimos cargar tus datos. Inténtalo de nuevo.'
    },
  },
})
