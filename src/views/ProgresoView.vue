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

      <!-- Fase 2: aquí irán el calendario/heatmap de asistencias y los logros/hitos. -->
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
@keyframes skShimmer {
  100% { transform: translateX(100%); }
}

/* ===================== Responsive ===================== */
@media (max-width: 360px) {
  .semana { flex-direction: column; text-align: center; }
  .hero__num { font-size: 3.4rem; }
}
</style>
