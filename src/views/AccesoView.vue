<script setup>
// Pantalla ÚNICA de acceso del socio con dos pestañas internas: "Iniciar sesión"
// y "Crear cuenta". Las pestañas alternan el formulario SIN navegar entre rutas
// (segmented control, cambio instantáneo). Reutiliza la lógica ya existente del
// store de auth (loginCorreo, loginGoogle, registrarCorreo). Estilo Gymvexa
// (turquesa/cyan, día/noche, halo, glass): NO se toca la paleta.
//
// Sustituye a las antiguas LoginView.vue y RegistroView.vue (fusionadas aquí).
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Marca "ya vio esta pantalla en este dispositivo": decide la pestaña por defecto.
const CLAVE_VISTO = 'gymvexa_auth_visto'

// Pestaña activa: 'login' | 'crear'. Se resuelve en onMounted.
const tab = ref('login')

// Campos compartidos/propios de cada formulario.
const correo = ref('') // compartido entre ambas pestañas (UX)
const contrasena = ref('') // contraseña de "iniciar sesión"
const nombre = ref('')
const telefono = ref('')
const password = ref('') // contraseña de "crear cuenta"
const confirmar = ref('')

const error = ref('')
const aviso = ref('')
// true cuando el correo ya tiene cuenta: ofrecemos saltar a la pestaña de login.
const correoEnUso = ref(false)

// Ver/ocultar contraseña por campo.
const verLoginPass = ref(false)
const verRegPass = ref(false)
const verRegConfirm = ref(false)

// --- Arranque: error de redirect de Google, aviso de desvinculación y pestaña ---
onMounted(() => {
  // Si el login con Google por redirect falló, el socio vuelve aquí con el error
  // en el store. Lo mostramos y lo limpiamos (igual que hacía LoginView).
  if (auth.errorRedirect) {
    error.value = auth.errorRedirect.code
      ? mensajeError(auth.errorRedirect)
      : auth.errorRedirect.message || mensajeError(auth.errorRedirect)
    auth.errorRedirect = null
  }
  try {
    if (sessionStorage.getItem('aviso-desvinculado')) {
      aviso.value = 'Tu acceso fue actualizado. Vuelve a iniciar sesión para vincular tu cuenta.'
      sessionStorage.removeItem('aviso-desvinculado')
    }
  } catch {
    // sessionStorage no disponible: sin aviso, el acceso funciona igual.
  }

  // Pestaña por defecto:
  //  - ?tab=crear / ?tab=login fuerza una (p. ej. el redirect desde /registro).
  //  - si no, "primera vez en este dispositivo" (marca ausente) -> "Crear cuenta"
  //    y se crea la marca; si ya existía -> "Iniciar sesión".
  let visto = false
  try {
    visto = !!localStorage.getItem(CLAVE_VISTO)
  } catch {
    visto = false
  }
  const q = route.query.tab
  if (q === 'crear' || q === 'login') {
    tab.value = q
  } else {
    tab.value = visto ? 'login' : 'crear'
  }
  if (!visto) {
    try {
      localStorage.setItem(CLAVE_VISTO, '1')
    } catch {
      // sin localStorage: no pasa nada, solo no recordaremos el dispositivo.
    }
  }
})

function destino() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/inicio'
}

// Cambia de pestaña sin navegar. Limpia el error/estado para no arrastrar mensajes
// de un formulario al otro.
function cambiarTab(t) {
  if (tab.value === t) return
  tab.value = t
  error.value = ''
  correoEnUso.value = false
}

// Formato de correo sencillo (algo@algo.algo).
function correoValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

// Solo dígitos mientras el socio teclea el teléfono (máx. 10).
function alTeclearTelefono(e) {
  telefono.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 10)
}

