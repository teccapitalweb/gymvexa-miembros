<script setup>
// Materiales del gym para el socio. Lee gyms/{gymId}/materiales (lo que el staff
// sube desde el panel) y los muestra como galería estilo BioNova: cada tarjeta
// usa la PORTADA temática de su categoría, y al abrir hay un visor con el
// documento (PDF/Drive) embebido y botón propio de pantalla completa.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useSocioStore } from '../stores/socio'
import { categoriaLabel } from '../data/categoriasContenido'
import { gradientePortada, fotoPortada } from '../data/portadasCategorias'
import { urlAEmbed } from '../composables/useVideoEmbed'

const socioStore = useSocioStore()
const gymId = computed(() => socioStore.gymId)

const materiales = ref([])
const cargando = ref(true)
let unsub = null

function suscribir() {
  if (!gymId.value || unsub) return
  cargando.value = true
  const q = query(
    collection(db, 'gyms', gymId.value, 'materiales'),
    orderBy('creadoEn', 'desc')
  )
  unsub = onSnapshot(
    q,
    (snap) => {
      materiales.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cargando.value = false
    },
    (err) => {
      console.error('[materiales] onSnapshot:', err)
      cargando.value = false
    }
  )
}

onMounted(() => {
  if (gymId.value) suscribir()
  document.addEventListener('fullscreenchange', onFsChange)
})
watch(gymId, (g) => {
  if (g) suscribir()
})
onUnmounted(() => {
  if (unsub) unsub()
  document.removeEventListener('fullscreenchange', onFsChange)
  document.body.style.overflow = ''
})

// --- Filtro por categoría ---
const catActiva = ref('') // '' = todas

const categoriasPresentes = computed(() => {
  const set = new Set(materiales.value.map((m) => m.categoria || 'general'))
  return [...set].sort((a, b) =>
    categoriaLabel(a).localeCompare(categoriaLabel(b))
  )
})

const materialesFiltrados = computed(() => {
  if (!catActiva.value) return materiales.value
  return materiales.value.filter(
    (m) => (m.categoria || 'general') === catActiva.value
  )
})

// --- Visor + pantalla completa ---
const verMaterial = ref(null) // el material abierto, o null
const expandido = ref(false)
const frameRef = ref(null)

function abrir(m) {
  verMaterial.value = m
  document.body.style.overflow = 'hidden'
}
function cerrar() {
  salirExpandido()
  verMaterial.value = null
  document.body.style.overflow = ''
}

function alternarExpandido() {
  expandido.value = !expandido.value
  try {
    if (expandido.value) {
      frameRef.value?.requestFullscreen?.()
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.()
    }
  } catch {
    /* sin Fullscreen API: el modo CSS ya cubre la pantalla */
  }
}
function salirExpandido() {
  expandido.value = false
  try {
    if (document.fullscreenElement) document.exitFullscreen?.()
  } catch {
    /* noop */
  }
}
function onFsChange() {
  if (!document.fullscreenElement && expandido.value) {
    expandido.value = false
  }
}

