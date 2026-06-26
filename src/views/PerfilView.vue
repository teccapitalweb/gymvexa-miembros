<script setup>
// Perfil del socio (solo lectura): datos, membresía, saldo, visitas.
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'
import { centavosAPesos } from '../composables/useDinero'
import { interpretarMembresia } from '../composables/useMembresia'
import {
  pushSoportado,
  pushActivoLocal,
  permisoActual,
  iosNecesitaInstalar,
  activarPush,
  desactivarPush,
} from '../composables/usePush'

const router = useRouter()
const auth = useAuthStore()
const socio = useSocioStore()

// --- Notificaciones push ---
const notifSoportado = ref(false)
const notifActivo = ref(false)
const notifTrabajando = ref(false)
const notifMsg = ref('')
const notifIosInstalar = ref(false)
const notifDenegado = ref(false)

async function refrescarEstadoPush() {
  notifIosInstalar.value = iosNecesitaInstalar()
  notifDenegado.value = permisoActual() === 'denied'
  notifSoportado.value = await pushSoportado()
  notifActivo.value = pushActivoLocal()
}

async function alternarPush() {
  if (notifTrabajando.value) return
  notifMsg.value = ''
  notifTrabajando.value = true
  try {
    if (notifActivo.value) {
      await desactivarPush()
      notifActivo.value = false
    } else {
      const r = await activarPush()
      if (r.ok) {
        notifActivo.value = true
        notifMsg.value = 'Listo, recibirás los avisos de tu gimnasio.'
      } else {
        notifActivo.value = false
        if (r.motivo === 'denegado') {
          notifMsg.value = 'Permiso bloqueado. Actívalo en los ajustes de tu navegador.'
          notifDenegado.value = true
        } else if (r.motivo === 'ios_instalar') {
          notifMsg.value = 'En iPhone, primero instala la app en tu pantalla de inicio.'
          notifIosInstalar.value = true
        } else if (r.motivo === 'no_soportado') {
          notifMsg.value = 'Tu navegador no admite notificaciones.'
        } else {
          notifMsg.value = 'No se pudo activar. Inténtalo de nuevo.'
        }
      }
    }
  } finally {
    notifTrabajando.value = false
  }
}

onMounted(() => {
  // Si se entra directo a /perfil, aseguramos la vinculación.
  if (!socio.estaVinculado && !socio.resuelto) socio.vincularSocio()
  refrescarEstadoPush()
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

      <!-- Notificaciones push -->
      <section class="card bloque">
        <h2 class="bloque__title">Notificaciones</h2>
        <div class="notif">
          <div class="notif__info">
            <span class="notif__label">Avisos del gimnasio</span>
            <span class="notif__sub">Promos, descuentos y novedades</span>
          </div>
          <button
            v-if="(notifSoportado && !notifDenegado) || notifActivo"
            class="switch"
            :class="{ 'switch--on': notifActivo }"
            :disabled="notifTrabajando"
            role="switch"
            :aria-checked="notifActivo ? 'true' : 'false'"
            aria-label="Avisos del gimnasio"
            @click="alternarPush"
          >
            <span class="switch__dot"></span>
          </button>
        </div>

        <p v-if="notifIosInstalar && !notifActivo" class="notif__ayuda">
          Para recibir avisos en iPhone, instala la app en tu pantalla de inicio
          (botón Compartir → Agregar a inicio).
        </p>
        <p v-else-if="notifDenegado && !notifActivo" class="notif__ayuda">
          Las notificaciones están bloqueadas. Actívalas en los ajustes de tu navegador
          para este sitio.
        </p>
        <p v-else-if="!notifSoportado && !notifActivo" class="notif__ayuda">
          Tu navegador no admite notificaciones push.
        </p>
        <p v-if="notifMsg" class="notif__msg">{{ notifMsg }}</p>
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
  opacity: 0.3;
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
  background: var(--grad-firma);
  box-shadow: 0 12px 30px var(--glow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
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
.perfil__email {
  position: relative;
  max-width: 100%;
  color: var(--text-dim);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

/* Notificaciones push */
.notif { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.notif__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.notif__label { font-weight: 700; font-size: 0.98rem; }
.notif__sub { color: var(--text-dim); font-size: 0.82rem; }
.notif__ayuda { color: var(--text-dim); font-size: 0.82rem; line-height: 1.4; margin-top: 2px; }
.notif__msg { color: var(--cyan-bright); font-size: 0.84rem; line-height: 1.4; margin-top: 2px; }

/* Switch (toggle) */
.switch {
  flex-shrink: 0;
  position: relative;
  width: 50px;
  height: 30px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid var(--border-soft);
  transition: background 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.switch:disabled { opacity: 0.6; }
.switch__dot {
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}
.switch--on {
  background: linear-gradient(135deg, var(--accent-bright), var(--accent-deep));
  border-color: transparent;
  box-shadow: 0 0 16px var(--accent-glow);
}
.switch--on .switch__dot { transform: translateY(-50%) translateX(20px); }
.switch:not(:disabled):active .switch__dot { width: 27px; }
</style>