// Traduce los códigos de error de Firebase a mensajes en español (login + registro).
function mensajeError(e) {
  const code = e?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Inicia sesión.'
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.'
    case 'auth/weak-password':
      return 'La contraseña es muy débil (mínimo 6 caracteres).'
    case 'auth/operation-not-allowed':
      return 'El registro con correo está deshabilitado. Acércate a recepción.'
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google antes de terminar.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
    default:
      // Errores del backend (guardarDatosRegistro) traen .message legible.
      return e?.message || 'No pudimos completar la acción. Inténtalo de nuevo.'
  }
}

// --- Iniciar sesión con correo/contraseña ---
async function entrar() {
  error.value = ''
  correoEnUso.value = false
  if (!correo.value || !contrasena.value) {
    error.value = 'Ingresa tu correo y contraseña.'
    return
  }
  try {
    await auth.loginCorreo(correo.value.trim(), contrasena.value)
    router.replace(destino())
  } catch (e) {
    error.value = mensajeError(e)
  }
}

// --- Iniciar sesión / crear cuenta con Google (mismo flujo por redirect) ---
async function entrarConGoogle() {
  error.value = ''
  try {
    // Con redirect la página se va a Google y vuelve recargada: NO navegamos aquí.
    await auth.loginGoogle(destino())
  } catch (e) {
    error.value = mensajeError(e)
  }
}

// --- Crear cuenta con correo/contraseña ---
async function registrar() {
  error.value = ''
  correoEnUso.value = false

  const nom = nombre.value.trim()
  const tel = telefono.value.replace(/\D/g, '')
  const mail = correo.value.trim()

  if (!nom || !tel || !mail || !password.value || !confirmar.value) {
    error.value = 'Completa todos los campos.'
    return
  }
  if (!correoValido(mail)) {
    error.value = 'El correo no tiene un formato válido.'
    return
  }
  if (tel.length !== 10) {
    error.value = 'El teléfono debe tener 10 dígitos.'
    return
  }
  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }
  if (password.value !== confirmar.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await auth.registrarCorreo({
      nombre: nom,
      telefono: tel,
      correo: mail,
      password: password.value,
    })
    // Cuenta creada: al vincular escaneará su QR de recepción.
    router.push('/vincular')
  } catch (e) {
    if (e?.code === 'auth/email-already-in-use') correoEnUso.value = true
    error.value = mensajeError(e)
  }
}
</script>

