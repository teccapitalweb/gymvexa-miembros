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
  onIdTokenChanged,
  sendEmailVerification,
} from 'firebase/auth'
import { auth, googleProvider, limpiarCacheFirestore } from '../firebase'

// Clave donde guardamos el destino post-login ANTES de redirigir a Google. El
// redirect de página completa borra la query del router (?redirect/?c=), así que
// lo persistimos aquí y lo restauramos al volver (getRedirectResult).
const CLAVE_DESTINO = 'post-login-redirect'

// Aviso que mostramos en el login TRAS una desvinculación (sobrevive la recarga).
const CLAVE_AVISO_DESVINCULADO = 'aviso-desvinculado'

// Banderas de guardia (fuera del state: no necesitan ser reactivas y evitan
// warnings de Pinia). Igual que socio.js hace con su listener.
let _revalidando = false        // evita revalidaciones solapadas (force refresh)
let _desvinculando = false      // evita reentrar al manejo de desvinculación
let _revalidadoArranque = false // solo UNA revalidación de arranque por carga (anti-bucle)
// true SOLO cuando esta sesión de app estableció una sesión vinculada REAL (claim
// presente Y ficha del socio cargada — el estado normal de un socio usándola). Es
// la condición para REACCIONAR a una desvinculación (Caso A). Un socio que vuelve
// a entrar ya desvinculado (Caso B) nunca la pone en true -> NO se le expulsa; el
// guard lo manda limpio a /vincular. Lo marca socio.js al cargar la ficha.
let _sesionVinculadaActiva = false

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
        // Revalidación de ARRANQUE (suave): si el token CACHEADO trae claim,
        // confirmamos contra el servidor por si al socio lo desvincularon con la app
        // cerrada. Al reabrir con sesión persistida, _cargarClaims(false) lee el
        // token cacheado que AÚN trae el claim viejo (~1h) -> sin esto, el socio
        // desvinculado seguiría ENTRANDO. Se gatea por el CLAIM CACHEADO
        // (tieneClaimSocio), NO por _sesionVinculadaActiva (que al arrancar es false):
        // por eso NO afecta a un re-login FRESCO (Caso B), que llega SIN claim -> no
        // se dispara -> el guard lo lleva limpio a /vincular. Reacción SUAVE (abajo).
        if (user && this.tieneClaimSocio) {
          this._revalidarClaimArranque()
        }
      })

      // NUEVO (Tema 2): escucha cambios/refrescos del ID token. Si un socio que la
      // app tenía por VINCULADO recibe un token nuevo SIN el claim (gymId/socioId),
      // fue desvinculado. Compara el estado PREVIO (antes de releer) con el nuevo,
      // así un recién logueado que aún no tiene claim NO se toma por desvinculado.
      onIdTokenChanged(auth, async (user) => {
        if (!user) return
        const previoVinculado = this.tieneClaimSocio
        await this._cargarClaims(user, false)
        if (previoVinculado && !this.tieneClaimSocio) {
          // El claim desapareció en un refresco legítimo del token: desvinculado
          // pero la sesión sigue viva -> lo mandamos a re-vincular sin cerrar sesión.
          await this._manejarDesvinculado(true)
        }
      })

      // NUEVO (Tema 2): al volver la app al primer plano, revalida con force refresh.
      // Es el disparador principal: detecta la desvinculación en cuanto el socio
      // reabre/enfoca la app, sin esperar al refresco automático (~1h) del token.
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') this.revalidarClaim()
        })
      }
    },

    // Revalida el claim de socio contra el SERVIDOR (force refresh). Detecta la
    // desvinculación aunque el token cacheado aún la traiga. Sin falsos positivos:
    //  - Solo revalida a quien la app YA cree vinculado (evita tocar el flujo de
    //    vincular, donde es normal no tener claim todavía).
    //  - Un error de RED nunca expulsa (mala señal en el gym no es desvinculación).
    async revalidarClaim() {
      const user = auth.currentUser
      if (!user) return
      // Solo reaccionamos si ESTA sesión de app estableció una sesión vinculada
      // confirmada (Caso A). Un socio que vuelve a entrar ya desvinculado (Caso B)
      // no la tiene -> no se le expulsa; el guard lo lleva a /vincular.
      if (!_sesionVinculadaActiva) return
      if (!this.tieneClaimSocio) return
      if (_revalidando || _desvinculando) return
      _revalidando = true
      try {
        // force=true: si el backend revocó los refresh tokens, esto LANZA; si solo
        // quitó el claim, devuelve un token válido pero SIN gymId/socioId.
        const res = await user.getIdTokenResult(true)
        const c = res?.claims ?? {}
        if (c.gymId && c.socioId) {
          this.claims = c // sigue vinculado: sincroniza claims (no expulsa)
        } else {
          await this._manejarDesvinculado(true) // claim quitado, sesión viva
        }
      } catch (e) {
        // Solo tratamos como desvinculación los errores de CREDENCIAL/usuario
        // (tokens revocados, cuenta deshabilitada…), NUNCA los de red.
        const code = e?.code || ''
        const esRevocacion =
          code === 'auth/user-token-expired' ||
          code === 'auth/user-token-revoked' ||
          code === 'auth/invalid-user-token' ||
          code === 'auth/user-disabled' ||
          code === 'auth/user-not-found'
        if (esRevocacion) {
          await this._manejarDesvinculado(false) // sesión muerta: cerrar sesión
        }
        // Red u otro (auth/network-request-failed, etc.): no hacer nada.
      } finally {
        _revalidando = false
      }
    },

    // Revalidación de ARRANQUE (una sola vez por carga). A diferencia de
    // revalidarClaim() —que se gatea por _sesionVinculadaActiva para el Caso A en
    // vivo (visibilitychange)—, ESTA se gatea por el CLAIM CACHEADO y corre al abrir
    // la app, para detectar que al socio lo desvincularon con la app cerrada. Como
    // exige claim cacheado, un re-login FRESCO (sin claim) NO la dispara -> Caso B
    // intacto. Reacción SUAVE: claim quitado (sesión viva) -> /vincular sin signOut;
    // tokens revocados (sesión muerta) -> signOut -> /login con aviso claro.
    async _revalidarClaimArranque() {
      const user = auth.currentUser
      if (!user) return
      if (!this.tieneClaimSocio) return // sin claim cacheado: nada que revalidar
      if (_revalidadoArranque || _revalidando || _desvinculando) return
      _revalidadoArranque = true // anti-bucle: una sola revalidación por arranque
      _revalidando = true
      try {
        // force=true: contra el servidor. Si el backend revocó los refresh tokens,
        // LANZA; si solo quitó el claim, devuelve token válido pero sin gymId/socioId.
        const res = await user.getIdTokenResult(true)
        const c = res?.claims ?? {}
        if (c.gymId && c.socioId) {
          this.claims = c // sigue vinculado de verdad -> sigue a /inicio normal
        } else {
          // Claim quitado, sesión aún viva -> a /vincular, SIN signOut (suave). El
          // force refresh ya dejó cacheado el token SIN claim, así que al recargar
          // tieneClaimSocio será false y NO se vuelve a disparar (no hay bucle).
          this.claims = {}
          await this._manejarDesvinculado(true)
        }
      } catch (e) {
        // Solo tratamos como desvinculación los errores de CREDENCIAL/usuario
        // (tokens revocados, cuenta deshabilitada…), NUNCA los de red.
        const code = e?.code || ''
        const esRevocacion =
          code === 'auth/user-token-expired' ||
          code === 'auth/user-token-revoked' ||
          code === 'auth/invalid-user-token' ||
          code === 'auth/user-disabled' ||
          code === 'auth/user-not-found'
        if (esRevocacion) {
          // Sesión MUERTA: limpiamos el claim y cerramos sesión -> /login con aviso,
          // para que re-loguee con un token fresco válido y caiga en /vincular. El
          // signOut evita que al recargar vuelva a dispararse (no hay bucle).
          this.claims = {}
          await this._manejarDesvinculado(false)
        }
        // Red u otro (auth/network-request-failed): no expulsar (no es desvinculación).
      } finally {
        _revalidando = false
      }
    },

    // Maneja la desvinculación detectada. `sesionValida`:
    //  - true : el claim se quitó pero el token/sesión siguen vivos -> conservamos
    //           la sesión y lo llevamos a /vincular (escanear código de nuevo).
    //  - false: los refresh tokens fueron revocados -> cerramos sesión y lo
    //           llevamos a /login (deberá entrar de nuevo y luego re-vincular).
    // En ambos casos: baja el listener del socio, limpia la caché offline y hace
    // una recarga DURA para arrancar con un estado 100% limpio.
    async _manejarDesvinculado(sesionValida) {
      if (_desvinculando) return
      _desvinculando = true
      // No hace falta resetear el store del socio a mano: la recarga DURA de abajo
      // borra toda la memoria de la app y terminate() (en limpiarCacheFirestore)
      // cancela sus listeners. Así evitamos también un import circular auth<->socio.
      if (!sesionValida) {
        try {
          await signOut(auth)
        } catch {
          // signOut es local; si falla, la recarga dura igual deja sin sesión útil.
        }
        this.user = null
      }
      this.claims = {}
      try {
        sessionStorage.setItem(CLAVE_AVISO_DESVINCULADO, '1')
      } catch {
        // sin sessionStorage: nos saltamos el aviso, la reacción principal ocurre igual.
      }
      // Limpia IndexedDB (best-effort) y recarga a un estado limpio.
      await limpiarCacheFirestore()
      window.location.assign(sesionValida ? '/vincular' : '/login')
    },

    // Marca que ESTA sesión de app ya estableció una sesión vinculada REAL (claim
    // presente + ficha del socio cargada). La llama socio.js cuando resuelve la
    // ficha por el camino del claim. A partir de aquí SÍ reaccionamos a una
    // desvinculación en vivo (Caso A). Antes de esto (Caso B: aún por vincular) no.
    marcarSesionVinculadaActiva() {
      _sesionVinculadaActiva = true
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
        console.error('[login] getRedirectResult lanzó error:', e)
        this.errorRedirect = e
        this.cargando = false
        return null
      }
      if (!res || !res.user) {
        // getRedirectResult vino null. Si NO veníamos de un redirect (arranque
        // normal), es lo esperado: no dejamos rastro. Pero si SÍ habíamos guardado
        // un destino antes de redirigir a Google (loginGoogle) y aun así volvió
        // null, la sesión NO se completó -> típico bloqueo de storage de terceros
        // en móvil/PWA/Safari. Lo dejamos anotado para diagnosticar en producción.
        let veniaDeRedirect = false
        try {
          veniaDeRedirect = !!sessionStorage.getItem(CLAVE_DESTINO)
        } catch {
          veniaDeRedirect = false
        }
        if (veniaDeRedirect) {
          console.error(
            '[login] getRedirectResult vino null tras un redirect: la sesión no se completó (posible bloqueo de storage de terceros en móvil/PWA/Safari; revisar authDomain).',
          )
          this.errorRedirect = new Error(
            'No pudimos completar el inicio de sesión con Google. Vuelve a intentarlo.',
          )
          // Limpiamos el destino huérfano para no arrastrarlo a un intento futuro.
          try {
            sessionStorage.removeItem(CLAVE_DESTINO)
          } catch {
            /* noop */
          }
        }
        this.cargando = false
        return null
      }

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
        // Al cerrar sesión ya no hay sesión vinculada confirmada: si otro socio
        // entra en el mismo SPA (sin recarga), no debe heredar la bandera.
        _sesionVinculadaActiva = false
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
