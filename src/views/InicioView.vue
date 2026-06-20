<script setup>
// HOME de la app: resuelve la vinculación del socio y muestra membresía + saldo.
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
  socio.vincularSocio()
})

const membresia = computed(() => interpretarMembresia(socio.estadoMembresia))
const saldoCentavos = computed(() => socio.datos?.saldoActual ?? 0)
const deudaCentavos = computed(() => socio.datos?.deudaActual ?? 0)
const tieneDeuda = computed(() => Number(deudaCentavos.value) > 0)

const primerNombre = computed(() => (socio.nombreSocio || '').split(' ')[0] || 'socio')

async function cerrarSesion() {
  socio.reset()
  await auth.logout()
  router.replace('/login')
}

function irACheckin() {
  router.push('/checkin')
}
</script>

<template>
  <main class="screen screen--with-nav inicio">
    <!-- Cargando vinculación -->
    <div v-if="socio.cargando && !socio.resuelto" class="estado-centro">
      <svg class="spin" width="34" height="34" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.2-8.5" />
      </svg>
      <p>Cargando tu información…</p>
    </div>

    <!-- Error general -->
    <div v-else-if="socio.error" class="estado-centro">
      <div class="alert alert--error">
        <span>{{ socio.error }}</span>
      </div>
      <button class="btn btn--ghost" @click="cerrarSesion">Cerrar sesión</button>
    </div>

    <!-- Correo no registrado -->
    <div v-else-if="socio.noVinculado" class="estado-centro no-vinculado">
      <span class="no-vinculado__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      </span>
      <h2 class="no-vinculado__title">Tu correo no está registrado</h2>
      <p class="no-vinculado__text">
        Tu correo no está registrado en ningún gimnasio. Pídele a tu gym que registre tu
        correo en tu ficha de socio.
      </p>
      <button class="btn btn--ghost" @click="cerrarSesion">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
          <path d="M19 12H9" /><path d="m16 9 3 3-3 3" />
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </div>

    <!-- Vinculado: home -->
    <template v-else-if="socio.estaVinculado">
      <header class="inicio__head">
        <p class="inicio__hi">Hola,</p>
        <h1 class="inicio__name">{{ primerNombre }}</h1>
      </header>

      <!-- Tarjeta de membresía -->
      <section class="card mcard" :class="`mcard--${membresia.tono}`">
        <div class="mcard__top">
          <span class="mcard__dot"></span>
          <span class="mcard__estado">{{ membresia.etiqueta }}</span>
        </div>
        <p v-if="membresia.plan" class="mcard__plan">{{ membresia.plan }}</p>
        <p v-else class="mcard__plan mcard__plan--dim">Plan no especificado</p>
      </section>

      <!-- Tarjeta de saldo -->
      <section class="card saldo">
        <div class="saldo__row">
          <span class="saldo__label">Saldo a favor</span>
          <span class="saldo__monto">{{ centavosAPesos(saldoCentavos) }}</span>
        </div>
        <div v-if="tieneDeuda" class="saldo__row saldo__row--deuda">
          <span class="saldo__label">Adeudo</span>
          <span class="saldo__monto saldo__monto--deuda">{{ centavosAPesos(deudaCentavos) }}</span>
        </div>
      </section>

      <!-- CTA check-in -->
      <button class="btn btn--primary cta-checkin" @click="irACheckin">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h3v3" /><path d="M21 14v7h-7" />
        </svg>
        <span>Registrar asistencia</span>
      </button>
    </template>
  </main>
</template>

<style scoped>
.inicio { gap: 18px; }

.estado-centro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 18px;
  color: var(--text-dim);
}

.no-vinculado__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--r-md);
  color: var(--danger);
  background: rgba(255, 84, 112, 0.12);
}
.no-vinculado__title { color: var(--text); font-size: 1.25rem; font-weight: 800; }
.no-vinculado__text { max-width: 32ch; }

.inicio__head { margin-top: 6px; }
.inicio__hi { color: var(--text-dim); font-size: 1.05rem; }
.inicio__name {
  font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; text-transform: capitalize;
}

/* Tarjeta de membresía con tono según vigencia */
.mcard { padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.mcard__top { display: flex; align-items: center; gap: 10px; }
.mcard__dot {
  width: 11px; height: 11px; border-radius: 50%;
  box-shadow: 0 0 12px currentColor;
}
.mcard__estado { font-weight: 700; font-size: 1.05rem; }
.mcard__plan { color: var(--text-dim); font-size: 0.95rem; }
.mcard__plan--dim { opacity: 0.7; }

.mcard--verde { border-color: rgba(47, 214, 166, 0.4); }
.mcard--verde .mcard__dot, .mcard--verde .mcard__estado { color: var(--success); }
.mcard--ambar { border-color: rgba(255, 184, 76, 0.45); }
.mcard--ambar .mcard__dot, .mcard--ambar .mcard__estado { color: #ffb84c; }
.mcard--rojo { border-color: rgba(255, 84, 112, 0.45); }
.mcard--rojo .mcard__dot, .mcard--rojo .mcard__estado { color: var(--danger); }
.mcard--gris .mcard__dot, .mcard--gris .mcard__estado { color: var(--text-dim); }

/* Tarjeta de saldo */
.saldo { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.saldo__row { display: flex; align-items: baseline; justify-content: space-between; }
.saldo__label { color: var(--text-dim); font-size: 0.92rem; }
.saldo__monto { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; }
.saldo__row--deuda { padding-top: 10px; border-top: 1px solid var(--border); }
.saldo__monto--deuda { color: var(--danger); }

.cta-checkin { height: 60px; font-size: 1.05rem; margin-top: 4px; }
</style>
