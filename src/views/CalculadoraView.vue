<script setup>
// Calculadora corporal — 100% local (sin backend).
// Con peso, estatura, edad, sexo y objetivo calcula IMC, calorías, proteína y agua.
import { ref, computed } from 'vue'

const peso = ref(null) // kg
const estatura = ref(null) // cm
const edad = ref(null) // años
const sexo = ref('H') // 'H' | 'M'
const objetivo = ref('mantener') // 'bajar' | 'mantener' | 'subir'

const datosOk = computed(() => peso.value > 0 && estatura.value > 0 && edad.value > 0)

// IMC = peso / estatura(m)^2
const imc = computed(() => {
  if (!(peso.value > 0 && estatura.value > 0)) return null
  const m = estatura.value / 100
  return peso.value / (m * m)
})
const imcCat = computed(() => {
  const v = imc.value
  if (v == null) return null
  if (v < 18.5) return { txt: 'Bajo peso', tono: 'ambar' }
  if (v < 25) return { txt: 'Peso normal', tono: 'verde' }
  if (v < 30) return { txt: 'Sobrepeso', tono: 'ambar' }
  return { txt: 'Obesidad', tono: 'rojo' }
})
// Posición del marcador en la barra (escala visual 15–40).
const imcPos = computed(() => {
  const v = imc.value
  if (v == null) return 0
  return Math.min(100, Math.max(0, ((v - 15) / 25) * 100))
})

// Calorías: Mifflin-St Jeor × actividad moderada (1.55), ajustado por objetivo.
const calorias = computed(() => {
  if (!datosOk.value) return null
  const tmb =
    sexo.value === 'H'
      ? 10 * peso.value + 6.25 * estatura.value - 5 * edad.value + 5
      : 10 * peso.value + 6.25 * estatura.value - 5 * edad.value - 161
  let tdee = tmb * 1.55
  if (objetivo.value === 'bajar') tdee -= 400
  else if (objetivo.value === 'subir') tdee += 350
  return Math.round(tdee / 10) * 10
})

// Proteína g/día según objetivo.
const proteina = computed(() => {
  if (!(peso.value > 0)) return null
  const f = objetivo.value === 'bajar' ? 2.2 : objetivo.value === 'subir' ? 2.0 : 1.6
  return Math.round(peso.value * f)
})

// Agua L/día (35 ml/kg).
const agua = computed(() => {
  if (!(peso.value > 0)) return null
  return peso.value * 0.035
})

const objetivos = [
  { id: 'bajar', label: 'Bajar grasa' },
  { id: 'mantener', label: 'Mantener' },
  { id: 'subir', label: 'Subir masa' },
]
const objetivoTxt = computed(
  () => ({ bajar: 'bajar grasa', mantener: 'mantenimiento', subir: 'subir masa' }[objetivo.value]),
)

const fmt = (n) => (n == null ? '—' : n.toLocaleString('es-MX'))
</script>

