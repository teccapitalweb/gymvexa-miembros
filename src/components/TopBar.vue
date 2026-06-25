<script setup>
// Header superior — estilo BioNova.
// Logo + campanita de notificaciones + botón día/noche.
//
// La campanita maneja DOS cosas de cumpleaños:
//  1) El cumpleaños del PROPIO socio (campo fechaNacimiento, que el panel guarda
//     como Timestamp). Se calcula LOCAL para que el cumpleañero vea su
//     felicitación al instante, aunque el backend tarde o falle.
//  2) Los cumpleaños de los DEMÁS socios del gym (comunidad). Como las reglas no
//     dejan que la app lea fichas ajenas, esto lo calcula el backend (Admin SDK)
//     y la app solo recibe nombres.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useRoute } from 'vue-router'
import { useTema } from '../composables/useTema'
import { useSocioStore } from '../stores/socio'
import { useDrawer } from '../composables/useDrawer'
import { obtenerCumpleanosHoy } from '../services/backend'

const { tema, toggle } = useTema()
const socio = useSocioStore()
const route = useRoute()
const { abierto: menuAbierto } = useDrawer()
const notifAbierta = ref(false)

// Cerrar el popover de notificaciones al cambiar de pestaña/ruta.
// (Antes solo se cerraba al tocar fuera; al navegar quedaba abierto.)
watch(() => route.fullPath, () => { notifAbierta.value = false })

// Cerrar el popover también al abrir el menú lateral (botón "Menú").
// El menú NO cambia de ruta (solo abre el drawer), por eso el watch de arriba
// no lo cubría y el cuadro de notis quedaba abierto encima.
watch(menuAbierto, (abierto) => { if (abierto) notifAbierta.value = false })

// Cumpleañeros de HOY en el gym (lista de { nombre, esYo }). Lo llena el backend.
const cumpleHoy = ref([])

// Mismo manejo del Timestamp que el panel del dueño (acepta Timestamp o Date).
function tsToDate(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (v instanceof Date) return v
  return null
}

// ¿Hoy es el cumpleaños del PROPIO socio? (día y mes, ignora el año).
const esCumple = computed(() => {
  const d = tsToDate(socio.datos?.fechaNacimiento)
  if (!d) return false
  const hoy = new Date()
  return d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate()
})

// Primer nombre a partir de un nombre completo ("Ana López" -> "Ana").
function primerNombreDe(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || ''
}
const primerNombre = computed(() => primerNombreDe(socio.nombreSocio))

