<script setup>
// STUB temporal de Inicio: solo sirve para probar el login.
// El contenido real (check-in, perfil, membresía, saldo) llega en el próximo paso.
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

async function cerrarSesion() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <main class="screen screen--with-nav inicio">
    <header class="inicio__head">
      <p class="inicio__hi">Hola</p>
      <h1 class="inicio__email">{{ auth.correo || 'socio' }}</h1>
    </header>

    <section class="card inicio__placeholder">
      <span class="inicio__placeholder-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h3v3" />
          <path d="M21 14v7h-7" />
        </svg>
      </span>
      <p class="inicio__placeholder-text">
        Aquí irá tu check-in por QR, tu membresía y tu saldo. Lo construimos en el siguiente paso.
      </p>
    </section>

    <button class="btn btn--ghost" type="button" :disabled="auth.cargando" @click="cerrarSesion">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
        <path d="M19 12H9" />
        <path d="m16 9 3 3-3 3" />
      </svg>
      <span>Cerrar sesión</span>
    </button>
  </main>
</template>

<style scoped>
.inicio {
  gap: 22px;
}

.inicio__head {
  margin-top: 8px;
}

.inicio__hi {
  color: var(--text-dim);
  font-size: 1rem;
}

.inicio__email {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.inicio__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 30px 22px;
}

.inicio__placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: var(--r-md);
  color: var(--accent-bright);
  background: var(--accent-soft);
}

.inicio__placeholder-text {
  color: var(--text-dim);
  font-size: 0.95rem;
  max-width: 32ch;
}
</style>
