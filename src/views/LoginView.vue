<script setup>
// Pantalla de login del socio (móvil-primero, oscuro-neón).
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const correo = ref('')
const contrasena = ref('')
const error = ref('')

function destino() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/inicio'
}

// Traduce los códigos de error de Firebase a mensajes en español.
function mensajeError(e) {
  const code = e?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.'
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
      return 'No pudimos iniciar sesión. Inténtalo de nuevo.'
  }
}

async function entrar() {
  error.value = ''
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

async function entrarConGoogle() {
  error.value = ''
  try {
    await auth.loginGoogle()
    router.replace(destino())
  } catch (e) {
    error.value = mensajeError(e)
  }
}
</script>

<template>
  <main class="screen login">
    <div class="login__top">
      <!-- Logo: marca Gymvexa con glow -->
      <div class="brand">
        <span class="brand__mark">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.1"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.5 9v6" />
            <path d="M17.5 9v6" />
            <path d="M6.5 12h11" />
            <path d="M3.5 10.5v3" />
            <path d="M20.5 10.5v3" />
          </svg>
        </span>
        <div class="brand__text">
          <h1 class="brand__name">Gymvexa</h1>
          <p class="brand__sub">Miembros</p>
        </div>
      </div>
      <p class="login__welcome">Inicia sesión para registrar tu asistencia y ver tu membresía.</p>
    </div>

    <form class="login__form card" @submit.prevent="entrar">
      <div v-if="error" class="alert alert--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
        <span>{{ error }}</span>
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
        <label class="field__label" for="contrasena">Contraseña</label>
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
            id="contrasena"
            v-model="contrasena"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button class="btn btn--primary" type="submit" :disabled="auth.cargando">
        <svg v-if="auth.cargando" class="spin" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        <span>{{ auth.cargando ? 'Entrando…' : 'Entrar' }}</span>
      </button>

      <div class="divider">o</div>

      <button class="btn btn--ghost" type="button" :disabled="auth.cargando" @click="entrarConGoogle">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.2c0-.66-.06-1.3-.17-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.23C20.5 17.6 21.6 15.1 21.6 12.2z"/>
          <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z"/>
          <path fill="#FBBC05" d="M6.41 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.35-2.59z"/>
          <path fill="#EA4335" d="M12 6.06c1.47 0 2.78.5 3.82 1.5l2.86-2.86A10 10 0 0 0 12 2 10 10 0 0 0 3.06 7.5l3.35 2.59C7.2 7.82 9.4 6.06 12 6.06z"/>
        </svg>
        <span>Entrar con Google</span>
      </button>
    </form>

    <p class="login__foot">¿Problemas para entrar? Acércate a recepción de tu gym.</p>
  </main>
</template>

<style scoped>
.login {
  justify-content: center;
  gap: 26px;
}

.login__top {
  text-align: center;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.brand__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--r-md);
  color: #fff;
  background: linear-gradient(180deg, var(--accent-bright), var(--accent));
  box-shadow: 0 8px 26px var(--accent-glow);
}

.brand__text {
  text-align: left;
  line-height: 1.05;
}

.brand__name {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand__sub {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--accent-bright);
}

.login__welcome {
  color: var(--text-dim);
  font-size: 0.95rem;
  max-width: 30ch;
  margin: 0 auto;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
}

.login__foot {
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-dim);
}
</style>
