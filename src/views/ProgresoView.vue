<script setup>
// Progreso + Rachas (Fase 1). Consume GET /api/socios/progreso (vía services/backend)
// y muestra: la RACHA semanal como héroe (llama SVG, sin emojis), el avance de ESTA
// semana hacia la meta (anillo), y las métricas de progreso (visitas, días, promedio).
//
// El heatmap/calendario y los logros son FASE 2: la vista está organizada en secciones
// para sumarlos después sin reescribir lo existente.
import { onMounted, ref, computed } from 'vue'
import { obtenerProgreso } from '../services/backend'

const cargando = ref(true)
const error = ref('')
const data = ref(null)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    // La meta se infiere de la rutina activa del socio dentro del servicio.
    data.value = await obtenerProgreso()
  } catch (e) {
    error.value = e?.message || 'No pudimos cargar tu progreso. Inténtalo de nuevo.'
    data.value = null
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// --- Derivados de la racha (héroe) ---
const racha = computed(() => data.value?.rachaActual ?? 0)
const record = computed(() => data.value?.rachaMasLarga ?? 0)
const tieneRacha = computed(() => racha.value > 0)
// Récord solo cuando supera a la racha actual (si no, no aporta).
const muestraRecord = computed(() => record.value > racha.value)
const rachaTexto = computed(() => (racha.value === 1 ? '1 semana' : `${racha.value} semanas`))

// --- Meta de ESTA semana (anillo) ---
const meta = computed(() => Math.max(1, data.value?.meta ?? 3))
const estaSemana = computed(() => data.value?.visitasEstaSemana ?? 0)
const metaCumplida = computed(() => estaSemana.value >= meta.value)
const pctSemana = computed(() =>
  Math.min(100, Math.round((estaSemana.value / meta.value) * 100)),
)
// Geometría del anillo SVG (r = 52 → circunferencia ≈ 326.7).
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R
const ringOffset = computed(() => RING_C * (1 - pctSemana.value / 100))

// --- Métricas (tarjetas) ---
const promedio = computed(() => {
  const p = data.value?.promedioPorSemana ?? 0
  // 1 decimal, sin ".0" innecesario (3 en vez de 3.0; 3.2 se queda).
  return Number.isInteger(p) ? String(p) : p.toFixed(1)
})

// ===================== FASE 2: HEATMAP =====================
// heatmap: { desde, hasta, dias: { "YYYY-MM-DD": nVisitas } }
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function parseYMD(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const heatmap = computed(() => data.value?.heatmap || null)
const hayHeatmap = computed(() => {
  const hm = heatmap.value
  return !!hm && hm.dias && Object.keys(hm.dias).length >= 0 && (hm.desde || Object.keys(hm.dias).length)
})

// Cuadrícula tipo GitHub: columnas = semanas, filas = días (Dom..Sáb).
const semanasHeatmap = computed(() => {
  const hm = heatmap.value
  if (!hm || !hm.dias) return []
  const dias = hm.dias
  const claves = Object.keys(dias)
  let desdeStr = hm.desde
  let hastaStr = hm.hasta
  if (!desdeStr || !hastaStr) {
    if (!claves.length) return []
    const ord = [...claves].sort()
    desdeStr = desdeStr || ord[0]
    hastaStr = hastaStr || ord[ord.length - 1]
  }
  const desde = parseYMD(desdeStr)
  const hasta = parseYMD(hastaStr)
  if (hasta < desde) return []

  // Alinear inicio al domingo de su semana y fin al sábado de la suya.
  const inicio = new Date(desde)
  inicio.setDate(inicio.getDate() - inicio.getDay())
  const fin = new Date(hasta)
  fin.setDate(fin.getDate() + (6 - fin.getDay()))

  const semanas = []
  const cursor = new Date(inicio)
  let guard = 0
  while (cursor <= fin && guard < 800) {
    const semana = []
    for (let i = 0; i < 7; i++) {
      const ymd = toYMD(cursor)
      const enRango = cursor >= desde && cursor <= hasta
      const count = enRango ? Number(dias[ymd] || 0) : 0
      const nivel = !enRango ? -1 : count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3
      semana.push({ ymd, fecha: new Date(cursor), count, enRango, nivel })
      cursor.setDate(cursor.getDate() + 1)
      guard++
    }
    semanas.push(semana)
  }
  return semanas
})

// Etiqueta de mes por columna (solo cuando cambia el mes respecto a la anterior).
const mesesHeatmap = computed(() => {
  const out = []
  let ultimo = -1
  for (const semana of semanasHeatmap.value) {
    const dia = semana.find((d) => d.enRango) || semana[0]
    const mes = dia.fecha.getMonth()
    out.push(mes !== ultimo ? MESES[mes] : '')
    ultimo = mes
  }
  return out
})

// Día seleccionado (tap) para mostrar su detalle bajo el calendario.
const diaSel = ref(null)
function seleccionarDia(dia) {
  if (!dia.enRango) return
  diaSel.value = diaSel.value && diaSel.value.ymd === dia.ymd ? null : dia
}
const diaSelTexto = computed(() => {
  const d = diaSel.value
  if (!d) return ''
  const f = d.fecha
  const fecha = `${DIAS_SEM[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`
  return d.count > 0 ? `${fecha} · entrenaste` : `${fecha} · sin asistencia`
})

// ===================== FASE 2: LOGROS =====================
const LABEL_CAT = { visitas: 'Visitas', racha: 'Racha', consistencia: 'Consistencia' }
// Íconos SVG por categoría (sin emojis): medalla (visitas), trofeo (racha), estrella (consistencia).
const ICON_CAT = {
  visitas: ['M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M9.5 12.5 8 21l4-2 4 2-1.5-8.5'],
  racha: ['M7 4h10v3a5 5 0 0 1-10 0z', 'M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3', 'M12 12v4M9 20h6M10 20l.4-4M14 20l-.4-4'],
  consistencia: ['M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z'],
}
function iconoCat(cat) {
  return ICON_CAT[cat] || ICON_CAT.consistencia
}

const logros = computed(() => data.value?.logros || [])
const logrosTotal = computed(() => logros.value.length)
const logrosDesbloqueados = computed(() =>
  data.value?.logrosDesbloqueados ?? logros.value.filter((l) => l.desbloqueado).length,
)
const hayLogros = computed(() => logrosTotal.value > 0)

// Agrupa por categoría preservando el orden conocido (visitas, racha, consistencia) y
// añade cualquier categoría extra al final, por si el backend agrega más.
const logrosPorCategoria = computed(() => {
  const grupos = []
  const idx = {}
  for (const l of logros.value) {
    const cat = l.categoria || 'otros'
    if (!(cat in idx)) {
      idx[cat] = grupos.length
      grupos.push({ id: cat, label: LABEL_CAT[cat] || 'Logros', items: [] })
    }
    grupos[idx[cat]].items.push(l)
  }
  return grupos
})

// % de progreso de un logro bloqueado (para la mini-barra).
function pctLogro(l) {
  const a = Number(l?.progreso?.actual ?? 0)
  const o = Number(l?.progreso?.objetivo ?? 0)
  if (!o || o <= 0) return 0
  return Math.min(100, Math.round((a / o) * 100))
}
</script>

<template>
  <main class="screen screen--with-nav progreso stagger">
    <header class="vista-head">
      <h1 class="vista-title">Tu progreso</h1>
      <p class="vista-sub">Tu racha y tu avance, semana a semana.</p>
    </header>

    <!-- ===== Estado: CARGANDO (skeleton) ===== -->
    <template v-if="cargando">
      <section class="card sk sk--hero"></section>
      <section class="card sk sk--meta"></section>
      <div class="stats">
        <section class="card sk sk--stat"></section>
        <section class="card sk sk--stat"></section>
        <section class="card sk sk--stat"></section>
        <section class="card sk sk--stat"></section>
      </div>
      <section class="card sk sk--block"></section>
      <section class="card sk sk--block"></section>
    </template>

    <!-- ===== Estado: ERROR ===== -->
    <section v-else-if="error" class="card estado-error">
      <span class="estado-error__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5M12 16h.01" />
        </svg>
      </span>
      <p class="estado-error__msg">{{ error }}</p>
      <button type="button" class="btn-reintentar" @click="cargar">Reintentar</button>
    </section>

    <!-- ===== Estado: DATOS ===== -->
    <template v-else-if="data">
      <!-- HÉROE: la racha -->
      <section class="card hero" :class="{ 'hero--on': tieneRacha }">
        <div class="hero__glow" aria-hidden="true"></div>

        <span class="hero__flame" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <defs>
              <linearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="22"
                              gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#5eead4" />
                <stop offset="0.55" stop-color="#06b6d4" />
                <stop offset="1" stop-color="#0e7490" />
              </linearGradient>
            </defs>
            <!-- llama exterior -->
            <path class="flame__outer"
                  d="M12.5 2.2c.4 3.1-1.2 4.6-1.6 7 0 .3-.1.7-.1 1 0 1.1.9 2 2 2 1.4 0 2.3-1.1 2.1-2.7 1.7 1.6 2.8 3.7 2.8 6.1a5.7 5.7 0 0 1-11.4 0c0-2.6 1.1-4.7 2.6-6.4-.1 1.6.7 2.7 1.7 2.7-.4-3.9 1.3-6.2-.4-9 .6 0 1.2 0 1.8 0z" />
            <!-- llama interior -->
            <path class="flame__inner"
                  d="M12 13.4c1.7.9 2.7 2.2 2.7 3.8a2.7 2.7 0 0 1-5.4 0c0-1.1.6-2 1.4-2.7 0 .9.5 1.4 1.1 1.4.5 0 .9-.6.8-1.4z" />
          </svg>
        </span>

        <template v-if="tieneRacha">
          <span class="hero__num metric">{{ racha }}</span>
          <span class="hero__unit">{{ racha === 1 ? 'semana' : 'semanas' }} de racha</span>
          <p class="hero__sub">Cumpliste tu meta {{ rachaTexto }} seguidas. ¡No la rompas!</p>
          <span v-if="muestraRecord" class="hero__record">
            Tu récord: {{ record }} {{ record === 1 ? 'semana' : 'semanas' }}
          </span>
        </template>
        <template v-else>
          <span class="hero__num hero__num--off metric">0</span>
          <span class="hero__unit">semanas de racha</span>
          <p class="hero__sub hero__sub--cta">¡Empieza tu racha esta semana!</p>
          <span v-if="record > 0" class="hero__record">
            Tu récord: {{ record }} {{ record === 1 ? 'semana' : 'semanas' }}
          </span>
        </template>
      </section>

      <!-- META de ESTA semana (anillo) -->
      <section class="card semana">
        <div class="semana__ring">
          <svg viewBox="0 0 120 120" width="116" height="116">
            <circle class="ring__track" cx="60" cy="60" :r="RING_R" />
            <circle
              class="ring__fill"
              :class="{ 'ring__fill--done': metaCumplida }"
              cx="60" cy="60" :r="RING_R"
              :stroke-dasharray="RING_C"
              :stroke-dashoffset="ringOffset"
            />
          </svg>
          <div class="semana__center">
            <span class="semana__count metric">{{ estaSemana }}<span class="semana__of">/{{ meta }}</span></span>
            <span class="semana__dias">días</span>
          </div>
        </div>
        <div class="semana__info">
          <span class="kicker">Esta semana</span>
          <p class="semana__msg" v-if="metaCumplida">
            ¡Meta cumplida! Sigue así para mantener tu racha.
          </p>
          <p class="semana__msg" v-else>
            Vas {{ estaSemana }} de {{ meta }} días. Te {{ meta - estaSemana === 1 ? 'falta 1 día' : `faltan ${meta - estaSemana} días` }} para tu meta.
          </p>
        </div>
      </section>

      <!-- MÉTRICAS de progreso -->
      <div class="stats">
        <section class="card stat">
          <span class="kicker">Visitas totales</span>
          <span class="stat__num metric">{{ data.totalVisitas }}</span>
        </section>
        <section class="card stat">
          <span class="kicker">Este mes</span>
          <span class="stat__num metric">{{ data.visitasEsteMes }}</span>
        </section>
        <section class="card stat">
          <span class="kicker">Días entrenados</span>
          <span class="stat__num metric">{{ data.diasEntrenados }}</span>
        </section>
        <section class="card stat">
          <span class="kicker">Prom. / semana</span>
          <span class="stat__num metric">{{ promedio }}</span>
        </section>
      </div>

      <!-- ===== FASE 2 · HEATMAP (calendario de asistencias) ===== -->
      <section v-if="hayHeatmap && semanasHeatmap.length" class="card bloque heatmap">
        <div class="bloque__head">
          <h2 class="bloque__title">Tu calendario</h2>
          <span class="bloque__hint">Cada día que entrenaste</span>
        </div>

        <div class="hm__scroll">
          <div class="hm__grid-wrap">
            <!-- etiquetas de mes -->
            <div class="hm__meses">
              <span v-for="(m, i) in mesesHeatmap" :key="'m' + i" class="hm__mes">{{ m }}</span>
            </div>
            <div class="hm__body">
              <!-- etiquetas de día (Lun/Mié/Vie) -->
              <div class="hm__dows" aria-hidden="true">
                <span></span><span>Lun</span><span></span><span>Mié</span>
                <span></span><span>Vie</span><span></span>
              </div>
              <!-- columnas = semanas -->
              <div class="hm__cols">
                <div v-for="(semana, si) in semanasHeatmap" :key="'w' + si" class="hm__col">
                  <button
                    v-for="dia in semana"
                    :key="dia.ymd"
                    type="button"
                    class="hm__cell"
                    :class="[
                      `hm__cell--n${dia.nivel < 0 ? 'x' : dia.nivel}`,
                      { 'hm__cell--sel': diaSel && diaSel.ymd === dia.ymd },
                    ]"
                    :disabled="!dia.enRango"
                    :aria-label="dia.enRango ? `${dia.ymd}: ${dia.count} ${dia.count === 1 ? 'visita' : 'visitas'}` : ''"
                    @click="seleccionarDia(dia)"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- detalle del día tocado + leyenda -->
        <p v-if="diaSelTexto" class="hm__sel">{{ diaSelTexto }}</p>
        <div class="hm__leyenda">
          <span class="hm__leyenda-txt">Menos</span>
          <span class="hm__cell hm__cell--n0"></span>
          <span class="hm__cell hm__cell--n1"></span>
          <span class="hm__cell hm__cell--n2"></span>
          <span class="hm__cell hm__cell--n3"></span>
          <span class="hm__leyenda-txt">Más</span>
        </div>
      </section>

      <!-- ===== FASE 2 · LOGROS (medallas) ===== -->
      <section v-if="hayLogros" class="card bloque logros">
        <div class="bloque__head">
          <h2 class="bloque__title">Logros</h2>
          <span class="logros__contador">{{ logrosDesbloqueados }} de {{ logrosTotal }}</span>
        </div>

        <div v-for="grupo in logrosPorCategoria" :key="grupo.id" class="logros__grupo">
          <span class="kicker logros__cat">{{ grupo.label }}</span>
          <div class="logros__grid">
            <article
              v-for="l in grupo.items"
              :key="l.id"
              class="medalla"
              :class="{ 'medalla--on': l.desbloqueado }"
            >
              <span class="medalla__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path v-for="(d, di) in iconoCat(l.categoria)" :key="di" :d="d" />
                </svg>
                <span v-if="l.desbloqueado" class="medalla__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12.5l4 4 10-10" />
                  </svg>
                </span>
              </span>
              <h3 class="medalla__nombre">{{ l.nombre }}</h3>
              <p class="medalla__desc">{{ l.descripcion }}</p>
              <div v-if="!l.desbloqueado && l.progreso && l.progreso.objetivo" class="medalla__prog">
                <div class="medalla__barra">
                  <span class="medalla__barra-fill" :style="{ width: pctLogro(l) + '%' }"></span>
                </div>
                <span class="medalla__prog-txt">{{ l.progreso.actual }}/{{ l.progreso.objetivo }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.progreso { gap: var(--sp-4); }

/* ===================== HÉROE: racha ===================== */
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--sp-6) var(--sp-5) var(--sp-5);
}
.hero__glow {
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 68%);
  opacity: 0;
  transition: opacity 0.4s var(--ease);
  pointer-events: none;
}
.hero--on .hero__glow { opacity: 1; }

