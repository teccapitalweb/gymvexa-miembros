<script setup>
// Videos del gym para el socio. Lee gyms/{gymId}/videos (lo que el staff sube
// desde el panel) y los muestra en una galería estilo BioNova: tarjetas con
// miniatura y un visor a pantalla completa con el video embebido.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useSocioStore } from '../stores/socio'
import { categoriaLabel } from '../data/categoriasContenido'
import { urlAEmbed, miniaturaDe, tipoDeUrl } from '../composables/useVideoEmbed'

const socioStore = useSocioStore()
const gymId = computed(() => socioStore.gymId)

const videos = ref([])
const cargando = ref(true)
let unsub = null

function suscribir() {
  if (!gymId.value || unsub) return
  cargando.value = true
  const q = query(
    collection(db, 'gyms', gymId.value, 'videos'),
    orderBy('creadoEn', 'desc')
  )
  unsub = onSnapshot(
    q,
    (snap) => {
      videos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cargando.value = false
    },
    (err) => {
      console.error('[videos] onSnapshot:', err)
      cargando.value = false
    }
  )
}

onMounted(() => {
  if (gymId.value) suscribir()
})
watch(gymId, (g) => {
  if (g) suscribir()
})
onUnmounted(() => {
  if (unsub) unsub()
})

// --- Filtro por categoría ---
const catActiva = ref('') // '' = todas

const categoriasPresentes = computed(() => {
  const set = new Set(videos.value.map((v) => v.categoria || 'general'))
  return [...set].sort((a, b) =>
    categoriaLabel(a).localeCompare(categoriaLabel(b))
  )
})

const videosFiltrados = computed(() => {
  if (!catActiva.value) return videos.value
  return videos.value.filter(
    (v) => (v.categoria || 'general') === catActiva.value
  )
})

// --- Visor ---
const verVideo = ref(null) // el video abierto, o null

function abrir(v) {
  verVideo.value = v
  document.body.style.overflow = 'hidden'
}
function cerrar() {
  verVideo.value = null
  document.body.style.overflow = ''
}

const embedActual = computed(() =>
  verVideo.value ? urlAEmbed(verVideo.value.url) : ''
)
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Videos</h1>
      <p class="vista-sub">Rutinas y técnica en video, directo de tu gym.</p>
    </header>

    <!-- Cargando -->
    <div v-if="cargando" class="vid-grid">
      <div v-for="n in 4" :key="n" class="vid-skeleton"></div>
    </div>

    <!-- Sin videos -->
    <div v-else-if="videos.length === 0" class="vid-vacio card">
      <span class="vid-vacio__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <path d="m10 9 5 3-5 3z" />
        </svg>
      </span>
      <h2 class="vid-vacio__title">Aún no hay videos</h2>
      <p class="vid-vacio__text">
        Tu gimnasio todavía no sube videos. En cuanto agreguen el primero, aparecerá aquí.
      </p>
    </div>

    <!-- Galería -->
    <template v-else>
      <!-- Chips de categoría -->
      <div class="vid-cats">
        <button
          type="button"
          class="vid-cat"
          :class="{ 'vid-cat--on': catActiva === '' }"
          @click="catActiva = ''"
        >
          Todos
        </button>
        <button
          v-for="c in categoriasPresentes"
          :key="c"
          type="button"
          class="vid-cat"
          :class="{ 'vid-cat--on': catActiva === c }"
          @click="catActiva = c"
        >
          {{ categoriaLabel(c) }}
        </button>
      </div>

      <!-- Tarjetas -->
      <div class="vid-grid">
        <button
          v-for="v in videosFiltrados"
          :key="v.id"
          type="button"
          class="vid-card"
          @click="abrir(v)"
        >
          <span class="vid-thumb" :class="'vid-thumb--' + tipoDeUrl(v.url)">
            <img
              v-if="miniaturaDe(v.url)"
              :src="miniaturaDe(v.url)"
              :alt="v.titulo"
              class="vid-thumb__img"
              loading="lazy"
            />
            <span class="vid-thumb__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72L19 12z" />
              </svg>
            </span>
          </span>

          <span class="vid-info">
            <span class="vid-cat-pill">{{ categoriaLabel(v.categoria) }}</span>
            <span class="vid-title">{{ v.titulo }}</span>
            <span v-if="v.descripcion" class="vid-desc">{{ v.descripcion }}</span>
          </span>
        </button>
      </div>

      <p v-if="videosFiltrados.length === 0" class="vid-sinresultados">
        No hay videos en esta categoría.
      </p>
    </template>

    <!-- Visor a pantalla completa -->
    <Transition name="visor">
      <div v-if="verVideo" class="visor" @click.self="cerrar">
        <div class="visor__panel">
          <header class="visor__head">
            <div class="visor__titles">
              <span class="visor__cat">{{ categoriaLabel(verVideo.categoria) }}</span>
              <h3 class="visor__title">{{ verVideo.titulo }}</h3>
            </div>
            <button type="button" class="visor__close" aria-label="Cerrar" @click="cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div class="visor__frame">
            <iframe
              :src="embedActual"
              title="Reproductor de video"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowfullscreen
            ></iframe>
          </div>

          <p v-if="verVideo.descripcion" class="visor__desc">{{ verVideo.descripcion }}</p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