// Une nombres en texto natural: "Ana", "Ana y Beto", "Ana, Beto y Caro".
function unirNombres(nombres) {
  const n = nombres.map(primerNombreDe).filter(Boolean)
  if (n.length === 0) return ''
  if (n.length === 1) return n[0]
  if (n.length === 2) return `${n[0]} y ${n[1]}`
  return `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

// OTROS cumpleañeros (todos menos el propio socio).
const otrosNombres = computed(() =>
  cumpleHoy.value.filter((c) => !c.esYo).map((c) => c.nombre),
)
const hayOtros = computed(() => otrosNombres.value.length > 0)
const variosOtros = computed(() => otrosNombres.value.length > 1)
const nombresOtros = computed(() => unirNombres(otrosNombres.value))

// Puntito de aviso: si yo cumplo, cumple alguien más, o hay avisos sin leer.
const hayNovedad = computed(
  () => esCumple.value || hayOtros.value || noLeidas.value > 0,
)

// Carga los cumpleañeros del día desde el backend (cuando hay socio vinculado).
async function cargarCumpleanos() {
  if (!socio.socioId) {
    cumpleHoy.value = []
    return
  }
  cumpleHoy.value = await obtenerCumpleanosHoy()
}

onMounted(() => {
  cargarCumpleanos()
  suscribirNotis()
})
// Si el socio se carga/cambia después de montar, recargamos.
watch(() => socio.socioId, () => {
  cargarCumpleanos()
  suscribirNotis()
})
onUnmounted(desuscribirNotis)

// ---------------------------------------------------------------------------
// Avisos del FORO (like / comentario). Se leen DIRECTO de Firestore: las reglas
// dejan que cada socio lea las SUYAS (por paraSocioId). Las CREA el backend;
// aquí solo se listan, se marcan como leídas al abrir y se pueden quitar.
// ---------------------------------------------------------------------------
const notis = ref([])
let unsubNotis = null

function suscribirNotis() {
  desuscribirNotis()
  const gymId = socio.gymId
  const socioId = socio.socioId
  if (!gymId || !socioId) {
    notis.value = []
    return
  }
  // Solo filtro por igualdad (usa el índice automático; NO requiere índice
  // compuesto). El orden por fecha y el corte se hacen en el cliente.
  const q = query(
    collection(db, 'gyms', gymId, 'notificaciones'),
    where('paraSocioId', '==', socioId),
  )
  unsubNotis = onSnapshot(
    q,
    (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      arr.sort((a, b) => msDe(b.creadoEn) - msDe(a.creadoEn))
      notis.value = arr.slice(0, 30)
    },
    (e) => {
      console.error('[notis] onSnapshot:', e)
    },
  )
}
function desuscribirNotis() {
  if (unsubNotis) {
    unsubNotis()
    unsubNotis = null
  }
}

const noLeidas = computed(
  () => notis.value.filter((n) => n.leida !== true).length,
)

// Al abrir la campana, marca como leídas (campo `leida`, el único que las reglas
// dejan tocar al socio).
async function marcarLeidas() {
  const gymId = socio.gymId
  if (!gymId) return
  const pendientes = notis.value.filter((n) => n.leida !== true)
  await Promise.all(
    pendientes.map((n) =>
      updateDoc(doc(db, 'gyms', gymId, 'notificaciones', n.id), {
        leida: true,
      }).catch(() => {}),
    ),
  )
}
watch(notifAbierta, (abierta) => {
  if (abierta && noLeidas.value > 0) marcarLeidas()
})

async function quitarNoti(n) {
  const gymId = socio.gymId
  if (!gymId) return
  try {
    await deleteDoc(doc(db, 'gyms', gymId, 'notificaciones', n.id))
  } catch (e) {
    console.error('[notis] borrar:', e)
  }
}

// Timestamp de Firestore -> ms (para ordenar y para el tiempo relativo).
function msDe(creadoEn) {
  if (creadoEn?.toMillis) return creadoEn.toMillis()
  if (typeof creadoEn?.seconds === 'number') return creadoEn.seconds * 1000
  return 0
}

// Tiempo relativo corto para los avisos.
function hace(creadoEn) {
  const ms = msDe(creadoEn)
  if (!ms) return 'ahora'
  const diff = Math.max(0, Date.now() - ms)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} d`
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <!-- Logo -->
      <router-link to="/inicio" class="topbar__brand" aria-label="Inicio">
        <img src="/gymvexa-icon.png" alt="" class="topbar__logo" />
        <span class="topbar__name">Gymvexa</span>
      </router-link>

      <!-- Acciones -->
      <div class="topbar__actions">
        <!-- Campanita -->
        <div class="topbar__notif">
          <button
            class="tbtn"
            type="button"
            @click="notifAbierta = !notifAbierta"
            :class="{ 'tbtn--on': notifAbierta }"
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span v-if="hayNovedad" class="tbtn__dot" aria-hidden="true"></span>
          </button>

          <transition name="pop">
            <div v-if="notifAbierta" class="notif-pop" role="dialog" aria-label="Notificaciones">
              <p class="notif-pop__title">Notificaciones</p>

              <!-- 1) MI cumpleaños (con o sin otros) -->
              <div v-if="esCumple" class="bday">
                <span class="bday__confeti bday__confeti--1" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--2" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--3" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--4" aria-hidden="true"></span>
                <span class="bday__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 21h16" />
                    <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                    <path d="M5 15c1.4 0 1.4 1 2.8 1s1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.8-1 1.4 1 2.8 1" />
                    <path d="M8 12V9M12 12V8.5M16 12V9" />
                    <path d="M8 6.6h.01M12 5.6h.01M16 6.6h.01" />
                  </svg>
                </span>
                <p class="bday__title">¡Feliz cumpleaños<template v-if="primerNombre">, {{ primerNombre }}</template>!</p>
                <p class="bday__text">Todo el equipo de tu gimnasio te desea un día increíble.</p>
                <p v-if="hayOtros" class="bday__extra">
                  Hoy también cumple<template v-if="variosOtros">n</template> {{ nombresOtros }}.
                  <template v-if="variosOtros">¡Felicítalos!</template>
                  <template v-else>¡Mándale tus felicitaciones!</template>
                </p>
              </div>

              <!-- 2) No es mi cumpleaños, pero cumple alguien más -->
              <div v-else-if="hayOtros" class="bday">
                <span class="bday__confeti bday__confeti--1" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--2" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--3" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--4" aria-hidden="true"></span>
                <span class="bday__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 21h16" />
                    <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                    <path d="M5 15c1.4 0 1.4 1 2.8 1s1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.8-1 1.4 1 2.8 1" />
                    <path d="M8 12V9M12 12V8.5M16 12V9" />
                    <path d="M8 6.6h.01M12 5.6h.01M16 6.6h.01" />
                  </svg>
                </span>
                <p class="bday__title">
                  <template v-if="variosOtros">Hoy cumplen años: {{ nombresOtros }}</template>
                  <template v-else>Hoy cumple años {{ nombresOtros }}</template>
                </p>
                <p class="bday__text">
                  <template v-if="variosOtros">¡Felicítalos!</template>
                  <template v-else>¡Hazle el día con una felicitación!</template>
                </p>
              </div>

              <!-- Avisos del foro (like / comentario) -->
              <div
                v-if="notis.length"
                class="nlist"
                :class="{ 'nlist--sep': esCumple || hayOtros }"
              >
                <div
                  v-for="n in notis"
                  :key="n.id"
                  class="nitem"
                  :class="{ 'nitem--unread': n.leida !== true }"
                >
                  <span
                    class="nitem__icon"
                    :class="n.tipo === 'like' ? 'nitem__icon--like' : 'nitem__icon--com'"
                  >
                    <svg v-if="n.tipo === 'like'" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-3.2A8.4 8.4 0 0 1 3 11.5a8.38 8.38 0 0 1 9-8.3 8.38 8.38 0 0 1 9 8.3z" />
                    </svg>
                  </span>
                  <div class="nitem__body">
                    <p class="nitem__text">
                      <strong>{{ primerNombreDe(n.deNombre) || 'Alguien' }}</strong>
                      <template v-if="n.tipo === 'like'"> le dio me gusta a tu publicación</template>
                      <template v-else> comentó tu publicación</template>
                    </p>
                    <p v-if="n.extracto" class="nitem__extracto">"{{ n.extracto }}"</p>
                    <span class="nitem__fecha">{{ hace(n.creadoEn) }}</span>
                  </div>
                  <button
                    class="nitem__del"
                    type="button"
                    aria-label="Quitar aviso"
                    @click="quitarNoti(n)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Sin novedades -->
              <div v-if="!esCumple && !hayOtros && !notis.length" class="notif-pop__empty">
                <span class="notif-pop__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <p class="notif-pop__text">Aquí llegarán tus avisos y felicitaciones. ¡Muy pronto!</p>
              </div>
            </div>
          </transition>
        </div>

        <!-- Día / noche -->
        <button
          class="tbtn"
          type="button"
          @click="toggle"
          :aria-label="tema === 'light' ? 'Activar modo noche' : 'Activar modo día'"
        >
          <svg v-if="tema === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Capa para cerrar el popover al tocar fuera -->
    <div v-if="notifAbierta" class="notif-overlay" @click="notifAbierta = false" aria-hidden="true"></div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  /* Fondo OPACO por defecto: en Android (sobre todo como PWA) el backdrop-filter
     no se renderiza y un fondo translúcido dejaría ver lo de atrás (se ve
     transparente). El vidrio se aplica más abajo solo donde sí hay soporte. */
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding-top: var(--safe-top);
}
/* Solo navegadores que SÍ aplican el desenfoque (iOS Safari, Chrome desktop…)
   usan el vidrio translúcido. */
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .topbar {
    background: var(--surface-glass);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }
}
.topbar__inner {
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--safe-right) + 16px) 0 calc(var(--safe-left) + 16px);
}