<template>
  <main class="screen login">
    <!-- Halo decorativo de fondo -->
    <div class="login__halo" aria-hidden="true"></div>

    <ThemeToggle />

    <div class="login__top stagger">
      <!-- Logo: marca Gymvexa con glow -->
      <div class="brand">
        <span class="brand__mark">
          <span class="brand__ring" aria-hidden="true"></span>
          <img class="brand__logo" src="/gymvexa-icon.png" alt="Gymvexa" width="76" height="76" />
        </span>
      </div>
      <div class="brand__text">
        <h1 class="brand__name display">Gymvexa</h1>
        <p class="brand__sub">Miembros</p>
      </div>
      <p class="login__welcome">
        {{ tab === 'crear'
          ? 'Crea tu cuenta para registrar tu asistencia y ver tu membresía. Luego escanea el QR que te da tu gimnasio.'
          : 'Tu entrenamiento empieza aquí. Inicia sesión para registrar tu asistencia y ver tu membresía.' }}
      </p>
    </div>

    <div class="login__form card">
      <!-- Pestañas internas (segmented control): cambian el formulario sin navegar -->
      <div class="auth-tabs" role="tablist" aria-label="Iniciar sesión o crear cuenta">
        <button
          type="button"
          class="auth-tab"
          :class="{ 'auth-tab--activa': tab === 'login' }"
          role="tab"
          :aria-selected="tab === 'login'"
          @click="cambiarTab('login')"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          class="auth-tab"
          :class="{ 'auth-tab--activa': tab === 'crear' }"
          role="tab"
          :aria-selected="tab === 'crear'"
          @click="cambiarTab('crear')"
        >
          Crear cuenta
        </button>
      </div>

      <div v-if="aviso" class="alert alert--info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>{{ aviso }}</span>
      </div>

      <div v-if="error" class="alert alert--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
        <span>
          {{ error }}
          <button
            v-if="correoEnUso"
            type="button"
            class="login__link login__link--btn"
            @click="cambiarTab('login')"
          >
            Ir a iniciar sesión
          </button>
        </span>
      </div>

      <!-- ===================== FORM: INICIAR SESIÓN ===================== -->
      <form v-if="tab === 'login'" class="auth-form" @submit.prevent="entrar">
        <div class="field">
          <label class="field__label" for="correo-login">Correo</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            </span>
            <input
              id="correo-login"
              v-model="correo"
              class="input"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="tu@correo.com"
            />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="contrasena-login">Contraseña</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="contrasena-login"
              v-model="contrasena"
              class="input input--con-toggle"
              :type="verLoginPass ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="input-toggle"
              :aria-label="verLoginPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="verLoginPass = !verLoginPass"
            >
              <svg v-if="!verLoginPass" width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                <path d="M9.9 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9" />
                <path d="M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 3-.5" />
              </svg>
            </button>
          </div>
        </div>

        <button class="btn btn--primary" type="submit" :disabled="auth.cargando">
          <svg v-if="auth.cargando" class="spin" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
          <span>{{ auth.cargando ? 'Entrando…' : 'Entrar' }}</span>
        </button>
      </form>

      <!-- ====================== FORM: CREAR CUENTA ====================== -->
      <form v-else class="auth-form" @submit.prevent="registrar">
        <div class="field">
          <label class="field__label" for="nombre">Nombre</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </span>
            <input
              id="nombre"
              v-model="nombre"
              class="input"
              type="text"
              autocomplete="name"
              placeholder="Tu nombre"
            />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="telefono">Teléfono</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l2 5v2a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 1-2Z" />
              </svg>
            </span>
            <input
              id="telefono"
              :value="telefono"
              class="input"
              type="tel"
              inputmode="numeric"
              autocomplete="tel"
              maxlength="10"
              placeholder="10 dígitos"
              @input="alTeclearTelefono"
            />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="correo-reg">Correo</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            </span>
            <input
              id="correo-reg"
              v-model="correo"
              class="input"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="tu@correo.com"
            />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="password">Contraseña</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="password"
              v-model="password"
              class="input input--con-toggle"
              :type="verRegPass ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              class="input-toggle"
              :aria-label="verRegPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="verRegPass = !verRegPass"
            >
              <svg v-if="!verRegPass" width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                <path d="M9.9 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9" />
                <path d="M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 3-.5" />
              </svg>
            </button>
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="confirmar">Confirmar contraseña</label>
          <div class="input-wrap">
            <span class="input-wrap__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="10" width="16" height="11" rx="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="confirmar"
              v-model="confirmar"
              class="input input--con-toggle"
              :type="verRegConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Repite tu contraseña"
            />
            <button
              type="button"
              class="input-toggle"
              :aria-label="verRegConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="verRegConfirm = !verRegConfirm"
            >
              <svg v-if="!verRegConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                <path d="M9.9 5.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9" />
                <path d="M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 3-.5" />
              </svg>
            </button>
          </div>
        </div>

        <button class="btn btn--primary" type="submit" :disabled="auth.cargando">
          <svg v-if="auth.cargando" class="spin" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
          <span>{{ auth.cargando ? 'Creando cuenta…' : 'Crear cuenta' }}</span>
        </button>
      </form>

      <!-- Google: mismo flujo para ambas pestañas -->
      <div class="divider">o</div>

      <button class="btn btn--ghost" type="button" :disabled="auth.cargando" @click="entrarConGoogle">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.66-.06-1.3-.17-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.23C20.5 17.6 21.6 15.1 21.6 12.2z"/>
          <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z"/>
          <path fill="#FBBC05" d="M6.41 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.35-2.59z"/>
          <path fill="#EA4335" d="M12 6.06c1.47 0 2.78.5 3.82 1.5l2.86-2.86A10 10 0 0 0 12 2 10 10 0 0 0 3.06 7.5l3.35 2.59C7.2 7.82 9.4 6.06 12 6.06z"/>
        </svg>
        <span>Continuar con Google</span>
      </button>
    </div>

    <p class="login__foot">
      ¿Primera vez? <router-link class="login__link" to="/instalar">Instala la app</router-link>
    </p>
    <p class="login__foot">¿Problemas para entrar? Acércate a recepción de tu gym.</p>
  </main>