const embedActual = computed(() =>
  verMaterial.value ? urlAEmbed(verMaterial.value.url) : ''
)
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Materiales</h1>
      <p class="vista-sub">Guías, PDFs y documentos, directo de tu gym.</p>
    </header>

    <!-- Cargando -->
    <div v-if="cargando" class="mat-grid">
      <div v-for="n in 4" :key="n" class="mat-skeleton"></div>
    </div>

    <!-- Sin materiales -->
    <div v-else-if="materiales.length === 0" class="mat-vacio card">
      <span class="mat-vacio__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>
      <h2 class="mat-vacio__title">Aún no hay materiales</h2>
      <p class="mat-vacio__text">
        Tu gimnasio todavía no sube materiales. En cuanto agreguen el primero, aparecerá aquí.
      </p>
    </div>

    <!-- Galería -->
    <template v-else>
      <!-- Chips de categoría -->
      <div class="mat-cats">
        <button
          type="button"
          class="mat-cat"
          :class="{ 'mat-cat--on': catActiva === '' }"
          @click="catActiva = ''"
        >
          Todos
        </button>
        <button
          v-for="c in categoriasPresentes"
          :key="c"
          type="button"
          class="mat-cat"
          :class="{ 'mat-cat--on': catActiva === c }"
          @click="catActiva = c"
        >
          {{ categoriaLabel(c) }}
        </button>
      </div>

      <!-- Tarjetas -->
      <div class="mat-grid">
        <button
          v-for="m in materialesFiltrados"
          :key="m.id"
          type="button"
          class="mat-card"
          @click="abrir(m)"
        >
          <span class="mat-thumb" :style="{ background: gradientePortada(m.categoria) }">
            <img
              class="mat-thumb__img"
              :src="fotoPortada(m.categoria)"
              :alt="categoriaLabel(m.categoria)"
              loading="lazy"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <span class="mat-thumb__shade" aria-hidden="true"></span>
            <span class="mat-thumb__cat">{{ categoriaLabel(m.categoria) }}</span>
            <span class="mat-thumb__doc" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
          </span>

          <span class="mat-info">
            <span class="mat-title">{{ m.titulo }}</span>
            <span v-if="m.descripcion" class="mat-desc">{{ m.descripcion }}</span>
          </span>
        </button>
      </div>

      <p v-if="materialesFiltrados.length === 0" class="mat-sinresultados">
        No hay materiales en esta categoría.
      </p>
    </template>

    <!-- Visor -->
    <Transition name="visor">
      <div v-if="verMaterial" class="visor" @click.self="cerrar">
        <div class="visor__panel">
          <header v-show="!expandido" class="visor__head">
            <div class="visor__titles">
              <span class="visor__cat">{{ categoriaLabel(verMaterial.categoria) }}</span>
              <h3 class="visor__title">{{ verMaterial.titulo }}</h3>
            </div>
            <div class="visor__acciones">
              <button
                type="button"
                class="visor__btn visor__btn--full"
                aria-label="Pantalla completa"
                @click="alternarExpandido"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              <button type="button" class="visor__btn" aria-label="Cerrar" @click="cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          <div ref="frameRef" class="visor__frame visor__frame--doc" :class="{ 'visor__frame--full': expandido }">
            <iframe
              :src="embedActual"
              title="Visor de documento"
              frameborder="0"
              allow="autoplay; encrypted-media; fullscreen"
              allowfullscreen
            ></iframe>

            <button
              v-show="expandido"
              type="button"
              class="visor__min"
              aria-label="Salir de pantalla completa"
              @click="alternarExpandido"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
          </div>

          <div v-show="!expandido" class="visor__pie">
            <p v-if="verMaterial.descripcion" class="visor__desc">{{ verMaterial.descripcion }}</p>
            <a class="visor__abrir" :href="verMaterial.url" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Abrir en una pestaña
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
/* ---------------------------- Chips de categoría --------------------------- */
.mat-cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.mat-cats::-webkit-scrollbar { display: none; }
.mat-cat {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-dim);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.18s, border-color 0.18s, background 0.18s;
}
.mat-cat--on {
  color: var(--accent-bright);
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* -------------------------------- Galería --------------------------------- */
.mat-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}
@media (min-width: 420px) {
  .mat-grid { grid-template-columns: 1fr 1fr; }
}

.mat-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.mat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--glow-accent);
}
.mat-card:active { transform: translateY(0); }

