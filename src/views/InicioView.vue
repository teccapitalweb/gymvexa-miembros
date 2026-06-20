<script setup>
// HOME de la app: resuelve la vinculación del socio y muestra membresía + saldo.
import { onMounted, ref, computed } from 'vue'
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

// --- Aviso de vinculación del claim (no bloqueante) ---
const reenviando = ref(false)
const reenviado = ref(false)
const reenviarError = ref('')
const reintentando = ref(false)

async function reenviarVerificacion() {
  if (reenviando.value) return
  reenviando.value = true
  reenviarError.value = ''
  try {
    await auth.reenviarVerificacion()
    reenviado.value = true
  } catch {
    reenviarError.value = 'No pudimos reenviar el correo. Inténtalo en un momento.'
  } finally {
    reenviando.value = false
  }
}

async function reintentarVinculo() {
  if (reintentando.value) return
  reintentando.value = true
  try {
    await socio.reintentarClaim()
  } finally {
    reintentando.value = false
  }
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
      <!-- Aviso no bloqueante: el claim no se pudo asignar (la lectura ya funciona) -->
      <section v-if="socio.avisoClaim" class="aviso" role="status">
        <span class="aviso__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <div class="aviso__body">
          <p class="aviso__text">{{ socio.avisoClaim }}</p>
          <div class="aviso__acciones">
            <button
              v-if="socio.claimEstado === 'no_verificado'"
              class="aviso__btn"
              :disabled="reenviando || reenviado"
              @click="reenviarVerificacion"
            >
              {{ reenviado ? 'Correo enviado' : reenviando ? 'Enviando…' : 'Reenviar verificación' }}
            </button>
            <button
              class="aviso__btn aviso__btn--ghost"
              :disabled="reintentando"
              @click="reintentarVinculo"
            >
              {{ reintentando ? 'Reintentando…' : 'Reintentar' }}
            </button>
          </div>
          <p v-if="reenviarError" class="aviso__err">{{ reenviarError }}</p>
        </div>
      </section>

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

/* Aviso no bloqueante de vinculación */
.aviso {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--r-md);
  border: 1px solid rgba(255, 184, 76, 0.45);
  background: rgba(255, 184, 76, 0.1);
}
.aviso__icon {
  flex-shrink: 0;
  color: #ffb84c;
  filter: drop-shadow(0 0 6px rgba(255, 184, 76, 0.5));
}
.aviso__body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.aviso__text { color: var(--text); font-size: 0.92rem; line-height: 1.4; }
.aviso__acciones { display: flex; flex-wrap: wrap; gap: 8px; }
.aviso__btn {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  border: 1px solid #ffb84c;
  background: #ffb84c;
  color: #1a1206;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.aviso__btn--ghost {
  background: transparent;
  color: #ffb84c;
}
.aviso__btn:disabled { opacity: 0.6; cursor: default; }
.aviso__err { color: var(--danger); font-size: 0.82rem; }

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
