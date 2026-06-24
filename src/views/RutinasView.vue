<script setup>
// Rutinas prediseñadas: el socio VE las 8 rutinas, las filtra (nivel/objetivo/días),
// abre el detalle (días + ejercicios con series×reps) y ELIGE una como "su rutina".
// La elección se guarda en localStorage (v1, sin backend). El registro de avance es
// fase posterior (aquí solo ver y elegir).
import { ref, computed } from 'vue'
import { RUTINAS_PREDISENADAS, NIVELES, OBJETIVOS } from '../data/rutinasPredisenadas'

const STORAGE_KEY = 'gv-rutina-activa'

// --- Elección persistida ---
const rutinaActivaId = ref(leerActiva())
function leerActiva() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}
function elegir(id) {
  rutinaActivaId.value = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* sin localStorage: la elección vale solo en esta sesión */
  }
}
function quitar() {
  rutinaActivaId.value = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no pasa nada */
  }
}

const rutinaActiva = computed(
  () => RUTINAS_PREDISENADAS.find((r) => r.id === rutinaActivaId.value) || null,
)

// --- Filtros ---
const fNivel = ref(null)
const fObjetivo = ref(null)
const fDias = ref(null)

const diasOpciones = [...new Set(RUTINAS_PREDISENADAS.map((r) => r.diasPorSemana))].sort(
  (a, b) => a - b,
)

function toggle(refFiltro, valor) {
  refFiltro.value = refFiltro.value === valor ? null : valor
}
function limpiarFiltros() {
  fNivel.value = null
  fObjetivo.value = null
  fDias.value = null
}
const hayFiltros = computed(
  () => fNivel.value !== null || fObjetivo.value !== null || fDias.value !== null,
)

const rutinasFiltradas = computed(() =>
  RUTINAS_PREDISENADAS.filter((r) => {
    if (fNivel.value && r.nivel !== fNivel.value) return false
    if (fObjetivo.value && r.objetivo !== fObjetivo.value) return false
    if (fDias.value && r.diasPorSemana !== fDias.value) return false
    return true
  }),
)

// --- Detalle (panel dentro de la misma vista) ---
const abiertaId = ref(null)
const rutinaAbierta = computed(
  () => RUTINAS_PREDISENADAS.find((r) => r.id === abiertaId.value) || null,
)
function abrir(id) {
  abiertaId.value = id
  window.scrollTo(0, 0)
}
function cerrarDetalle() {
  abiertaId.value = null
}

function totalEjercicios(rutina) {
  return rutina.dias.reduce((n, d) => n + d.ejercicios.length, 0)
}

// --- Metadatos de presentación ---
const nivelLabel = (id) => NIVELES.find((n) => n.id === id)?.label || id
const objetivoLabel = (id) => OBJETIVOS.find((o) => o.id === id)?.label || id

// Color/acento por objetivo (para las tarjetas), dentro de la paleta Quiet Neon.
const OBJ_META = {
  general: { label: 'General', color: '#22d3ee' },
  gluteo: { label: 'Glúteo', color: '#f472b6' },
  musculo: { label: 'Músculo', color: '#60a5fa' },
  fuerza: { label: 'Fuerza', color: '#fbbf24' },
  definicion: { label: 'Definición', color: '#34d399' },
}
const objMeta = (id) => OBJ_META[id] || OBJ_META.general