/* ---------------------------- Chips de categoría --------------------------- */
.vid-cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.vid-cats::-webkit-scrollbar { display: none; }
.vid-cat {
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
.vid-cat--on {
  color: var(--accent-bright);
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* -------------------------------- Galería --------------------------------- */
.vid-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}
@media (min-width: 420px) {
  .vid-grid { grid-template-columns: 1fr 1fr; }
}

.vid-card {
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
.vid-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--glow-accent);
}
.vid-card:active { transform: translateY(0); }

/* Miniatura 16:9 */
.vid-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(120% 120% at 50% 0%, var(--accent-soft), transparent 60%),
    linear-gradient(135deg, var(--surface-3), var(--surface-2));
  overflow: hidden;
}
.vid-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.vid-thumb__play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(6, 12, 24, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  color: #fff;
  box-shadow: 0 0 0 1px var(--accent-glow), 0 8px 24px rgba(6, 182, 212, 0.35);
  transition: transform 0.2s ease, background 0.2s ease;
}
.vid-thumb__play svg { width: 22px; height: 22px; margin-left: 2px; }
.vid-card:hover .vid-thumb__play {
  transform: scale(1.08);
  background: var(--accent);
}

/* Info debajo */
.vid-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 13px 14px;
}
.vid-cat-pill {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--accent-soft);
  color: var(--accent-bright);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.vid-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text);
  line-height: 1.28;
}
.vid-desc {
  font-size: 0.82rem;
  color: var(--text-dim);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vid-sinresultados {
  text-align: center;
  color: var(--text-faint);
  font-size: 0.9rem;
  padding: 8px 0;
}

/* --------------------------------- Vacío ---------------------------------- */
.vid-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 24px;
}
.vid-vacio__icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--r-lg);
  background: var(--accent-soft);
  color: var(--accent-bright);
}
.vid-vacio__icon svg { width: 30px; height: 30px; }
.vid-vacio__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text);
  margin: 0;
}
.vid-vacio__text {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 300px;
}

/* -------------------------------- Skeleton -------------------------------- */
.vid-skeleton {
  aspect-ratio: 16 / 9;
  border-radius: var(--r-lg);
  background: linear-gradient(
    100deg,
    var(--surface) 30%,
    var(--surface-2) 50%,
    var(--surface) 70%
  );
  background-size: 200% 100%;
  animation: vidShimmer 1.4s infinite;
}
@keyframes vidShimmer {
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
.visor__close {
  flex-shrink: 0;
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
.visor__close:hover {
  color: var(--text);
  border-color: var(--accent);
  background: var(--surface-3);
}
.visor__close svg { width: 18px; height: 18px; }
.visor__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.visor__frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.visor__desc {
  padding: 13px 16px 16px;
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
}

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
  .vid-card, .vid-thumb__play, .visor-enter-active, .visor-leave-active,
  .visor-enter-active .visor__panel, .visor-leave-active .visor__panel {
    transition: none;
  }
  .vid-skeleton { animation: none; }
}
</style>
