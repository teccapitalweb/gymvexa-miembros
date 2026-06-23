// Store de autenticación del socio (Pinia).
// Maneja sesión con correo/contraseña y con Google (popup).
// Los datos del socio en Firestore se consultarán en el siguiente paso.

import { defineStore } from 'pinia'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,        // objeto user de Firebase (o null)
    claims: {},        // custom claims del token (gymId, socioId, rol) — credencial de vinculación
    cargando: false,   // true mientras se procesa un login/logout
    authReady: false,  // true cuando onAuthStateChanged ya respondió 1ª vez
  }),

  getters: {
    estaLogueado: (state) => !!state.user,
    uid: (state) => state.user?.uid ?? null,
    correo: (state) => state.user?.email ?? null,
    emailVerificado: (state) => state.user?.emailVerified ?? false,

    // --- Vinculación leída del CLAIM del token ---
    gymIdClaim: (state) => state.claims?.gymId ?? null,
    socioIdClaim: (state) => state.claims?.socioId ?? null,
    // La cuenta está vinculada si el token trae gymId + socioId del socio.
    tieneClaimSocio: (state) => !!(state.claims?.gymId && state.claims?.socioId),
  },

  actions: {
    // Suscribe el estado de sesión. Se llama una vez al iniciar la app.
    // Espera a leer los claims ANTES de marcar authReady, para que el guard del
    // router pueda decidir vinculado/no vinculado sin condiciones de carrera.
    init() {
      onAuthStateChanged(auth, async (user) => {
        this.user = user
        if (user) {
          await this._cargarClaims(user, false)
        } else {
          this.claims = {}
        }
        this.authReady = true
      })
    },

    // Lee los custom claims del ID token (sin/con refresco forzado).
    async _cargarClaims(user, force = false) {
      try {
        const res = await user.getIdTokenResult(force)
        this.claims = res?.claims ?? {}
      } catch {
        this.claims = {}
      }
    },

    // Fuerza un refresco del token y relee los claims. Se llama TRAS vincular
    // (por código o por correo) para activar el claim recién asignado.
    async refrescarClaims(force = true) {
      const user = auth.currentUser
      if (!user) {
        this.claims = {}
        return
      }
      await this._cargarClaims(user, force)
    },

    async loginCorreo(correo, contrasena) {
      this.cargando = true
      try {
        const cred = await signInWithEmailAndPassword(auth, correo, contrasena)
        this.user = cred.user
        // Cargamos claims ya mismo para que el guard del router decida bien
        // el destino inmediatamente después del login.
        await this._cargarClaims(cred.user, false)
        return cred.user
      } finally {
        this.cargando = false
      }
    },

    async loginGoogle() {
      this.cargando = true
      try {
        const cred = await signInWithPopup(auth, googleProvider)
        this.user = cred.user
        await this._cargarClaims(cred.user, false)
        return cred.user
      } finally {
        this.cargando = false
      }
    },

    async logout() {
      this.cargando = true
      try {
        await signOut(auth)
        this.user = null
        this.claims = {}
      } finally {
        this.cargando = false
      }
    },

    // Reenvía el correo de verificación al usuario actual (para el flujo en que
    // el backend rechaza la vinculación por email no verificado).
    async reenviarVerificacion() {
      const user = auth.currentUser
      if (!user) throw new Error('No hay una sesión activa.')
      await sendEmailVerification(user)
    },
  },
})
