<script setup>
// REELS — comunidad GLOBAL de video corto de Gymvexa (estilo Xiaohongshu).
// Feed en cuadrícula de 2 columnas: portadas livianas; el video pesado solo se
// reproduce al abrir uno (cuida el Storage). Todos los gyms se ven entre sí.
//
// TANDA 1B: subir (modal) + feed real + visor para reproducir + filtros.
// Eliminar tu video y los likes/comentarios llegan después.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useSocioStore } from '../stores/socio'
import { CATEGORIAS_REELS, categoriaReelLabel } from '../data/categoriasReels'
import ReelSubir from '../components/ReelSubir.vue'

const router = useRouter()
const socio = useSocioStore()

const vista = ref('todos') // 'todos' | 'club'
const categoriaActiva = ref('todas')

const reels = ref([])
const cargando = ref(true)
let unsub = null

const mostrarSubir = ref(false)
const reelActivo = ref(null) // para el visor

const faltanRedes = computed(() => {
  const d = socio.datos || {}
  return !d.ig && !d.tiktok
})

const reelsFiltrados = computed(() => {
  let lista = reels.value
  if (vista.value === 'club' && socio.gymId) {
    lista = lista.filter((r) => r.gymId === socio.gymId)
  }
  if (categoriaActiva.value !== 'todas') {
    lista = lista.filter((r) => r.categoria === categoriaActiva.value)
  }
  return lista
})

function suscribir() {
  if (unsub) return
  const q = query(collection(db, 'reels'), orderBy('creadoEn', 'desc'), limit(80))
  unsub = onSnapshot(
    q,
    (snap) => {
      reels.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cargando.value = false
    },
    () => {
      cargando.value = false
    },
  )
}

function irAPerfil() {
  router.push('/perfil')
}

function igLink(u) {
  return 'https://instagram.com/' + u
}
function tiktokLink(u) {
  return 'https://www.tiktok.com/@' + u
}

function abrirVisor(r) {
  reelActivo.value = r
}
function cerrarVisor() {
  reelActivo.value = null
}

function onPublicado() {
  mostrarSubir.value = false
  // El onSnapshot refresca el feed solo; reseteamos filtros para ver el nuevo.
  vista.value = 'todos'
  categoriaActiva.value = 'todas'
}