</template>

<style scoped>
.login {
  justify-content: center;
  gap: 26px;
}

/* En acceso el contenido va centrado, así que el toggle se ancla arriba a la
   derecha (fuera del bloque centrado) en vez de ir en el flujo. */
.login :deep(.theme-toggle-bar) {
  position: absolute;
  top: calc(var(--safe-top) + 14px);
  right: calc(var(--safe-right) + 16px);
  width: auto;
  margin: 0;
  z-index: 2;
}

/* Halo radial detrás del contenido. */
.login__halo {
  position: absolute;
  top: -6%;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 62%);
  filter: blur(20px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.login__top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.brand {
  margin-bottom: 6px;
}

.brand__mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: var(--r-lg);
  box-shadow: 0 14px 40px var(--accent-glow);
}

.brand__logo {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}

/* Anillo de glow que late suavemente. */
.brand__ring {
  position: absolute;
  inset: -7px;
  border-radius: calc(var(--r-lg) + 7px);
  border: 1.5px solid var(--accent-soft);
  box-shadow: 0 0 26px var(--accent-glow);
  animation: brandPulse 3.2s ease-in-out infinite;
}

@keyframes brandPulse {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50%      { opacity: 0.9; transform: scale(1.04); }
}

.brand__text { line-height: 1.05; }

.brand__name {
  font-size: 2.3rem;
  background: linear-gradient(180deg, #ffffff, #c7d8f5);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* En modo día el degradado claro es invisible: usamos uno oscuro→cyan. */
:root[data-theme="light"] .brand__name {
  background: linear-gradient(180deg, #0f172a, #06b6d4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand__sub {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.36em;
  color: var(--cyan-bright);
  margin-top: 4px;
}

.login__welcome {
  color: var(--text-dim);
  font-size: 0.96rem;
  max-width: 34ch;
  margin: 8px auto 0;
}

.login__form {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 22px 24px;
  animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 0.18s;
}

/* Formulario interno: mismo ritmo de separación que el resto. */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* -------- Pestañas internas (segmented control) -------- */
.auth-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
}

.auth-tab {
  height: 42px;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: color 0.18s var(--ease), background 0.2s var(--ease), box-shadow 0.2s var(--ease);
}

.auth-tab:hover:not(.auth-tab--activa) {
  color: var(--text);
}

/* Pestaña activa: gradiente firma turquesa (misma convención que el CTA primario). */
.auth-tab--activa {
  color: #ffffff;
  background: var(--grad-firma);
  box-shadow: 0 8px 20px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

/* -------- Ojito ver/ocultar contraseña -------- */
/* Deja sitio a la derecha para el botón del ojo. */
.input--con-toggle {
  padding-right: 48px;
}

.input-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: color 0.18s var(--ease);
  -webkit-tap-highlight-color: transparent;
}

.input-toggle:hover,
.input-toggle:focus-visible {
  color: var(--accent-bright);
  outline: none;
}

.login__foot {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-faint);
}
.login__link {
  color: var(--cyan-bright);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}
/* Enlace-botón (p. ej. "Ir a iniciar sesión"): mismo look que login__link, sin
   estilos de botón nativo. */
.login__link--btn {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
</style>