.hero__flame {
  width: 76px;
  height: 76px;
  display: block;
  filter: drop-shadow(0 6px 18px var(--glow));
}
.hero__flame svg { display: block; }
.flame__outer { fill: url(#flameGrad); }
.flame__inner { fill: #fff; opacity: 0.85; }
/* Racha apagada: llama en gris, sin glow. */
.hero:not(.hero--on) .hero__flame { filter: none; }
.hero:not(.hero--on) .flame__outer { fill: var(--surface-3); }
.hero:not(.hero--on) .flame__inner { fill: var(--text-faint); opacity: 0.5; }

.hero__num {
  margin-top: 6px;
  font-size: 4rem;
  line-height: 0.9;
  color: var(--cyan-bright, #22d3ee);
  background: var(--grad-firma);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero__num--off {
  background: none;
  -webkit-text-fill-color: var(--text-faint);
  color: var(--text-faint);
}
.hero__unit {
  margin-top: 2px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text);
}
.hero__sub {
  margin: 8px 0 0;
  max-width: 30ch;
  font-size: 0.86rem;
  color: var(--text-dim);
}
.hero__sub--cta { color: var(--accent-bright); font-weight: 600; }
.hero__record {
  margin-top: 12px;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-faint);
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: var(--surface-2);
}

/* ===================== META: anillo de la semana ===================== */
.semana {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}
.semana__ring {
  position: relative;
  flex: 0 0 auto;
  width: 116px;
  height: 116px;
  display: grid;
  place-items: center;
}
.semana__ring svg { transform: rotate(-90deg); }
.ring__track {
  fill: none;
  stroke: var(--surface-3);
  stroke-width: 9;
}
.ring__fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.7s var(--ease), stroke 0.3s var(--ease);
  filter: drop-shadow(0 0 6px var(--glow));
}
.ring__fill--done { stroke: #5eead4; }
.semana__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.semana__count {
  font-size: 1.9rem;
  color: var(--text);
  display: flex;
  align-items: baseline;
}
.semana__of { font-size: 1rem; color: var(--text-faint); font-weight: 700; }
.semana__dias {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  margin-top: 2px;
}
.semana__info { min-width: 0; }
.semana__msg {
  margin: 6px 0 0;
  font-size: 0.88rem;
  color: var(--text-dim);
}

/* ===================== MÉTRICAS ===================== */
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--sp-4);
}
.stat__num {
  font-size: 1.9rem;
  color: var(--text);
}

/* ===================== ERROR ===================== */
.estado-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: var(--sp-6) var(--sp-5);
}
.estado-error__icon {
  width: 44px;
  height: 44px;
  color: var(--danger);
}
.estado-error__icon svg { width: 44px; height: 44px; }
.estado-error__msg {
  margin: 0;
  max-width: 32ch;
  font-size: 0.92rem;
  color: var(--text-dim);
}
.btn-reintentar {
  margin-top: 4px;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  color: var(--accent);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 10px 22px;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition: background 0.18s var(--ease), border-color 0.18s var(--ease);
}
.btn-reintentar:active { background: var(--surface-3); border-color: var(--accent); }