// --- Íconos por grupo muscular (set reducido por "familia": pecho, espalda,
// hombro, brazo, pierna, core, cardio). Cada ejercicio muestra además su grupo
// como texto, así que el set reducido se lee con claridad. ---
const FAMILIA = {
  pecho: 'pecho',
  espalda: 'espalda',
  hombro: 'hombro',
  biceps: 'brazo',
  triceps: 'brazo',
  antebrazo: 'brazo',
  cuadriceps: 'pierna',
  femoral: 'pierna',
  gluteo: 'pierna',
  pantorrilla: 'pierna',
  core: 'core',
  cardio: 'cardio',
}
const FAMILIA_COLOR = {
  pecho: '#22d3ee',
  espalda: '#34d399',
  hombro: '#60a5fa',
  brazo: '#a78bfa',
  pierna: '#fbbf24',
  core: '#f472b6',
  cardio: '#fb7185',
}
// Trazos SVG (inner) por familia. Se pintan dentro de un <svg> con stroke.
const FAMILIA_SVG = {
  pecho: '<rect x="4" y="6" width="16" height="12" rx="4"/><path d="M12 6v12M4.5 12h15"/>',
  espalda: '<path d="M12 4v16"/><path d="M12 8c-2 1.4-4.5 2-6.5 2M12 8c2 1.4 4.5 2 6.5 2M12 14c-2 1.4-4.5 2-6.5 2M12 14c2 1.4 4.5 2 6.5 2"/>',
  hombro: '<circle cx="12" cy="8" r="3"/><path d="M5 19c0-4 3.1-7 7-7s7 3 7 7"/>',
  brazo: '<path d="M6 7h4a3 3 0 0 1 3 3v1a4 4 0 0 0 4 4"/><path d="M6 7v6"/>',
  pierna: '<path d="M10 4v6l-2.5 10M10 10l4.5 1L17 20"/>',
  core: '<rect x="7" y="4" width="10" height="16" rx="3"/><path d="M7 9.5h10M7 14.5h10M12 4v16"/>',
  cardio: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z"/>',
}
const DUMBBELL = '<path d="M6.5 9v6M17.5 9v6M6.5 12h11M3.5 10.5v3M20.5 10.5v3"/>'

const familia = (grupo) => FAMILIA[grupo] || null
const grupoColor = (grupo) => FAMILIA_COLOR[familia(grupo)] || '#9fb0cc'
const grupoSvg = (grupo) => FAMILIA_SVG[familia(grupo)] || DUMBBELL
</script>

