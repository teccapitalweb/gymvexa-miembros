<script setup>
// Perfil del socio (solo lectura): datos, membresía, saldo, visitas.
import { onMounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { centavosAPesos } from '../composables/useDinero'
import { interpretarMembresia } from '../composables/useMembresia'
import {
  pushSoportado,
  pushActivoLocal,
  permisoActual,
  iosNecesitaInstalar,
  iosDesactualizado,
  apiPushExiste,
  esIOS,
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
const notifIosViejo = ref(false)
const notifDenegado = ref(false)
const notifEsIos = ref(false)

async function refrescarEstadoPush() {
  notifEsIos.value = esIOS()
  notifIosInstalar.value = iosNecesitaInstalar() // iOS en Safari (falta instalar)
  notifIosViejo.value = iosDesactualizado() // iOS instalado pero < 16.4
  // "Bloqueado" SOLO si la API existe y el permiso fue negado de verdad.
  notifDenegado.value = apiPushExiste() && permisoActual() === 'denied'
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

// --- Mis redes (para los Reels) ---
// Se guardan UNA vez aquí y se reutilizan en todos los videos del miembro.
// Guardamos el USUARIO (no el link completo); el link se arma al mostrarlo.
const ig = ref('')
const tiktok = ref('')
const mostrarRedes = ref(true)
const redesTrabajando = ref(false)
const redesMsg = ref('')

watch(
  d,
  (val) => {
    ig.value = val.ig || ''
    tiktok.value = val.tiktok || ''
    mostrarRedes.value = val.mostrarRedes !== false
  },
  { immediate: true },
)

// Acepta que peguen el link completo o con @, y deja solo el usuario.
function limpiarUsuario(v) {
  let s = String(v || '').trim()
  const m = s.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i)
  if (m) s = m[1]
  return s.replace(/^@+/, '').replace(/\s+/g, '').slice(0, 40)
}

async function guardarRedes() {
  if (redesTrabajando.value) return
  if (!socio.gymId || !socio.socioId) return
  redesTrabajando.value = true
  redesMsg.value = ''
  try {
    ig.value = limpiarUsuario(ig.value)
    tiktok.value = limpiarUsuario(tiktok.value)
    await updateDoc(doc(db, 'gyms', socio.gymId, 'socios', socio.socioId), {
      ig: ig.value,
      tiktok: tiktok.value,
      mostrarRedes: mostrarRedes.value,
    })
    redesMsg.value = 'Guardado'
    setTimeout(() => {
      redesMsg.value = ''
    }, 2500)
  } catch {
    redesMsg.value = 'No se pudo guardar. Inténtalo de nuevo.'
  } finally {
    redesTrabajando.value = false
  }
}
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
        <p v-else-if="notifIosViejo && !notifActivo" class="notif__ayuda">
          Para recibir avisos, actualiza tu iPhone a iOS 16.4 o más reciente:
          Ajustes → General → Actualización de software.
        </p>
        <p v-else-if="notifDenegado && !notifActivo" class="notif__ayuda">
          Las notificaciones están bloqueadas.
          <template v-if="notifEsIos">Actívalas en Ajustes → Notificaciones → Gymvexa.</template>
          <template v-else>Actívalas en los ajustes de tu navegador para este sitio.</template>
        </p>
        <p v-else-if="!notifSoportado && !notifActivo" class="notif__ayuda">
          Tu navegador no admite notificaciones push.
        </p>
        <p v-if="notifMsg" class="notif__msg">{{ notifMsg }}</p>
      </section>

      <!-- Mis redes (para los Reels) -->
      <section class="card bloque">
        <h2 class="bloque__title">Mis redes</h2>
        <p class="redes__intro">
          Aparecerán como íconos en los videos que subas a Reels. Escribe solo tu usuario.
        </p>

        <label class="redes__campo">
          <span class="redes__ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span class="redes__at">@</span>
          <input
            v-model="ig"
            type="text"
            class="redes__input"
            placeholder="usuario de Instagram"
            autocapitalize="off"
            autocomplete="off"
            spellcheck="false"
          />
        </label>

        <label class="redes__campo">
          <span class="redes__ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
            </svg>
          </span>
          <span class="redes__at">@</span>
          <input
            v-model="tiktok"
            type="text"
            class="redes__input"
            placeholder="usuario de TikTok"
            autocapitalize="off"
            autocomplete="off"
            spellcheck="false"
          />
        </label>

        <div class="notif redes__toggle">
          <div class="notif__info">
            <span class="notif__label">Mostrar mis redes</span>
            <span class="notif__sub">En los videos que subo</span>
          </div>
          <button
            class="switch"
            :class="{ 'switch--on': mostrarRedes }"
            role="switch"
            :aria-checked="mostrarRedes ? 'true' : 'false'"
            aria-label="Mostrar mis redes"
            @click="mostrarRedes = !mostrarRedes"
          >
            <span class="switch__dot"></span>
          </button>
        </div>

        <button class="redes__guardar" :disabled="redesTrabajando" @click="guardarRedes">
          {{ redesTrabajando ? 'Guardando…' : 'Guardar' }}
        </button>
        <p v-if="redesMsg" class="notif__msg">{{ redesMsg }}</p>
      </section>

      <section class="card bloque">
        <button class="perfil-link" @click="router.push('/guardados')">
          <span class="perfil-link__ic">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
            </svg>
          </span>
          <span class="perfil-link__txt">
            <span class="perfil-link__t">Videos guardados</span>
            <span class="perfil-link__d">Los reels que marcaste con la estrella</span>
          </span>
          <span class="perfil-link__arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </span>
        </button>
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

/* Mis redes (para los Reels) */
.redes__intro {
  color: var(--text-dim);
  font-size: 0.86rem;
  line-height: 1.4;
  margin-bottom: 12px;
}
.redes__campo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 9px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
}
.redes__ic {
  display: flex;
  flex-shrink: 0;
  color: var(--text-dim);
}
.redes__ic svg { width: 20px; height: 20px; }
.redes__at { color: var(--text-faint); font-weight: 600; }
.redes__input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.95rem;
}
.redes__input::placeholder { color: var(--text-faint); }
.redes__toggle { margin-top: 4px; }
.redes__guardar {
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border-radius: var(--r-md);
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
  transition: opacity 0.18s ease, transform 0.12s ease;
}
.redes__guardar:disabled { opacity: 0.6; }
.redes__guardar:not(:disabled):active { transform: scale(0.99); }

/* Enlace a Videos guardados */
.perfil-link { display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; }
.perfil-link:active { opacity: 0.7; }
.perfil-link__ic {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); background: var(--accent-soft);
}
.perfil-link__txt { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.perfil-link__t { font-size: 0.98rem; font-weight: 700; color: var(--text); }
.perfil-link__d { font-size: 0.8rem; color: var(--text-dim); }
.perfil-link__arrow { color: var(--text-faint); flex-shrink: 0; display: flex; }
</style>