/* Marca */
.topbar__brand {
  display: flex;
  align-items: center;
  gap: 9px;
  -webkit-tap-highlight-color: transparent;
}
.topbar__logo {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  object-fit: contain;
}
.topbar__name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  background: var(--grad-firma);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Botones de acción */
.topbar__actions { display: flex; align-items: center; gap: 8px; }
.topbar__notif { position: relative; }
.tbtn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition: color 0.18s var(--ease), background 0.18s var(--ease), border-color 0.18s var(--ease), transform 0.18s var(--ease);
}
.tbtn:hover { color: var(--text); border-color: var(--line-strong); }
.tbtn:active { transform: scale(0.94); }
.tbtn--on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.tbtn svg { width: 19px; height: 19px; }
.tbtn__dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  border: 2px solid var(--surface);
}

/* Popover de notificaciones */
.notif-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.notif-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  width: 264px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  padding: 14px;
}
.notif-pop__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--text);
  margin: 0 0 12px;
}
.notif-pop__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 8px 4px 4px;
}
.notif-pop__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
}
.notif-pop__icon svg { width: 22px; height: 22px; }
.notif-pop__text {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
}

/* Cumpleaños */
.bday {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 12px 6px 6px;
}
.bday__icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 8px 20px var(--glow);
}
.bday__icon svg { width: 28px; height: 28px; }
.bday__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1rem;
  color: var(--text);
  margin: 0;
  line-height: 1.25;
}
.bday__text {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
}
.bday__extra {
  margin: 4px 0 0;
  padding-top: 10px;
  width: 100%;
  border-top: 1px solid var(--line);
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-dim);
}
.bday__confeti {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  opacity: 0.9;
}
.bday__confeti--1 { top: 6px; left: 18px; background: var(--accent); transform: rotate(20deg); }
.bday__confeti--2 { top: 14px; right: 22px; background: var(--success); transform: rotate(-15deg); }
.bday__confeti--3 { top: 30px; left: 30px; width: 5px; height: 5px; border-radius: 50%; background: var(--warn); }
.bday__confeti--4 { top: 24px; right: 34px; width: 5px; height: 5px; border-radius: 50%; background: var(--cyan-bright); }

