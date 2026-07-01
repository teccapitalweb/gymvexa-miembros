// Store de autenticación del socio (Pinia).
// Maneja sesión con correo/contraseña y con Google (redirect, funciona en móvil/PWA).
// Los datos del socio en Firestore se consultarán en el siguiente paso.

import { defineStore } from 'pinia'
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

// Clave donde guardamos el destino post-login ANTES de redirigir a Google. El
// redirect de página completa borra la query del router (?redirect/?c=), así que
// lo persistimos aquí y lo restauramos al volver (getRedirectResult).
const CLAVE_DESTINO = 'post-login-redirect'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,        // objeto user de Firebase (o null)
    claims: {},        // custom claims del token (gymId, socioId, rol) — credencial de vinculación
    cargando: false,   // true mientras se procesa un login/logout
    authReady: false,  // true cuando onAuthStateChanged ya respondió 1ª vez
    errorRedirect: null, // error del retorno de Google (redirect), si lo hubo
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

    // Login con Google por REDIRECT (no popup). El popup se bloquea en móvil/PWA;
    // el redirect sí funciona. Como es una redirección de página completa, esta
    // función NO devuelve el usuario ni carga claims aquí: eso ocurre al volver,
    // en procesarRedirectGoogle(). Antes de irnos, persistimos el destino para no
    // perderlo (el ?redirect/?c= del router desaparece en la recarga).
    async loginGoogle(destino = '/inicio') {
      this.cargando = true
      try {
        sessionStorage.setItem(CLAVE_DESTINO, destino || '/inicio')
      } catch {
        // sessionStorage no disponible (modo privado, etc.): seguimos igual;
        // al volver caeremos al destino por defecto.
      }
      try {
        await signInWithRedirect(auth, googleProvider)
        // Si todo va bien, el navegador ya se está yendo a Google; el código de
        // abajo normalmente no llega a ejecutarse.
      } catch (e) {
        this.cargando = false
        throw e
      }
    },

    // Procesa el RETORNO del login con Google (redirect). Se llama al arrancar la
    // app. Si el usuario acaba de volver de Google, completa el login (setear
    // user + claims, igual que hacía el popup) y devuelve el destino guardado
    // para que quien la llame (main.js) navegue ahí; si no venía de Google,
    // devuelve null y no hace nada.
    async procesarRedirectGoogle() {
      let res = null
      try {
        res = await getRedirectResult(auth)
      } catch (e) {
        // Error real del redirect (config de dominio, red, etc.). Lo guardamos
        // para que LoginView pueda mostrarlo si el socio queda en el login.
        this.errorRedirect = e
        this.cargando = false
        return null
      }
      if (!res || !res.user) return null

      this.user = res.user
      await this._cargarClaims(res.user, false)
      this.cargando = false

      let destino = '/inicio'
      try {
        destino = sessionStorage.getItem(CLAVE_DESTINO) || '/inicio'
        sessionStorage.removeItem(CLAVE_DESTINO)
      } catch {
        destino = '/inicio'
      }
      return destino
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