<template>
  <main class="screen screen--with-nav rutinas">
    <!-- ===================== DETALLE DE RUTINA ===================== -->
    <template v-if="rutinaAbierta">
      <button class="volver" type="button" @click="cerrarDetalle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>Rutinas</span>
      </button>

      <header class="det-head card" :style="{ '--obj': objMeta(rutinaAbierta.objetivo).color }">
        <div class="det-head__glow" aria-hidden="true"></div>
        <h1 class="det-head__title display">{{ rutinaAbierta.nombre }}</h1>
        <p class="det-head__desc">{{ rutinaAbierta.descripcion }}</p>
        <div class="badges">
          <span class="badge badge--obj">{{ objetivoLabel(rutinaAbierta.objetivo) }}</span>
          <span class="badge">{{ nivelLabel(rutinaAbierta.nivel) }}</span>
          <span class="badge">{{ rutinaAbierta.diasPorSemana }} días/sem</span>
          <span class="badge">{{ totalEjercicios(rutinaAbierta) }} ejercicios</span>
        </div>
      </header>

      <section v-for="(dia, di) in rutinaAbierta.dias" :key="di" class="card dia">
        <h2 class="dia__title">{{ dia.nombre }}</h2>
        <ul class="ejs">
          <li v-for="(e, ei) in dia.ejercicios" :key="ei" class="ejx">
            <span class="ejx__ic" :style="{ color: grupoColor(e.grupo) }" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                   v-html="grupoSvg(e.grupo)"></svg>
            </span>
            <span class="ejx__body">
              <span class="ejx__name">{{ e.nombre }}</span>
              <span class="ejx__meta">
                <span class="ejx__grupo">{{ e.grupo }}</span>
                <span v-if="e.notas" class="ejx__nota">· {{ e.notas }}</span>
              </span>
            </span>
            <span class="ejx__sr">
              <span class="ejx__reps">{{ e.series }} × {{ e.reps }}</span>
              <span class="ejx__rest">descanso {{ e.descanso }}</span>
            </span>
          </li>
        </ul>
      </section>

      <!-- Elegir / quitar -->
      <button
        v-if="rutinaActivaId !== rutinaAbierta.id"
        class="btn btn--primary elegir"
        @click="elegir(rutinaAbierta.id)"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>Elegir esta rutina</span>
      </button>
      <div v-else class="elegida">
        <span class="elegida__tag">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Esta es tu rutina
        </span>
        <button class="btn btn--ghost" @click="quitar">Quitar</button>
      </div>
    </template>

    <!-- ===================== HUB / LISTA ===================== -->
    <template v-else>
      <header class="vista-head">
        <h1 class="vista-title">Rutinas</h1>
        <p class="vista-sub">Planes listos para seguir. Elige el tuyo según tu nivel y objetivo.</p>
      </header>

      <!-- Tu rutina actual -->
      <button v-if="rutinaActiva" class="actual" @click="abrir(rutinaActiva.id)">
        <span class="actual__kicker">Tu rutina actual</span>
        <span class="actual__name">{{ rutinaActiva.nombre }}</span>
        <span class="actual__meta">
          {{ objetivoLabel(rutinaActiva.objetivo) }} · {{ nivelLabel(rutinaActiva.nivel) }} ·
          {{ rutinaActiva.diasPorSemana }} días/sem
        </span>
        <svg class="actual__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <!-- Filtros -->
      <section class="filtros">
        <div class="filtro">
          <span class="filtro__lab">Nivel</span>
          <div class="chips">
            <button
              v-for="n in NIVELES"
              :key="n.id"
              class="fchip"
              :class="{ 'fchip--on': fNivel === n.id }"
              @click="toggle(fNivel, n.id)"
            >{{ n.label }}</button>
          </div>
        </div>
        <div class="filtro">
          <span class="filtro__lab">Objetivo</span>
          <div class="chips">
            <button
              v-for="o in OBJETIVOS"
              :key="o.id"
              class="fchip"
              :class="{ 'fchip--on': fObjetivo === o.id }"
              @click="toggle(fObjetivo, o.id)"
            >{{ o.label }}</button>
          </div>
        </div>
        <div class="filtro">
          <span class="filtro__lab">Días por semana</span>
          <div class="chips">
            <button
              v-for="d in diasOpciones"
              :key="d"
              class="fchip"
              :class="{ 'fchip--on': fDias === d }"
              @click="toggle(fDias, d)"
            >{{ d }} días</button>
          </div>
        </div>
        <button v-if="hayFiltros" class="limpiar" @click="limpiarFiltros">Limpiar filtros</button>
      </section>

      <!-- Lista de rutinas -->
      <section class="lista">
        <article
          v-for="r in rutinasFiltradas"
          :key="r.id"
          class="card rcard"
          :class="{ 'rcard--activa': r.id === rutinaActivaId }"
          :style="{ '--obj': objMeta(r.objetivo).color }"
          @click="abrir(r.id)"
        >
          <div class="rcard__top">
            <span class="rcard__obj">{{ objetivoLabel(r.objetivo) }}</span>
            <span v-if="r.id === rutinaActivaId" class="rcard__mia">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Mi rutina
            </span>
          </div>
          <h2 class="rcard__name">{{ r.nombre }}</h2>
          <p class="rcard__desc">{{ r.descripcion }}</p>
          <div class="rcard__foot">
            <span class="tag">{{ nivelLabel(r.nivel) }}</span>
            <span class="tag">{{ r.diasPorSemana }} días/sem</span>
            <svg class="rcard__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </article>

        <!-- Vacío -->
        <div v-if="rutinasFiltradas.length === 0" class="vacio">
          <span class="vacio__ic" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <p class="vacio__txt">Ninguna rutina coincide con esos filtros.</p>
          <button class="btn btn--ghost" @click="limpiarFiltros">Limpiar filtros</button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.rutinas { gap: 16px; }

/* ---------- Volver ---------- */
.volver {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 8px 12px 8px 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: var(--r-pill);
  color: var(--text-dim);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.86rem;
  cursor: pointer;
  transition: color 0.18s var(--ease), border-color 0.18s var(--ease);
}
.volver:hover { color: var(--text); border-color: var(--accent); }

/* ---------- Detalle: encabezado ---------- */
.det-head {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.det-head__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(130% 90% at 100% 0%, color-mix(in srgb, var(--obj) 22%, transparent), transparent 58%);
}
.det-head__title { position: relative; font-size: 1.7rem; }
.det-head__desc { position: relative; color: var(--text-dim); font-size: 0.95rem; }

