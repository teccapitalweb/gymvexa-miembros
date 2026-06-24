<script setup>
// Paso de PROGRAMACIÓN al elegir una rutina: el socio escoge en qué días de la
// semana la hará. Asigna cada sesión de la rutina (Día A/B…, Empuje/Jalón…) al día
// de la semana elegido, en orden. Valida el descanso: si la rutina lo requiere y el
// socio elige días seguidos, ADVIERTE y pide confirmación explícita (no lo impide).
import { ref, computed, watch } from 'vue'
import { DIAS_SEMANA } from '../data/rutinasPredisenadas'

const props = defineProps({
  rutina: { type: Object, required: true },
  // Programación previa (al reprogramar): { dias: [...] } para precargar.
  inicial: { type: Object, default: null },
})
const emit = defineEmits(['guardar', 'cancelar'])

const nDias = computed(() => props.rutina.diasPorSemana)
const requiereDescanso = computed(
  () => props.rutina?.reglasDescanso?.requiereDescansoEntreSesiones ?? false,
)
const notaDescanso = computed(() => props.rutina?.reglasDescanso?.notaDescanso || '')

// Selección de días (ids). Precarga la programación previa si se está reprogramando.
const seleccion = ref(
  Array.isArray(props.inicial?.dias) ? props.inicial.dias.slice(0, nDias.value) : [],
)
const confirmado = ref(false)

const estaSel = (id) => seleccion.value.includes(id)
const lleno = computed(() => seleccion.value.length === nDias.value)
const faltan = computed(() => nDias.value - seleccion.value.length)

function toggleDia(id) {
  const i = seleccion.value.indexOf(id)
  if (i >= 0) {
    seleccion.value.splice(i, 1)
  } else {
    if (seleccion.value.length >= nDias.value) return // no exceder el nº de días
    seleccion.value.push(id)
  }
  confirmado.value = false // cualquier cambio re-exige la confirmación si rompe descanso
}

// Días seleccionados ORDENADOS por semana (lunes→domingo).
const diasOrdenados = computed(() =>
  DIAS_SEMANA.filter((d) => seleccion.value.includes(d.id)),
)

// --- Asignación EDITABLE: sesionDia[i] = id del día de semana de la sesión i ---
// (las sesiones son props.rutina.dias; siempre hay tantas como diasPorSemana).
const sesionDia = ref([])

// Asignación por defecto: la sesión i cae en el i-ésimo día (orden de semana).
function asignacionPorDefecto() {
  return diasOrdenados.value.map((d) => d.id)
}

// Reconstruye desde una programación previa (al reacomodar/reprogramar): respeta qué
// sesión iba en qué día; rellena huecos con los días libres.
function reconstruirDesdeInicial() {
  const asig = props.inicial?.asignacion
  if (!asig || !lleno.value) return false
  const arr = new Array(props.rutina.dias.length).fill(null)
  for (const [diaId, sesionNombre] of Object.entries(asig)) {
    if (!seleccion.value.includes(diaId)) continue
    const si = props.rutina.dias.findIndex((s) => s.nombre === sesionNombre)
    if (si >= 0 && arr[si] === null) arr[si] = diaId
  }
  const usados = new Set(arr.filter(Boolean))
  const libres = diasOrdenados.value.map((d) => d.id).filter((id) => !usados.has(id))
  for (let i = 0; i < arr.length; i++) if (!arr[i]) arr[i] = libres.shift()
  if (arr.every(Boolean)) {
    sesionDia.value = arr
    return true
  }
  return false
}

// Init: precarga la asignación previa si la hay; si no, la automática.
if (!reconstruirDesdeInicial() && lleno.value) {
  sesionDia.value = asignacionPorDefecto()
}

// Si cambia el conjunto de días elegidos, rehacemos la asignación automática.
watch(
  seleccion,
  () => {
    sesionDia.value = lleno.value ? asignacionPorDefecto() : []
  },
  { deep: true },
)

const diaDeSesion = (si) => sesionDia.value[si] || null

// Reasigna la sesión `si` al día `diaId`. Si ese día ya lo tenía otra sesión, se
// INTERCAMBIAN (la otra sesión hereda el día que tenía esta) → siempre válido.
function asignarSesion(si, diaId) {
  if (!lleno.value) return
  const arr = sesionDia.value.slice()
  const otro = arr.findIndex((d, i) => d === diaId && i !== si)
  if (otro >= 0) arr[otro] = arr[si]
  arr[si] = diaId
  sesionDia.value = arr
}