/* ===================== SKELETON (carga) ===================== */
.sk {
  position: relative;
  overflow: hidden;
  background: var(--surface);
}
.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    var(--surface-2) 50%,
    transparent
  );
  transform: translateX(-100%);
  animation: skShimmer 1.3s var(--ease) infinite;
}
.sk--hero { height: 268px; }
.sk--meta { height: 156px; }
.sk--stat { height: 96px; }
.sk--block { height: 200px; }
@keyframes skShimmer {
  100% { transform: translateX(100%); }
}

/* ===================== BLOQUE (encabezado de sección) ===================== */
.bloque__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: var(--sp-4);
}
.bloque__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0;
}
.bloque__hint { font-size: 0.76rem; color: var(--text-faint); }

/* ===================== HEATMAP ===================== */
.hm__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  /* scrollbar discreta */
  scrollbar-width: thin;
  scrollbar-color: var(--surface-3) transparent;
}
.hm__scroll::-webkit-scrollbar { height: 6px; }
.hm__scroll::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: var(--r-pill); }
.hm__grid-wrap { display: inline-block; min-width: max-content; }

.hm__meses {
  display: flex;
  gap: 3px;
  padding-left: 32px;
  margin-bottom: 5px;
}
.hm__mes {
  width: 12px;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text-faint);
  white-space: nowrap;
}
.hm__body { display: flex; gap: 6px; }
.hm__dows {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 0 0 26px;
  width: 26px;
}
.hm__dows span {
  height: 12px;
  line-height: 12px;
  text-align: right;
  font-size: 0.6rem;
  color: var(--text-faint);
}
.hm__cols { display: flex; gap: 3px; }
.hm__col { display: flex; flex-direction: column; gap: 3px; }