/* Lista de avisos del foro */
.nlist {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 44vh;
  overflow-y: auto;
  margin: 0 -4px;
  padding: 0 4px;
}
.nlist--sep {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.nitem {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 9px 6px;
  border-radius: 12px;
  transition: background 0.18s var(--ease);
}
.nitem--unread { background: var(--accent-soft); }
.nitem__icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  margin-top: 1px;
}
.nitem__icon svg { width: 15px; height: 15px; }
.nitem__icon--like { background: var(--danger-soft); color: var(--danger); }
.nitem__icon--com { background: var(--accent-soft); color: var(--accent); }
.nitem__body { flex: 1; min-width: 0; }
.nitem__text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--text-dim);
}
.nitem__text strong { color: var(--text); font-weight: 700; }
.nitem__extracto {
  margin: 2px 0 0;
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--text-faint);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nitem__fecha {
  display: block;
  margin-top: 3px;
  font-size: 0.7rem;
  color: var(--text-faint);
}
.nitem__del {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  opacity: 0.7;
  transition: color 0.18s, opacity 0.18s;
}
.nitem__del:hover { color: var(--danger); opacity: 1; }
.nitem__del svg { width: 13px; height: 13px; }

/* Animación del popover */
.pop-enter-active, .pop-leave-active { transition: opacity 0.18s var(--ease), transform 0.18s var(--ease); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>