.badges { position: relative; display: flex; flex-wrap: wrap; gap: 7px; margin-top: 4px; }
.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
.badge--obj {
  color: var(--obj);
  background: color-mix(in srgb, var(--obj) 14%, transparent);
  border-color: color-mix(in srgb, var(--obj) 38%, transparent);
}

/* ---------- Detalle: días y ejercicios ---------- */
.dia { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
.dia__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}
.ejs { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.ejx {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border-top: 1px solid var(--line);
}
.ejx:first-child { border-top: 0; }
.ejx__ic {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
.ejx__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ejx__name { font-weight: 700; font-size: 0.94rem; line-height: 1.2; }
.ejx__meta { display: flex; gap: 4px; font-size: 0.74rem; color: var(--text-faint); }
.ejx__grupo { text-transform: capitalize; }
.ejx__nota { color: var(--cyan-bright); }
.ejx__sr {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}
.ejx__reps {
  font-weight: 800;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.ejx__rest { font-size: 0.7rem; color: var(--text-faint); }

/* ---------- Elegir ---------- */
.elegir { height: 56px; margin-top: 2px; }
.elegida {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid rgba(34, 197, 94, 0.32);
  background: var(--success-soft);
}
.elegida__tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--success);
}
.elegida .btn { width: auto; height: 42px; padding: 0 16px; }

/* ---------- Tu rutina actual (hub) ---------- */
.actual {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 16px 44px 16px 16px;
  border-radius: var(--r-lg);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 70%), var(--surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.12s var(--ease), border-color 0.18s var(--ease);
}
.actual:active { transform: scale(0.99); }
.actual__kicker {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cyan-bright);
}
.actual__name { font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; color: var(--text); }
.actual__meta { color: var(--text-dim); font-size: 0.85rem; }
.actual__arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-faint); }

/* ---------- Filtros ---------- */
.filtros { display: flex; flex-direction: column; gap: 12px; }
.filtro { display: flex; flex-direction: column; gap: 7px; }
.filtro__lab {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.fchip {
  padding: 8px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.16s var(--ease), border-color 0.16s var(--ease), background 0.16s var(--ease);
}
.fchip:hover { border-color: var(--accent); }
.fchip--on {
  color: #04121a;
  background: var(--grad-firma);
  border-color: transparent;
  box-shadow: 0 6px 16px var(--accent-glow);
}
.limpiar {
  align-self: flex-start;
  margin-top: 2px;
  border: 0;
  background: transparent;
  color: var(--cyan-bright);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------- Lista de rutinas ---------- */
.lista { display: flex; flex-direction: column; gap: 12px; }
.rcard {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  cursor: pointer;
  overflow: hidden;
  border-left: 3px solid var(--obj);
  transition: transform 0.12s var(--ease), border-color 0.18s var(--ease), background 0.18s var(--ease);
}
.rcard:active { transform: scale(0.99); }
.rcard:hover { background: var(--surface-2); }
.rcard--activa { box-shadow: var(--shadow-card), 0 0 0 1px color-mix(in srgb, var(--accent) 50%, transparent); }
.rcard__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rcard__obj {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--obj);
}
.rcard__mia {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 3px 9px;
  border-radius: var(--r-pill);
}
.rcard__name { font-family: var(--font-display); font-weight: 800; font-size: 1.15rem; letter-spacing: -0.01em; }
.rcard__desc { color: var(--text-dim); font-size: 0.88rem; line-height: 1.4; }
.rcard__foot { display: flex; align-items: center; gap: 7px; margin-top: 2px; }
.tag {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid var(--line);
  padding: 4px 10px;
  border-radius: var(--r-pill);
}
.rcard__arrow { margin-left: auto; color: var(--text-faint); }

/* ---------- Vacío ---------- */
.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 32px 20px;
  color: var(--text-dim);
}
.vacio__ic {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--r-md);
  color: var(--accent);
  background: var(--accent-soft);
}
.vacio .btn { width: auto; height: 44px; padding: 0 18px; }
</style>