.hm__cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 0;
  padding: 0;
  background: var(--surface-3);
  cursor: pointer;
  transition: transform 0.12s var(--ease), box-shadow 0.2s var(--ease);
}
.hm__cell:disabled { cursor: default; }
.hm__cell:not(:disabled):active { transform: scale(0.85); }
/* niveles de intensidad (Quiet Neon cyan) */
.hm__cell--nx { background: transparent; }
.hm__cell--n0 { background: var(--surface-3); }
.hm__cell--n1 { background: rgba(6, 182, 212, 0.4); }
.hm__cell--n2 { background: rgba(6, 182, 212, 0.7); }
.hm__cell--n3 {
  background: var(--accent);
  box-shadow: 0 0 6px var(--glow);
}
.hm__cell--sel {
  outline: 2px solid var(--accent-bright);
  outline-offset: 1px;
}

.hm__sel {
  margin: 12px 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-dim);
}
.hm__leyenda {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  justify-content: flex-end;
}
.hm__leyenda .hm__cell { cursor: default; }
.hm__leyenda-txt { font-size: 0.7rem; color: var(--text-faint); margin: 0 2px; }

/* ===================== LOGROS / MEDALLAS ===================== */
.logros__contador {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 12px;
  border-radius: var(--r-pill);
  font-variant-numeric: tabular-nums;
}
.logros__grupo { margin-top: var(--sp-4); }
.logros__grupo:first-of-type { margin-top: 0; }
.logros__cat { display: block; margin-bottom: 10px; }
.logros__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.medalla {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
  opacity: 0.72;
  transition: opacity 0.2s var(--ease), border-color 0.2s var(--ease);
}
.medalla--on {
  opacity: 1;
  border-color: var(--accent);
  background: linear-gradient(160deg, var(--accent-soft), transparent 70%), var(--surface-2);
}
.medalla__icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface-3);
  color: var(--text-faint);
  margin-bottom: 2px;
}
.medalla__icon svg { width: 22px; height: 22px; }
.medalla--on .medalla__icon {
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--glow);
}
.medalla__check {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  border: 2px solid var(--surface);
}
.medalla__check svg { width: 10px; height: 10px; }
.medalla__nombre {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text);
  margin: 2px 0 0;
  line-height: 1.2;
}
.medalla__desc {
  font-size: 0.74rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.3;
}
.medalla__prog {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 6px;
}
.medalla__barra {
  flex: 1;
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--surface-3);
  overflow: hidden;
}
.medalla__barra-fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--accent);
  transition: width 0.5s var(--ease);
}
.medalla__prog-txt {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* ===================== Responsive ===================== */
@media (max-width: 360px) {
  .semana { flex-direction: column; text-align: center; }
  .hero__num { font-size: 3.4rem; }
  .logros__grid { grid-template-columns: 1fr; }
}
</style>