<template>
  <main class="screen screen--with-nav calc">
    <header class="vista-head">
      <h1 class="vista-title">Calculadora corporal</h1>
      <p class="vista-sub">Tus números clave, al instante.</p>
    </header>

    <!-- DATOS -->
    <section class="card calc__form">
      <!-- Sexo -->
      <div class="field">
        <label class="field__label">Sexo</label>
        <div class="seg">
          <button type="button" :class="{ on: sexo === 'H' }" @click="sexo = 'H'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="14" r="6" /><path d="M19 5l-6 6M14.5 5H19v4.5" />
            </svg>
            Hombre
          </button>
          <button type="button" :class="{ on: sexo === 'M' }" @click="sexo = 'M'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="9" r="6" /><path d="M12 15v7M9 19h6" />
            </svg>
            Mujer
          </button>
        </div>
      </div>

      <!-- Peso / Estatura -->
      <div class="calc__row">
        <div class="field">
          <label class="field__label">Peso</label>
          <div class="cinp">
            <input type="number" inputmode="decimal" v-model.number="peso" min="20" max="350" placeholder="0" />
            <span class="cinp__u">kg</span>
          </div>
        </div>
        <div class="field">
          <label class="field__label">Estatura</label>
          <div class="cinp">
            <input type="number" inputmode="decimal" v-model.number="estatura" min="100" max="250" placeholder="0" />
            <span class="cinp__u">cm</span>
          </div>
        </div>
      </div>

      <!-- Edad -->
      <div class="field">
        <label class="field__label">Edad</label>
        <div class="cinp">
          <input type="number" inputmode="numeric" v-model.number="edad" min="10" max="100" placeholder="0" />
          <span class="cinp__u">años</span>
        </div>
      </div>

      <!-- Objetivo -->
      <div class="field">
        <label class="field__label">Objetivo</label>
        <div class="seg seg--3">
          <button
            v-for="o in objetivos"
            :key="o.id"
            type="button"
            :class="{ on: objetivo === o.id }"
            @click="objetivo = o.id"
          >
            <svg v-if="o.id === 'bajar'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
            <svg v-else-if="o.id === 'mantener'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 9h14M5 15h14" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
            {{ o.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- RESULTADOS -->
    <template v-if="datosOk">
      <!-- IMC -->
      <section class="card resimc">
        <div class="resimc__top">
          <span class="resimc__label">Índice de masa corporal</span>
          <span class="chip" :class="`chip--${imcCat.tono}`">{{ imcCat.txt }}</span>
        </div>
        <span class="resimc__num metric-xl num-gradient">{{ imc.toFixed(1) }}</span>
        <div class="imcbar">
          <div class="imcbar__track">
            <span class="imcbar__seg" style="flex: 14; background: #3b82f6"></span>
            <span class="imcbar__seg" style="flex: 26; background: #22c55e"></span>
            <span class="imcbar__seg" style="flex: 20; background: #f59e0b"></span>
            <span class="imcbar__seg" style="flex: 40; background: #ef4444"></span>
          </div>
          <span class="imcbar__marker" :style="{ left: imcPos + '%' }"></span>
          <div class="imcbar__scale"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
        </div>
      </section>

      <!-- Calorías (dato estrella) -->
      <section class="card calcard">
        <span class="calcard__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </span>
        <span class="calcard__body">
          <span class="calcard__num num-gradient">{{ fmt(calorias) }}</span>
          <span class="calcard__label">kcal por día · {{ objetivoTxt }}</span>
        </span>
      </section>

      <!-- Proteína + Agua -->
      <div class="duo">
        <section class="card metcard">
          <span class="metcard__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <span class="metcard__num">{{ proteina }}<small>g</small></span>
          <span class="metcard__label">Proteína al día</span>
        </section>
        <section class="card metcard">
          <span class="metcard__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2.5S5 9 5 14a7 7 0 0 0 14 0c0-5-7-11.5-7-11.5z" />
            </svg>
          </span>
          <span class="metcard__num">{{ agua.toFixed(1) }}<small>L</small></span>
          <span class="metcard__label">Agua al día</span>
        </section>
      </div>

      <p class="calc__nota">
        Valores estimados con actividad moderada. Son una guía general, no sustituyen la
        recomendación de un profesional de la salud.
      </p>
    </template>

    <!-- Estado vacío -->
    <section v-else class="card calc__empty">
      <span class="calc__empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" />
          <path d="M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h7" />
        </svg>
      </span>
      <p class="calc__empty-text">Llena tu peso, estatura y edad para ver tus resultados.</p>
    </section>
  </main>
</template>

<style scoped>
.calc__form { display: flex; flex-direction: column; gap: 18px; }
.calc__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Inputs con unidad a la derecha (sin flechitas). */
.cinp { position: relative; display: flex; align-items: center; }
.cinp input {
  width: 100%;
  height: 54px;
  padding: 0 50px 0 18px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  color: var(--text);
  font-size: 1.05rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s var(--ease), background 0.18s var(--ease);
}
.cinp input:focus { border-color: var(--accent); background: var(--surface-3); }
.cinp input::-webkit-outer-spin-button,
.cinp input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cinp input { -moz-appearance: textfield; appearance: textfield; }
.cinp__u {
  position: absolute;
  right: 16px;
  color: var(--text-faint);
  font-size: 0.86rem;
  font-weight: 700;
  pointer-events: none;
}

/* Segmented control (sexo / objetivo). */
.seg {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 5px;
}
.seg--3 { grid-template-columns: repeat(3, 1fr); }
.seg button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 10px 4px;
  border-radius: calc(var(--r-md) - 5px);
  cursor: pointer;
  transition: background 0.18s var(--ease), color 0.18s var(--ease), box-shadow 0.18s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.seg button svg { width: 18px; height: 18px; }
.seg button.on { background: var(--accent); color: #fff; box-shadow: 0 6px 16px var(--glow); }

/* IMC */
.resimc__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.resimc__label { font-size: 0.84rem; font-weight: 600; color: var(--text-dim); }
.resimc__num { display: block; margin: 2px 0 4px; }
.imcbar { position: relative; margin-top: 16px; }
.imcbar__track { display: flex; height: 8px; border-radius: 999px; overflow: hidden; gap: 2px; }
.imcbar__seg { height: 100%; }
.imcbar__marker {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: var(--text);
  border: 2px solid var(--surface);
  transform: translateX(-50%);
  transition: left 0.35s var(--ease);
}
.imcbar__scale {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 0.66rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* Calorías */
.calcard { display: flex; align-items: center; gap: 16px; }
.calcard__icon {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
}
.calcard__icon svg { width: 28px; height: 28px; }
.calcard__body { display: flex; flex-direction: column; min-width: 0; }
.calcard__num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2.4rem;
  letter-spacing: -0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.calcard__label { font-size: 0.84rem; color: var(--text-dim); font-weight: 600; margin-top: 4px; }

/* Proteína + Agua */
.duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.metcard {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 20px 14px;
}
.metcard__icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
}
.metcard__icon svg { width: 21px; height: 21px; }
.metcard__num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.7rem;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.metcard__num small { font-size: 0.95rem; font-weight: 700; color: var(--text-dim); margin-left: 2px; }
.metcard__label { font-size: 0.76rem; color: var(--text-dim); font-weight: 600; }

.calc__nota {
  font-size: 0.76rem;
  line-height: 1.55;
  color: var(--text-faint);
  text-align: center;
  margin: 4px 6px 0;
}

/* Estado vacío */
.calc__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 34px 24px;
}
.calc__empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
}
.calc__empty-icon svg { width: 30px; height: 30px; }
.calc__empty-text { font-size: 0.92rem; color: var(--text-dim); margin: 0; max-width: 26ch; }
</style>
