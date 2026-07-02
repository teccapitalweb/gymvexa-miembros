<script setup>
// Pantalla de REGISTRO del socio (crear cuenta con correo/contraseña).
// Mismo estilo visual que LoginView (móvil-primero, oscuro-neón). El socio crea su
// cuenta desde cero (Nombre, Teléfono, Correo, Contraseña) y luego pasa a /vincular
// para escanear su QR. El login con Google y con correo existentes NO cambian.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const nombre = ref('')
const telefono = ref('')
const correo = ref('')
const password = ref('')
const confirmar = ref('')
const error = ref('')
// true cuando el correo ya tiene cuenta: mostramos un atajo para ir al login.
const correoEnUso = ref(false)

// Solo dígitos mientras el socio teclea el teléfono (máx. 10).
function alTeclearTelefono(e) {
  telefono.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 10)
}

// Formato de correo sencillo (algo@algo.algo).
function correoValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

// Traduce los códigos de error de Firebase a mensajes en español.
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
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
    default:
      // Errores del backend (guardarDatosRegistro) traen .message legible.
      return e?.message || 'No pudimos crear tu cuenta. Inténtalo de nuevo.'
  }
}

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
        Crea tu cuenta para registrar tu asistencia y ver tu membresía.
        Luego escanea el QR que te da tu gimnasio.
      </p>
    </div>

    <form class="login__form card" @submit.prevent="registrar">
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
          <router-link v-if="correoEnUso" class="login__link" to="/login">
            Ir a iniciar sesión
          </router-link>
        </span>
      </div>

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
        <label class="field__label" for="correo">Correo</label>
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
            id="correo"
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
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
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
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="Repite tu contraseña"
          />
        </div>
      </div>

      <button class="btn btn--primary" type="submit" :disabled="auth.cargando">
        <svg v-if="auth.cargando" class="spin" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        <span>{{ auth.cargando ? 'Creando cuenta…' : 'Crear cuenta' }}</span>
      </button>

      <div class="divider">o</div>

      <button class="btn btn--ghost" type="button" :disabled="auth.cargando" @click="router.push('/login')">
        <span>Ya tengo cuenta</span>
      </button>
    </form>

    <p class="login__foot">¿Problemas para registrarte? Acércate a recepción de tu gym.</p>
  </main>
</template>

<style scoped>
.login {
  justify-content: center;
  gap: 26px;
}

/* En login/registro el contenido va centrado, así que el toggle se ancla arriba a
   la derecha (fuera del bloque centrado) en vez de ir en el flujo. */
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
  max-width: 32ch;
  margin: 8px auto 0;
}

.login__form {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 22px;
  animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 0.18s;
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
</style>