// "Tu semana" (día → sesión), ordenado por día de la semana, derivado de sesionDia.
const asignacion = computed(() => {
  if (!lleno.value || sesionDia.value.length !== props.rutina.dias.length) return []
  const pares = props.rutina.dias.map((s, i) => ({ diaId: sesionDia.value[i], sesion: s.nombre }))
  return DIAS_SEMANA.filter((d) => pares.some((p) => p.diaId === d.id)).map((d) => {
    const p = pares.find((x) => x.diaId === d.id)
    return { diaId: d.id, diaLabel: d.label, sesion: p.sesion }
  })
})

// Pares de días CONSECUTIVOS (semana cíclica: domingo y lunes también cuentan).
const consecutivos = computed(() => {
  const sel = diasOrdenados.value
  if (sel.length < 2) return []
  const pares = []
  for (let i = 0; i < sel.length - 1; i++) {
    if (sel[i + 1].orden - sel[i].orden === 1) pares.push([sel[i], sel[i + 1]])
  }
  const primero = sel[0]
  const ultimo = sel[sel.length - 1]
  if (primero.orden === 0 && ultimo.orden === 6) pares.push([ultimo, primero])
  return pares
})

const consecutivosTexto = computed(() =>
  consecutivos.value.map((p) => `${p[0].label} y ${p[1].label}`).join(', '),
)

const rompeDescanso = computed(
  () => requiereDescanso.value && consecutivos.value.length > 0,
)
// Buena distribución: ya eligió todos los días, requiere descanso y NO hay seguidos.
const buenaDistribucion = computed(
  () => lleno.value && requiereDescanso.value && consecutivos.value.length === 0,
)

const puedeGuardar = computed(
  () => lleno.value && (!rompeDescanso.value || confirmado.value),
)

function guardar() {
  if (!puedeGuardar.value) return
  const asign = {}
  asignacion.value.forEach((a) => {
    asign[a.diaId] = a.sesion
  })
  emit('guardar', {
    dias: diasOrdenados.value.map((d) => d.id),
    asignacion: asign,
    rompeDescanso: rompeDescanso.value,
  })
}
</script>

