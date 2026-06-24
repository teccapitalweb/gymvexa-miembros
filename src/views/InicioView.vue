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

// Barra de progreso del periodo de membresía — SOLO presentación, sin lecturas
// nuevas: lee del snapshot ya cargado. Si no hay fecha de inicio, devuelve null
// y la barra simplemente no se muestra.
function aFechaLocal(v) {
  if (!v) return null
  if (typeof v?.toDate === 'function') return v.toDate()
  if (v instanceof Date) return v
  if (typeof v === 'number') return new Date(v)
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000)
  return null
}
const progreso = computed(() => {
  const m = socio.estadoMembresia
  if (!m) return null
  const ini = aFechaLocal(m.fechaInicio ?? m.fechaInicioMembresia ?? m.inicio ?? null)
  const fin = membresia.value.fechaFin
  if (!ini || !fin || fin <= ini) return null
  const total = fin.getTime() - ini.getTime()
  const transcurrido = Date.now() - ini.getTime()
  return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)))
})

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
        </header>

        <!-- Tarjeta de membresía (objeto firma, estilo wallet) -->
        <section class="card mcard" :class="`mcard--${membresia.tono}`">
          <div class="mcard__sheen" aria-hidden="true"></div>
          <div class="mcard__top">
            <span class="mcard__brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6.5 9v6" /><path d="M17.5 9v6" /><path d="M6.5 12h11" />
                <path d="M3.5 10.5v3" /><path d="M20.5 10.5v3" />
              </svg>
              Membresía
            </span>
            <span class="chip" :class="`chip--${membresia.tono}`">
              <span class="chip__dot"></span>
              {{ membresia.vigente ? 'Activa' : 'Vencida' }}
            </span>
          </div>

          <!-- Número grande: días restantes / estado -->
          <div class="mcard__hero">
            <template v-if="membresia.vigente && membresia.dias !== null && membresia.dias >= 0">
              <span class="mcard__num metric-xl" :class="{ 'num-gradient': membresia.tono === 'verde' }">
                {{ membresia.dias }}
              </span>
              <span class="mcard__unit">{{ membresia.dias === 1 ? 'día restante' : 'días restantes' }}</span>
            </template>
            <template v-else>
              <span class="mcard__estado">{{ membresia.etiqueta }}</span>
            </template>
          </div>

          <!-- Barra de progreso del periodo (solo si hay fecha de inicio en los datos) -->
          <div v-if="progreso !== null" class="mcard__bar" aria-hidden="true">
            <span class="mcard__bar-fill" :style="{ width: progreso + '%' }"></span>
          </div>

          <p class="mcard__plan" :class="{ 'mcard__plan--dim': !membresia.plan }">
            {{ membresia.plan || 'Plan no especificado' }}
          </p>
        </section>

        <!-- Saldo (estilo balance) -->
        <section class="card saldo">
          <div class="saldo__row">
            <div class="saldo__main">
              <span class="kicker">Saldo a favor</span>
              <span class="saldo__monto metric">{{ centavosAPesos(saldoCentavos) }}</span>
            </div>
            <span class="saldo__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
                <rect x="3" y="7" width="18" height="13" rx="2.5" />
                <path d="M16 12.5h2.5" />
              </svg>
            </span>
          </div>
          <div v-if="tieneDeuda" class="saldo__deuda">
            <span class="saldo__label">Adeudo</span>
            <span class="saldo__monto--deuda">{{ centavosAPesos(deudaCentavos) }}</span>
          </div>
        </section>

        <!-- Acceso rápido: Mi perfil (se quitó "Actividad", que duplicaba el enlace) -->
        <router-link to="/perfil" class="acceso">
          <span class="acceso__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
            </svg>
          </span>
          <span class="acceso__label">Mi perfil</span>
          <svg class="acceso__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </router-link>

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
.inicio { gap: var(--sp-4); }

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

/* Tarjeta de membresía (objeto firma, estilo wallet) */
.mcard {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
/* Acento contenido: gradiente fino en una esquina (no blob de glow). */
.mcard__sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(140% 90% at 100% 0%, rgba(76, 141, 255, 0.16), transparent 55%);
}
.mcard__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mcard__brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}
.mcard__brand svg { color: var(--accent-bright); }

.mcard__hero {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.mcard__num { color: var(--text); }   /* tamaño = .metric-xl; color según tono */
.mcard__unit { color: var(--text-dim); font-size: 0.98rem; font-weight: 600; }
.mcard__estado { font-family: var(--font-display); font-weight: 800; font-size: 1.7rem; letter-spacing: -0.02em; }
.mcard__plan { position: relative; color: var(--text-dim); font-size: 0.95rem; }
.mcard__plan--dim { opacity: 0.7; }

/* Barra de progreso del periodo (solo si hay fecha de inicio). */
.mcard__bar {
  position: relative;
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--surface-3);
  overflow: hidden;
}
.mcard__bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--grad-firma);
}

/* Tono por vigencia: borde sutil + color del número/estado/barra. */
.mcard--verde { border-color: rgba(43, 224, 166, 0.28); }
.mcard--verde .mcard__estado { color: var(--success); }
.mcard--ambar { border-color: rgba(255, 194, 75, 0.3); }
.mcard--ambar .mcard__num { color: var(--warn); }
.mcard--ambar .mcard__estado { color: var(--warn); }
.mcard--ambar .mcard__bar-fill { background: var(--warn); }
.mcard--rojo { border-color: rgba(255, 92, 114, 0.3); }
.mcard--rojo .mcard__num { color: var(--danger); }
.mcard--rojo .mcard__estado { color: var(--danger); }
.mcard--rojo .mcard__bar-fill { background: var(--danger); }
.mcard--gris .mcard__estado { color: var(--text-dim); }

/* Saldo (estilo balance) */
.saldo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.saldo__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.saldo__main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.saldo__monto { font-size: 2.1rem; color: var(--success); }
.saldo__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--r-md);
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid rgba(43, 224, 166, 0.25);
}
.saldo__deuda {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.saldo__label { color: var(--text-dim); font-size: 0.92rem; }
.saldo__monto--deuda { color: var(--danger); font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; }

/* Acceso rápido (fila con flecha) */
.acceso {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid var(--line);
  transition: transform 0.12s var(--ease), border-color 0.18s var(--ease), background 0.18s var(--ease);
}
.acceso:active { transform: scale(0.98); }
.acceso:hover { border-color: var(--accent); background: var(--surface-2); }
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
.acceso__label { flex: 1; font-weight: 700; font-size: 0.95rem; }
.acceso__arrow { color: var(--text-faint); }

.cta-checkin { height: 62px; font-size: 1.08rem; margin-top: 2px; }
</style>
