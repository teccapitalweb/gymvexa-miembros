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

      <div class="inicio__body stagger">
        <header class="inicio__head">
          <div>
            <p class="inicio__hi">Hola,</p>
            <h1 class="inicio__name display">{{ primerNombre }}</h1>
          </div>
          <span class="inicio__pulse" :class="`inicio__pulse--${membresia.tono}`" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12h4l2.5 7L14 4l2.5 8H21" />
            </svg>
          </span>
        </header>

        <!-- Tarjeta héroe de membresía -->
        <section class="card mcard" :class="`mcard--${membresia.tono}`">
          <div class="mcard__glow" aria-hidden="true"></div>
          <div class="mcard__top">
            <span class="chip" :class="`chip--${membresia.tono}`">
              <span class="chip__dot"></span>
              {{ membresia.vigente ? 'Activa' : 'Vencida' }}
            </span>
            <span class="mcard__label kicker">Membresía</span>
          </div>

          <!-- Número grande: días restantes / estado -->
          <div class="mcard__hero">
            <template v-if="membresia.vigente && membresia.dias !== null && membresia.dias >= 0">
              <span class="mcard__num metric">{{ membresia.dias }}</span>
              <span class="mcard__unit">{{ membresia.dias === 1 ? 'día restante' : 'días restantes' }}</span>
            </template>
            <template v-else>
              <span class="mcard__estado">{{ membresia.etiqueta }}</span>
            </template>
          </div>

          <p v-if="membresia.plan" class="mcard__plan">{{ membresia.plan }}</p>
          <p v-else class="mcard__plan mcard__plan--dim">Plan no especificado</p>
        </section>

        <!-- Tarjeta de saldo (monedero) -->
        <section class="card saldo">
          <div class="saldo__main">
            <span class="kicker">Saldo a favor</span>
            <span class="saldo__monto metric">{{ centavosAPesos(saldoCentavos) }}</span>
          </div>
          <span class="saldo__icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
              <rect x="3" y="7" width="18" height="13" rx="2.5" />
              <path d="M16 12.5h2.5" />
            </svg>
          </span>
          <div v-if="tieneDeuda" class="saldo__deuda">
            <span class="saldo__label">Adeudo</span>
            <span class="saldo__monto--deuda">{{ centavosAPesos(deudaCentavos) }}</span>
          </div>
        </section>

        <!-- Accesos rápidos -->
        <div class="accesos">
          <router-link to="/perfil" class="acceso">
            <span class="acceso__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
              </svg>
            </span>
            <span class="acceso__label">Mi perfil</span>
          </router-link>
          <router-link to="/perfil" class="acceso">
            <span class="acceso__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12h4l2.5 7L14 4l2.5 8H21" />
              </svg>
            </span>
            <span class="acceso__label">Actividad</span>
          </router-link>
        </div>

        <!-- CTA check-in (protagonista) -->
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
      </div>
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

.inicio__body { display: flex; flex-direction: column; gap: 18px; }

.inicio__head {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.inicio__hi { color: var(--text-dim); font-size: 1rem; }
.inicio__name {
  font-size: 2.1rem; text-transform: capitalize; margin-top: 2px;
}
.inicio__pulse {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--r-md);
  color: var(--cyan-bright);
  background: var(--surface-2);
  border: 1px solid var(--border);
  box-shadow: inset 0 0 14px rgba(56, 189, 248, 0.12);
}
.inicio__pulse--verde { color: var(--success); }
.inicio__pulse--ambar { color: var(--warn); }
.inicio__pulse--rojo  { color: var(--danger); }

/* Tarjeta héroe de membresía con tono según vigencia */
.mcard {
  position: relative;
  overflow: hidden;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* Glow superior según el tono. */
.mcard__glow {
  position: absolute;
  top: -60%;
  right: -20%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 60%);
  opacity: 0.5;
  pointer-events: none;
}
.mcard__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mcard__label { color: var(--text-faint); }

.mcard__hero {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.mcard__num {
  font-size: 4.2rem;
  background: linear-gradient(180deg, #ffffff, #c8d8f5);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.mcard__unit { color: var(--text-dim); font-size: 0.98rem; font-weight: 600; }
.mcard__estado { font-family: var(--font-display); font-weight: 800; font-size: 1.7rem; letter-spacing: -0.02em; }
.mcard__plan { position: relative; color: var(--text-dim); font-size: 0.95rem; }
.mcard__plan--dim { opacity: 0.7; }

.mcard--verde { border-color: rgba(47, 224, 173, 0.4); }
.mcard--verde .mcard__glow { background: radial-gradient(circle, var(--success-glow), transparent 60%); }
.mcard--verde .mcard__estado { color: var(--success); }
.mcard--ambar { border-color: rgba(255, 184, 76, 0.45); }
.mcard--ambar .mcard__glow { background: radial-gradient(circle, var(--warn-glow), transparent 60%); }
.mcard--ambar .mcard__num { -webkit-text-fill-color: var(--warn); }
.mcard--ambar .mcard__estado { color: var(--warn); }
.mcard--rojo { border-color: rgba(255, 90, 118, 0.45); }
.mcard--rojo .mcard__glow { background: radial-gradient(circle, var(--danger-glow), transparent 60%); }
.mcard--rojo .mcard__num { -webkit-text-fill-color: var(--danger); }
.mcard--rojo .mcard__estado { color: var(--danger); }
.mcard--gris .mcard__estado { color: var(--text-dim); }

/* Tarjeta de saldo (monedero) */
.saldo {
  position: relative;
  overflow: hidden;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.saldo__main { display: flex; flex-direction: column; gap: 8px; }
.saldo__monto { font-size: 2.1rem; color: var(--success); text-shadow: 0 0 22px var(--success-glow); }
.saldo__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: var(--r-md);
  color: var(--success);
  background: rgba(47, 224, 173, 0.1);
  border: 1px solid rgba(47, 224, 173, 0.28);
}
.saldo__deuda {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.saldo__label { color: var(--text-dim); font-size: 0.92rem; }
.saldo__monto--deuda { color: var(--danger); font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; }

/* Accesos rápidos */
.accesos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.acceso {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: transform 0.12s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.acceso:active { transform: scale(0.97); }
.acceso:hover { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-soft); }
.acceso__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  color: var(--cyan-bright);
  background: var(--surface-2);
}
.acceso__label { font-weight: 700; font-size: 0.92rem; }

.cta-checkin { height: 62px; font-size: 1.08rem; margin-top: 2px; }
</style>