<template>
  <div class="prog">
    <div class="prog__overlay" @click="emit('cancelar')" aria-hidden="true"></div>

    <div class="prog__sheet card" role="dialog" aria-label="Programar rutina">
      <header class="prog__head">
        <div>
          <p class="prog__kicker">Programa tu rutina</p>
          <h2 class="prog__title">{{ rutina.nombre }}</h2>
        </div>
        <button class="prog__close" type="button" aria-label="Cerrar" @click="emit('cancelar')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <!-- Instrucción + contador -->
      <div class="prog__inst">
        <span>Elige <strong>{{ nDias }} días</strong> para entrenar.</span>
        <span class="prog__count" :class="{ 'prog__count--ok': lleno }">
          {{ seleccion.length }}/{{ nDias }}
        </span>
      </div>

      <!-- Días de la semana -->
      <div class="prog__dias">
        <button
          v-for="d in DIAS_SEMANA"
          :key="d.id"
          type="button"
          class="dchip"
          :class="{ 'dchip--on': estaSel(d.id), 'dchip--lleno': !estaSel(d.id) && lleno }"
          @click="toggleDia(d.id)"
        >
          {{ d.corto }}
        </button>
      </div>
      <p v-if="!lleno && faltan > 0" class="prog__hint">
        Te {{ faltan === 1 ? 'falta' : 'faltan' }} {{ faltan }}
        {{ faltan === 1 ? 'día' : 'días' }} por elegir.
      </p>

      <!-- Asignación editable: cada sesión → un día elegido (reordenable) -->
      <div v-if="lleno" class="asig">
        <p class="asig__lab">Asigna cada entrenamiento a un día</p>
        <ul class="asig__list">
          <li v-for="(sesion, si) in rutina.dias" :key="si" class="asigx">
            <span class="asigx__ses">{{ sesion.nombre }}</span>
            <div class="asigx__dias">
              <button
                v-for="d in diasOrdenados"
                :key="d.id"
                type="button"
                class="ddot"
                :class="{ 'ddot--on': diaDeSesion(si) === d.id }"
                @click="asignarSesion(si, d.id)"
              >{{ d.corto }}</button>
            </div>
          </li>
        </ul>
        <p class="asig__tip">Toca un día para mover ahí ese entrenamiento; si el día ya está ocupado, se intercambian.</p>
      </div>

      <!-- Validación de descanso -->
      <div v-if="rompeDescanso" class="aviso aviso--warn">
        <span class="aviso__ic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
        </span>
        <div class="aviso__body">
          <p class="aviso__txt">
            Elegiste días seguidos ({{ consecutivosTexto }}). {{ notaDescanso }}
          </p>
          <label class="aviso__check">
            <input type="checkbox" v-model="confirmado" />
            <span>Entiendo y quiero continuar de todos modos</span>
          </label>
        </div>
      </div>

      <div v-else-if="buenaDistribucion" class="aviso aviso--ok">
        <span class="aviso__ic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p class="aviso__txt">Buena distribución: respetas el descanso entre sesiones.</p>
      </div>

      <div v-else-if="lleno && !requiereDescanso" class="aviso aviso--info">
        <span class="aviso__ic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
          </svg>
        </span>
        <p class="aviso__txt">{{ notaDescanso }}</p>
      </div>

      <!-- Acciones -->
      <div class="prog__acciones">
        <button class="btn btn--ghost" type="button" @click="emit('cancelar')">Cancelar</button>
        <button class="btn btn--primary" type="button" :disabled="!puedeGuardar" @click="guardar">
          Guardar mi rutina
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prog {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.prog__overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 8, 20, 0.6);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.prog__sheet {
  position: relative;
  z-index: 1;
  width: min(480px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding-bottom: calc(var(--safe-bottom) + 20px);
  animation: subir 0.28s var(--ease);
}
@keyframes subir {
  from { transform: translateY(18px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@media (min-width: 540px) {
  .prog { align-items: center; }
  .prog__sheet { border-radius: var(--r-lg); }
}

.prog__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.prog__kicker {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cyan-bright);
}
.prog__title { font-family: var(--font-display); font-weight: 800; font-size: 1.25rem; letter-spacing: -0.01em; }
.prog__close {
  flex: 0 0 auto;
  border: 0;
  background: var(--surface-2);
  color: var(--text-dim);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.prog__close:active { background: var(--surface-3); color: var(--text); }

.prog__inst { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.95rem; color: var(--text-dim); }
.prog__inst strong { color: var(--text); }
.prog__count {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid var(--line);
  padding: 3px 10px;
  border-radius: var(--r-pill);
}
.prog__count--ok { color: var(--success); border-color: rgba(34, 197, 94, 0.35); background: var(--success-soft); }

.prog__dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dchip {
  display: grid;
  place-items: center;
  height: 46px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.16s var(--ease), border-color 0.16s var(--ease), background 0.16s var(--ease), transform 0.1s var(--ease);
}
.dchip:active { transform: scale(0.94); }
.dchip--on {
  color: #04121a;
  background: var(--grad-firma);
  border-color: transparent;
  box-shadow: 0 6px 16px var(--accent-glow);
}
.dchip--lleno { opacity: 0.5; }

.prog__hint { font-size: 0.8rem; color: var(--text-faint); margin-top: -6px; }

/* Asignación */
.asig { display: flex; flex-direction: column; gap: 8px; }
.asig__lab {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
.asig__list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.asigx {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
.asigx__ses { font-weight: 700; font-size: 0.9rem; color: var(--text); min-width: 0; }
.asigx__dias { display: flex; gap: 5px; flex-wrap: wrap; }
.ddot {
  display: grid;
  place-items: center;
  min-width: 38px;
  height: 34px;
  padding: 0 6px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-faint);
  font-family: inherit;
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.14s var(--ease), border-color 0.14s var(--ease), background 0.14s var(--ease);
}
.ddot:active { transform: scale(0.93); }
.ddot--on {
  color: #04121a;
  background: var(--cyan-bright);
  border-color: transparent;
}
.asig__tip { font-size: 0.76rem; color: var(--text-faint); line-height: 1.4; }

/* Avisos */
.aviso { display: flex; gap: 12px; padding: 13px 15px; border-radius: var(--r-md); }
.aviso__ic { flex-shrink: 0; }
.aviso__body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.aviso__txt { font-size: 0.9rem; line-height: 1.45; color: var(--text); }
.aviso--warn { border: 1px solid rgba(255, 194, 75, 0.45); background: var(--warn-soft); }
.aviso--warn .aviso__ic { color: var(--warn); }
.aviso--ok { border: 1px solid rgba(34, 197, 94, 0.4); background: var(--success-soft); align-items: center; }
.aviso--ok .aviso__ic { color: var(--success); }
.aviso--ok .aviso__txt { color: var(--success); font-weight: 700; }
.aviso--info { border: 1px solid var(--line); background: var(--surface-2); align-items: center; }
.aviso--info .aviso__ic { color: var(--cyan-bright); }
.aviso--info .aviso__txt { color: var(--text-dim); }

.aviso__check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}
.aviso__check input {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  accent-color: var(--warn);
  margin-top: 1px;
  cursor: pointer;
}

.prog__acciones { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 2px; }
.prog__acciones .btn { height: 52px; }
</style>