onMounted(() => {
  if (!socio.estaVinculado && !socio.resuelto) socio.vincularSocio()
  suscribir()
})
onUnmounted(() => {
  if (unsub) unsub()
})
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Reels</h1>
      <p class="vista-sub">La comunidad fitness de Gymvexa</p>
    </header>

    <!-- Aviso para completar redes -->
    <button v-if="faltanRedes" class="rl-aviso" @click="irAPerfil">
      <span class="rl-aviso__ic" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <span class="rl-aviso__txt">
        Agrega tu Instagram y TikTok en tu perfil para que aparezcan en tus videos.
      </span>
      <span class="rl-aviso__go" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </span>
    </button>

    <!-- Filtro principal -->
    <div class="rl-seg" role="tablist">
      <button class="rl-seg__btn" :class="{ 'rl-seg__btn--on': vista === 'todos' }"
              role="tab" :aria-selected="vista === 'todos'" @click="vista = 'todos'">
        Todos los videos
      </button>
      <button class="rl-seg__btn" :class="{ 'rl-seg__btn--on': vista === 'club' }"
              role="tab" :aria-selected="vista === 'club'" @click="vista = 'club'">
        Solo mi club
      </button>
    </div>

    <!-- Categorías deslizables -->
    <div class="rl-chips">
      <button class="rl-chip" :class="{ 'rl-chip--on': categoriaActiva === 'todas' }"
              @click="categoriaActiva = 'todas'">
        Para ti
      </button>
      <button v-for="c in CATEGORIAS_REELS" :key="c.value" class="rl-chip"
              :class="{ 'rl-chip--on': categoriaActiva === c.value }"
              @click="categoriaActiva = c.value">
        {{ c.label }}
      </button>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="rl-load">
      <span class="rl-spin" aria-hidden="true"></span>
    </div>

    <!-- Feed -->
    <div v-else-if="reelsFiltrados.length" class="rl-grid">
      <article v-for="r in reelsFiltrados" :key="r.id" class="rl-card" @click="abrirVisor(r)">
        <div class="rl-card__cover">
          <img :src="r.portadaUrl" :alt="r.descripcion || 'Reel'" loading="lazy" class="rl-card__img" />
          <span class="rl-card__play" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(255,255,255,.92)">
              <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.35)" />
              <path d="M10 8.5v7l5-3.5z" fill="#fff" />
            </svg>
          </span>
        </div>
        <div class="rl-card__info">
          <p v-if="r.descripcion" class="rl-card__desc">{{ r.descripcion }}</p>
          <div class="rl-card__autor">
            <span class="rl-card__nombre">{{ r.autorNombre }}</span>
            <span v-if="r.esStaff" class="rl-card__badge">Staff</span>
          </div>
          <div class="rl-card__pie">
            <span class="rl-card__gym">{{ r.gymNombre }}</span>
            <span class="rl-card__redes">
              <a v-if="r.ig" :href="igLink(r.ig)" target="_blank" rel="noopener"
                 class="rl-soc" aria-label="Instagram" @click.stop>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a v-if="r.tiktok" :href="tiktokLink(r.tiktok)" target="_blank" rel="noopener"
                 class="rl-soc" aria-label="TikTok" @click.stop>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
                </svg>
              </a>
            </span>
          </div>
        </div>
      </article>
    </div>

    <!-- Vacío -->
    <div v-else class="rl-empty">
      <span class="rl-empty__ic" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.2-2.5z" />
        </svg>
      </span>
      <p class="rl-empty__t">
        {{ vista === 'club' ? 'Tu club aún no tiene videos' : 'Aún no hay videos aquí' }}
      </p>
      <p class="rl-empty__d">Sé el primero: toca el botón de abajo y sube tu Reel.</p>
    </div>

    <!-- Botón flotante para subir -->
    <button class="rl-fab" aria-label="Subir Reel" @click="mostrarSubir = true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>

    <!-- Modal de subida -->
    <ReelSubir v-if="mostrarSubir" @cerrar="mostrarSubir = false" @publicado="onPublicado" />

    <!-- Visor (reproducir) -->
    <div v-if="reelActivo" class="rl-visor" @click.self="cerrarVisor">
      <button class="rl-visor__x" aria-label="Cerrar" @click="cerrarVisor">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div class="rl-visor__box">
        <video :src="reelActivo.videoUrl" class="rl-visor__video" controls autoplay playsinline
               :poster="reelActivo.portadaUrl"></video>
        <div class="rl-visor__info">
          <div class="rl-visor__top">
            <span class="rl-visor__nombre">{{ reelActivo.autorNombre }}</span>
            <span v-if="reelActivo.esStaff" class="rl-card__badge">Staff</span>
            <span class="rl-visor__gym">· {{ reelActivo.gymNombre }}</span>
          </div>
          <span class="rl-visor__cat">{{ categoriaReelLabel(reelActivo.categoria) }}</span>
          <p v-if="reelActivo.descripcion" class="rl-visor__desc">{{ reelActivo.descripcion }}</p>
          <div class="rl-visor__redes">
            <a v-if="reelActivo.ig" :href="igLink(reelActivo.ig)" target="_blank" rel="noopener" class="rl-visor__soc">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
              </svg>
              <span>@{{ reelActivo.ig }}</span>
            </a>
            <a v-if="reelActivo.tiktok" :href="tiktokLink(reelActivo.tiktok)" target="_blank" rel="noopener" class="rl-visor__soc">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
              </svg>
              <span>@{{ reelActivo.tiktok }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Aviso de completar redes */
.rl-aviso {
  width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 11px 12px; border-radius: var(--r-md); background: var(--accent-soft);
  border: 1px solid var(--border-soft); cursor: pointer;
}
.rl-aviso__ic { color: var(--accent); display: flex; flex-shrink: 0; }
.rl-aviso__txt { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 0.85rem; color: var(--text); line-height: 1.35; }
.rl-aviso__go { color: var(--text-dim); display: flex; flex-shrink: 0; }

/* Segmented */
.rl-seg { display: flex; gap: 6px; padding: 5px; border-radius: var(--r-pill); background: var(--surface-2); }
.rl-seg__btn { flex: 1; min-width: 0; padding: 9px 12px; border-radius: var(--r-pill); font-weight: 700; font-size: 0.9rem; color: var(--text-dim); transition: color 0.18s, background 0.18s, box-shadow 0.18s; }
.rl-seg__btn--on { color: #fff; background: var(--grad-firma); box-shadow: 0 6px 16px var(--accent-glow); }

/* Chips */
.rl-chips { display: flex; gap: 8px; min-width: 0; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.rl-chips::-webkit-scrollbar { display: none; }
.rl-chip { flex-shrink: 0; padding: 8px 14px; border-radius: var(--r-pill); font-size: 0.84rem; font-weight: 600; white-space: nowrap; color: var(--text-dim); background: var(--surface-2); border: 1px solid transparent; transition: color 0.16s, background 0.16s, border-color 0.16s; }
.rl-chip--on { color: var(--accent); background: var(--accent-soft); border-color: var(--accent); }

/* Cargando */
.rl-load { display: flex; justify-content: center; padding: 48px 0; }
.rl-spin { width: 30px; height: 30px; border-radius: 50%; border: 3px solid var(--accent-soft); border-top-color: var(--accent); animation: rlSpin 0.8s linear infinite; }
@keyframes rlSpin { to { transform: rotate(360deg); } }

/* Cuadrícula 2 columnas */
.rl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rl-card { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--r-md); overflow: hidden; cursor: pointer; transition: transform 0.14s ease; }
.rl-card:active { transform: scale(0.985); }
.rl-card__cover { position: relative; width: 100%; aspect-ratio: 9 / 16; background: var(--surface-2); }
.rl-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rl-card__play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.rl-card__info { padding: 9px 10px 11px; display: flex; flex-direction: column; gap: 6px; }
.rl-card__desc { font-size: 0.84rem; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rl-card__autor { display: flex; align-items: center; gap: 6px; min-width: 0; }
.rl-card__nombre { font-size: 0.82rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-card__badge { flex-shrink: 0; font-size: 0.64rem; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 1px 6px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; }
.rl-card__pie { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.rl-card__gym { font-size: 0.74rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-card__redes { display: flex; gap: 7px; flex-shrink: 0; }
.rl-soc { color: var(--text-dim); display: flex; transition: color 0.15s; }
.rl-soc:active { color: var(--accent); }

/* Vacío */
.rl-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 24px; color: var(--text-dim); }
.rl-empty__ic { display: flex; color: var(--text-faint); margin-bottom: 4px; }
.rl-empty__t { font-weight: 700; font-size: 1.02rem; color: var(--text); }
.rl-empty__d { font-size: 0.88rem; line-height: 1.45; max-width: 320px; }

/* FAB */
.rl-fab {
  position: fixed; right: 18px; bottom: calc(var(--nav-h, 68px) + 18px); z-index: 60;
  width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; background: var(--grad-firma); box-shadow: 0 8px 22px var(--accent-glow);
  transition: transform 0.14s ease;
}
.rl-fab:active { transform: scale(0.93); }

/* Visor */
.rl-visor { position: fixed; inset: 0; z-index: 1000; background: rgba(2, 6, 23, 0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
.rl-visor__x { position: absolute; top: 14px; right: 14px; color: #fff; padding: 6px; z-index: 2; }
.rl-visor__box { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 12px; }
.rl-visor__video { width: 100%; max-height: 64vh; border-radius: var(--r-md); background: #000; aspect-ratio: 9 / 16; object-fit: contain; }
.rl-visor__info { display: flex; flex-direction: column; gap: 6px; color: #fff; }
.rl-visor__top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rl-visor__nombre { font-weight: 800; font-size: 1rem; }
.rl-visor__gym { color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; }
.rl-visor__cat { font-size: 0.78rem; color: rgba(255, 255, 255, 0.6); }
.rl-visor__desc { font-size: 0.9rem; line-height: 1.4; color: rgba(255, 255, 255, 0.92); }
.rl-visor__redes { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
.rl-visor__soc { display: flex; align-items: center; gap: 6px; color: #fff; background: rgba(255, 255, 255, 0.12); padding: 7px 12px; border-radius: var(--r-pill); font-size: 0.84rem; font-weight: 600; }
.rl-visor__soc:active { background: rgba(255, 255, 255, 0.22); }
</style>