/* Portada temática (16:9) */
.mat-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.mat-thumb__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mat-thumb__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 30%, rgba(0, 0, 0, 0.62) 100%);
  pointer-events: none;
}
.mat-thumb__cat {
  position: absolute;
  left: 13px;
  bottom: 11px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.18rem;
  letter-spacing: -0.01em;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.mat-thumb__doc {
  position: absolute;
  top: 11px;
  right: 11px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(6, 12, 24, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(3px);
  color: #fff;
  transition: transform 0.2s ease, background 0.2s ease;
}
.mat-thumb__doc svg { width: 18px; height: 18px; }
.mat-card:hover .mat-thumb__doc {
  transform: scale(1.08);
  background: rgba(6, 12, 24, 0.7);
}

/* Info debajo */
.mat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 13px 13px;
}
.mat-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text);
  line-height: 1.28;
}
.mat-desc {
  font-size: 0.82rem;
  color: var(--text-dim);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mat-sinresultados {
  text-align: center;
  color: var(--text-faint);
  font-size: 0.9rem;
  padding: 8px 0;
}

/* --------------------------------- Vacío ---------------------------------- */
.mat-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 24px;
}
.mat-vacio__icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--r-lg);
  background: var(--accent-soft);
  color: var(--accent-bright);
}
.mat-vacio__icon svg { width: 30px; height: 30px; }
.mat-vacio__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text);
  margin: 0;
}
.mat-vacio__text {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 300px;
}

/* -------------------------------- Skeleton -------------------------------- */
.mat-skeleton {
  aspect-ratio: 16 / 9;
  border-radius: var(--r-lg);
  background: linear-gradient(
    100deg,
    var(--surface) 30%,
    var(--surface-2) 50%,
    var(--surface) 70%
  );
  background-size: 200% 100%;
  animation: matShimmer 1.4s infinite;
}
@keyframes matShimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

/* --------------------------------- Visor ---------------------------------- */
.visor {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, var(--safe-top)) 16px max(16px, var(--safe-bottom));
  background: rgba(4, 8, 18, 0.82);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
}
.visor__panel {
  width: 100%;
  max-width: 720px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
.visor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}
.visor__titles { min-width: 0; }
.visor__cat {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-bright);
  margin-bottom: 2px;
}
.visor__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.visor__acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.visor__btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.18s, border-color 0.18s, background 0.18s;
}
.visor__btn:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--surface-3);
}
.visor__btn svg { width: 18px; height: 18px; }
.visor__btn--full {
  color: var(--accent-bright);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.visor__btn--full:hover {
  color: #fff;
  background: var(--accent);
}

.visor__frame {
  position: relative;
  width: 100%;
  background: #fff;
}
/* Los documentos son más altos que anchos: damos más altura que a un video. */
.visor__frame--doc {
  height: min(70vh, 560px);
}
.visor__frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Pantalla completa (modo CSS: cubre toda la ventana, también en iPhone) */
.visor__frame--full {
  position: fixed;
  inset: 0;
  z-index: 1100;
  width: 100vw;
  height: 100dvh;
}
.visor__frame--full:fullscreen { width: 100%; height: 100%; }
.visor__min {
  position: absolute;
  top: max(14px, var(--safe-top));
  right: 14px;
  z-index: 1101;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(6, 12, 24, 0.6);
  backdrop-filter: blur(6px);
  color: #fff;
  cursor: pointer;
}
.visor__min svg { width: 20px; height: 20px; }

.visor__pie {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 16px 16px;
}
.visor__desc {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
}
.visor__abrir {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-bright);
  text-decoration: none;
}
.visor__abrir svg { width: 15px; height: 15px; }

/* Transición del visor */
.visor-enter-active,
.visor-leave-active { transition: opacity 0.22s ease; }
.visor-enter-from,
.visor-leave-to { opacity: 0; }
.visor-enter-active .visor__panel,
.visor-leave-active .visor__panel { transition: transform 0.24s ease; }
.visor-enter-from .visor__panel,
.visor-leave-to .visor__panel { transform: scale(0.94); }

@media (prefers-reduced-motion: reduce) {
  .mat-card, .mat-thumb__doc, .visor-enter-active, .visor-leave-active,
  .visor-enter-active .visor__panel, .visor-leave-active .visor__panel {
    transition: none;
  }
  .mat-skeleton { animation: none; }
}
</style>
