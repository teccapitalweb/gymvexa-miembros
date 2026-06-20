<script setup>
// Perfil del socio (solo lectura): datos, membresía, saldo, visitas.
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'
import { centavosAPesos } from '../composables/useDinero'
import { interpretarMembresia } from '../composables/useMembresia'

const router = useRouter()
const auth = useAuthStore()
const socio = useSocioStore()

onMounted(() => {
  // Si se entra directo a /perfil, aseguramos la vinculación.
  if (!socio.estaVinculado && !socio.resuelto) socio.vincularSocio()
})

const d = computed(() => socio.datos || {})
const membresia = computed(() => interpretarMembresia(socio.estadoMembresia))
const inicial = computed(() => (socio.nombreSocio || auth.correo || '?').trim().charAt(0).toUpperCase())
const tieneDeuda = computed(() => Number(d.value.deudaActual) > 0)

const fechaFinLegible = computed(() => {
  const f = membresia.value.fechaFin
  if (!f) return null
  try {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(f)
  } catch {
    return null
  }
})

async function cerrarSesion() {
  socio.reset()
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <main class="screen screen--with-nav perfil">
    <header class="perfil__head">
      <div class="avatar">{{ inicial }}</div>
      <h1 class="perfil__nombre">{{ socio.nombreSocio || 'Socio' }}</h1>
      <p v-if="d.numeroSocio" class="perfil__num">Socio #{{ d.numeroSocio }}</p>
      <p class="perfil__email">{{ d.email || auth.correo }}</p>
    </header>

    <template v-if="socio.estaVinculado">
      <!-- Membresía -->
      <section class="card bloque">
        <h2 class="bloque__title">Membresía</h2>
        <div class="linea">
          <span class="linea__k">Estado</span>
          <span class="linea__v" :class="`tono--${membresia.tono}`">{{ membresia.etiqueta }}</span>
        </div>
        <div v-if="membresia.plan" class="linea">
          <span class="linea__k">Plan</span>
          <span class="linea__v">{{ membresia.plan }}</span>
        </div>
        <div v-if="fechaFinLegible" class="linea">
          <span class="linea__k">Vence</span>
          <span class="linea__v">{{ fechaFinLegible }}</span>
        </div>
      </section>

      <!-- Saldo -->
      <section class="card bloque">
        <h2 class="bloque__title">Cuenta</h2>
        <div class="linea">
          <span class="linea__k">Saldo a favor</span>
          <span class="linea__v">{{ centavosAPesos(d.saldoActual) }}</span>
        </div>
        <div v-if="tieneDeuda" class="linea">
          <span class="linea__k">Adeudo</span>
          <span class="linea__v tono--rojo">{{ centavosAPesos(d.deudaActual) }}</span>
        </div>
      </section>

      <!-- Actividad -->
      <section class="card bloque">
        <h2 class="bloque__title">Actividad</h2>
        <div class="linea">
          <span class="linea__k">Total de visitas</span>
          <span class="linea__v">{{ d.totalVisitas ?? 0 }}</span>
        </div>
      </section>
    </template>

    <p v-else-if="socio.noVinculado" class="perfil__aviso">
      Tu correo no está vinculado a un gimnasio.
    </p>

    <button class="btn btn--ghost" :disabled="auth.cargando" @click="cerrarSesion">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
        <path d="M19 12H9" /><path d="m16 9 3 3-3 3" />
      </svg>
      <span>Cerrar sesión</span>
    </button>
  </main>
</template>

<style scoped>
.perfil { gap: 16px; }

.perfil__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  margin: 8px 0 4px;
}
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(180deg, var(--accent-bright), var(--accent));
  box-shadow: 0 8px 26px var(--accent-glow);
  margin-bottom: 6px;
}
.perfil__nombre { font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; }
.perfil__num { color: var(--accent-bright); font-weight: 600; font-size: 0.9rem; }
.perfil__email { color: var(--text-dim); font-size: 0.9rem; word-break: break-all; }

.bloque { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.bloque__title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-dim);
}
.linea { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; }
.linea__k { color: var(--text-dim); font-size: 0.95rem; }
.linea__v { font-weight: 700; font-size: 1rem; text-align: right; }

.tono--verde { color: var(--success); }
.tono--ambar { color: #ffb84c; }
.tono--rojo { color: var(--danger); }
.tono--gris { color: var(--text-dim); }

.perfil__aviso { text-align: center; color: var(--text-dim); padding: 12px; }
</style>
