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
  <main class="screen screen--with-nav perfil stagger">
    <header class="perfil__head card">
      <div class="perfil__head-glow" aria-hidden="true"></div>
      <div class="avatar">
        <span class="avatar__ring" aria-hidden="true"></span>
        {{ inicial }}
      </div>
      <h1 class="perfil__nombre display">{{ socio.nombreSocio || 'Socio' }}</h1>
      <span v-if="d.numeroSocio" class="chip perfil__num">
        <span class="chip__dot"></span>Socio #{{ d.numeroSocio }}
      </span>
      <p class="perfil__email">{{ d.email || auth.correo }}</p>
    </header>

    <template v-if="socio.estaVinculado">
      <!-- Métricas destacadas -->
      <div class="stats">
        <section class="card stat">
          <span class="kicker">Visitas</span>
          <span class="stat__num metric">{{ d.totalVisitas ?? 0 }}</span>
        </section>
        <section class="card stat stat--saldo">
          <span class="kicker">Saldo</span>
          <span class="stat__num metric">{{ centavosAPesos(d.saldoActual) }}</span>
        </section>
      </div>

      <!-- Membresía -->
      <section class="card bloque">
        <h2 class="bloque__title">Membresía</h2>
        <div class="linea">
          <span class="linea__k">Estado</span>
          <span class="chip" :class="`chip--${membresia.tono}`">
            <span class="chip__dot"></span>{{ membresia.etiqueta }}
          </span>
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

      <!-- Cuenta / adeudo -->
      <section v-if="tieneDeuda" class="card bloque">
        <h2 class="bloque__title">Cuenta</h2>
        <div class="linea">
          <span class="linea__k">Adeudo</span>
          <span class="linea__v tono--rojo">{{ centavosAPesos(d.deudaActual) }}</span>
        </div>
      </section>
    </template>

    <p v-else-if="socio.noVinculado" class="perfil__aviso">
      Tu correo no está vinculado a un gimnasio.
    </p>

    <button class="btn btn--ghost perfil__logout" :disabled="auth.cargando" @click="cerrarSesion">
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
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 28px 20px 24px;
}
.perfil__head-glow {
  position: absolute;
  top: -55%;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 62%);
  opacity: 0.5;
  pointer-events: none;
}
.avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 2.3rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(140deg, var(--cyan), var(--accent-bright) 45%, var(--accent-deep));
  box-shadow: 0 12px 34px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  margin-bottom: 4px;
}
.avatar__ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid var(--accent-soft);
  box-shadow: 0 0 22px var(--accent-glow);
}
.perfil__nombre { position: relative; font-size: 1.6rem; }
.perfil__num { position: relative; color: var(--cyan-bright); border-color: rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.08); }
.perfil__email { position: relative; color: var(--text-dim); font-size: 0.9rem; word-break: break-all; }

/* Métricas destacadas */
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.stat__num { font-size: 2rem; }
.stat--saldo .stat__num { color: var(--success); text-shadow: 0 0 20px var(--success-glow); }

.bloque { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.bloque__title {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-faint);
}
.linea { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.linea__k { color: var(--text-dim); font-size: 0.95rem; }
.linea__v { font-weight: 700; font-size: 1rem; text-align: right; }

.tono--verde { color: var(--success); }
.tono--ambar { color: var(--warn); }
.tono--rojo { color: var(--danger); }
.tono--gris { color: var(--text-dim); }

.perfil__aviso { text-align: center; color: var(--text-dim); padding: 12px; }
.perfil__logout { margin-top: 4px; }
</style>
