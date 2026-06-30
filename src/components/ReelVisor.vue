<script setup>
// Visor de un Reel a PANTALLA COMPLETA (estilo TikTok/Reels): el video llena
// toda la pantalla y encima van los botones (me gusta, comentar, guardar), la
// info del autor y la barra de progreso. Bloquea el scroll del fondo mientras
// está abierto. Los comentarios se abren en un panel inferior.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  doc, updateDoc, increment, arrayUnion, arrayRemove,
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useSocioStore } from '../stores/socio'
import { categoriaReelLabel } from '../data/categoriasReels'

const props = defineProps({ reel: { type: Object, required: true } })
const emit = defineEmits(['cerrar'])
const socio = useSocioStore()

const miUid = computed(() => auth.currentUser?.uid || null)

// Estado en vivo del reel (contadores) suscrito al documento.
const reelVivo = ref({ ...props.reel })
let unsubReel = null

const likes = computed(() => reelVivo.value.likes || 0)
const guardados = computed(() => reelVivo.value.guardados || 0)
const comentariosCount = computed(() => reelVivo.value.comentariosCount || 0)
const yaDiLike = computed(() => (reelVivo.value.likedBy || []).includes(miUid.value))
const yaGuarde = computed(() => (reelVivo.value.guardadoPor || []).includes(miUid.value))
const inicial = computed(() => (reelVivo.value.autorNombre || '?').charAt(0).toUpperCase())

function igLink(u) { return 'https://instagram.com/' + u }
function tiktokLink(u) { return 'https://www.tiktok.com/@' + u }

// ---------- Reproducción ----------
const videoEl = ref(null)
const pausado = ref(false)
const silenciado = ref(false)
const progreso = ref(0)

function togglePlay() {
  const v = videoEl.value
  if (!v) return
  if (v.paused) {
    v.play().catch(() => {})
    pausado.value = false
  } else {
    v.pause()
    pausado.value = true
  }
}
function toggleMute(e) {
  e.stopPropagation()
  const v = videoEl.value
  if (!v) return
  v.muted = !v.muted
  silenciado.value = v.muted
}
function onTime() {
  const v = videoEl.value
  if (v && v.duration) progreso.value = (v.currentTime / v.duration) * 100
}
function buscar(e) {
  const v = videoEl.value
  if (!v || !v.duration) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  v.currentTime = ratio * v.duration
}

// ---------- Acciones ----------
function suscribirReel() {
  unsubReel = onSnapshot(doc(db, 'reels', props.reel.id), (snap) => {
    if (snap.exists()) reelVivo.value = { id: snap.id, ...snap.data() }
  })
}
async function toggleLike() {
  if (!miUid.value) return
  const dio = yaDiLike.value
  try {
    await updateDoc(doc(db, 'reels', props.reel.id), {
      likes: increment(dio ? -1 : 1),
      likedBy: dio ? arrayRemove(miUid.value) : arrayUnion(miUid.value),
    })
  } catch (e) { /* noop */ }
}
async function toggleGuardar() {
  if (!miUid.value) return
  const g = yaGuarde.value
  try {
    await updateDoc(doc(db, 'reels', props.reel.id), {
      guardados: increment(g ? -1 : 1),
      guardadoPor: g ? arrayRemove(miUid.value) : arrayUnion(miUid.value),
    })
  } catch (e) { /* noop */ }
}

// ---------- Comentarios ----------
const comentarios = ref([])
const mostrarComentarios = ref(false)
const nuevoComentario = ref('')
const enviando = ref(false)
let unsubComent = null

function abrirComentarios() {
  mostrarComentarios.value = true
  escucharTeclado()
  if (unsubComent) return
  const q = query(
    collection(db, 'reels', props.reel.id, 'comentarios'),
    orderBy('creadoEn', 'desc'),
  )
  unsubComent = onSnapshot(q, (snap) => {
    comentarios.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  })
}
function cerrarComentarios() {
  mostrarComentarios.value = false
  dejarTeclado()
}

async function enviarComentario() {
  const texto = nuevoComentario.value.trim()
  if (!texto || enviando.value || !socio.socioId) return
  enviando.value = true
  try {
    await addDoc(collection(db, 'reels', props.reel.id, 'comentarios'), {
      autorSocioId: socio.socioId,
      autorUid: miUid.value,
      autorNombre: socio.nombreSocio || 'Miembro',
      texto: texto.slice(0, 500),
      creadoEn: serverTimestamp(),
    })
    await updateDoc(doc(db, 'reels', props.reel.id), { comentariosCount: increment(1) })
    nuevoComentario.value = ''
  } catch (e) { /* noop */ } finally {
    enviando.value = false
  }
}

function inicialDe(n) { return (n || '?').charAt(0).toUpperCase() }
function tiempoRel(ts) {
  if (!ts?.toDate) return ''
  const seg = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (seg < 60) return 'ahora'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  return `hace ${Math.floor(seg / 86400)} d`
}

// ---------- Bloqueo de scroll del fondo ----------
// El scroll de la app vive en .app-scroll (ver App.vue / main.css). Mientras el
// visor está abierto lo congelamos ahí; al cerrar se restaura sin perder la
// posición (overflow:hidden no reinicia el scroll). Si por algo no existiera ese
// contenedor, caemos al body como respaldo.
let contScroll = null
function bloquearScroll() {
  contScroll = document.querySelector('.app-scroll')
  if (contScroll) contScroll.style.overflow = 'hidden'
  else document.body.style.overflow = 'hidden'
}
function liberarScroll() {
  if (contScroll) contScroll.style.overflow = ''
  else document.body.style.overflow = ''
  contScroll = null
}

// ---------- Teclado en la hoja de comentarios (VisualViewport) ----------
// En iOS el teclado NO encoge el viewport ni cambia vh/dvh, así que un bottom
// sheet con position:fixed se rompe: el contenido se empuja fuera y queda un
// hueco blanco. Seguimos el visualViewport y fijamos el alto/offset VISIBLES en
// variables CSS, para que la hoja ocupe solo el área de arriba del teclado.
const vv = (typeof window !== 'undefined' && window.visualViewport) || null
function ajustarPorTeclado() {
  if (!vv) return
  const raiz = document.documentElement
  raiz.style.setProperty('--vz-vv-h', Math.round(vv.height) + 'px')
  raiz.style.setProperty('--vz-vv-top', Math.round(vv.offsetTop) + 'px')
}
function escucharTeclado() {
  if (!vv) return
  ajustarPorTeclado()
  vv.addEventListener('resize', ajustarPorTeclado)
  vv.addEventListener('scroll', ajustarPorTeclado)
}
function dejarTeclado() {
  if (!vv) return
  vv.removeEventListener('resize', ajustarPorTeclado)
  vv.removeEventListener('scroll', ajustarPorTeclado)
  const raiz = document.documentElement
  raiz.style.removeProperty('--vz-vv-h')
  raiz.style.removeProperty('--vz-vv-top')
}

onMounted(() => {
  suscribirReel()
  bloquearScroll()
  const v = videoEl.value
  if (v) {
    // Intenta reproducir con sonido (hubo gesto al abrir); si lo bloquean, mudo.
    v.muted = false
    v.play().catch(() => {
      v.muted = true
      silenciado.value = true
      v.play().catch(() => {})
    })
  }
})
onUnmounted(() => {
  if (unsubReel) unsubReel()
  if (unsubComent) unsubComent()
  liberarScroll()
  dejarTeclado()
})
</script>

<template>
  <div class="vz">
    <!-- Video a pantalla completa -->
    <video
      ref="videoEl"
      class="vz-video"
      :src="reelVivo.videoUrl"
      :poster="reelVivo.portadaUrl"
      loop
      playsinline
      webkit-playsinline
      @click="togglePlay"
      @timeupdate="onTime"
    ></video>

    <!-- Ícono de play cuando está pausado -->
    <button v-if="pausado" class="vz-playbig" aria-label="Reproducir" @click="togglePlay">
      <svg width="74" height="74" viewBox="0 0 24 24" fill="rgba(255,255,255,.92)"><path d="M8 5v14l11-7z" /></svg>
    </button>

    <!-- Degradados para legibilidad -->
    <div class="vz-grad vz-grad--top"></div>
    <div class="vz-grad vz-grad--bot"></div>

    <!-- Cerrar (arriba izquierda) -->
    <button class="vz-cerrar" aria-label="Volver" @click="emit('cerrar')">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>

    <!-- Silenciar (arriba derecha) -->
    <button class="vz-mute" aria-label="Sonido" @click="toggleMute">
      <svg v-if="!silenciado" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
      </svg>
      <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M23 9l-6 6M17 9l6 6" />
      </svg>
    </button>

    <!-- Botones de acción (columna derecha) -->
    <div class="vz-acciones">
      <button class="vz-acc" @click.stop="toggleLike">
        <span class="vz-acc__ic" :class="{ 'vz-acc__ic--like': yaDiLike }">
          <svg width="32" height="32" viewBox="0 0 24 24" :fill="yaDiLike ? 'currentColor' : 'none'"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </span>
        <span class="vz-acc__n">{{ likes }}</span>
      </button>

      <button class="vz-acc" @click.stop="abrirComentarios">
        <span class="vz-acc__ic">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        </span>
        <span class="vz-acc__n">{{ comentariosCount }}</span>
      </button>

      <button class="vz-acc" @click.stop="toggleGuardar">
        <span class="vz-acc__ic" :class="{ 'vz-acc__ic--save': yaGuarde }">
          <svg width="32" height="32" viewBox="0 0 24 24" :fill="yaGuarde ? 'currentColor' : 'none'"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
        </span>
        <span class="vz-acc__n">{{ guardados }}</span>
      </button>
    </div>

    <!-- Info (abajo izquierda) -->
    <div class="vz-info">
      <div class="vz-autor">
        <span class="vz-avatar">{{ inicial }}</span>
        <span class="vz-nombre">{{ reelVivo.autorNombre }}</span>
        <span v-if="reelVivo.esStaff" class="vz-staff">Staff</span>
      </div>
      <span class="vz-gym"><template v-if="!reelVivo.esStaff">{{ reelVivo.gymNombre }} · </template>{{ categoriaReelLabel(reelVivo.categoria) }}</span>
      <p v-if="reelVivo.descripcion" class="vz-desc">{{ reelVivo.descripcion }}</p>
      <div v-if="reelVivo.ig || reelVivo.tiktok" class="vz-redes">
        <a v-if="reelVivo.ig" :href="igLink(reelVivo.ig)" target="_blank" rel="noopener" class="vz-soc" @click.stop>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
          </svg>
          <span>@{{ reelVivo.ig }}</span>
        </a>
        <a v-if="reelVivo.tiktok" :href="tiktokLink(reelVivo.tiktok)" target="_blank" rel="noopener" class="vz-soc" @click.stop>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
          </svg>
          <span>@{{ reelVivo.tiktok }}</span>
        </a>
      </div>
    </div>

    <!-- Barra de progreso (abajo) -->
    <div class="vz-barra" @click.stop="buscar">
      <div class="vz-barra__fill" :style="{ width: progreso + '%' }"></div>
    </div>

    <!-- Panel de comentarios -->
    <transition name="vz-sheet">
      <div v-if="mostrarComentarios" class="vz-coment" @click.self="cerrarComentarios">
        <div class="vz-coment__panel">
          <header class="vz-coment__head">
            <span class="vz-coment__titulo">Comentarios · {{ comentariosCount }}</span>
            <button class="vz-coment__x" aria-label="Cerrar" @click="cerrarComentarios">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div class="vz-coment__lista">
            <div v-if="!comentarios.length" class="vz-coment__vacio">
              <p>Aún no hay comentarios.</p>
              <p class="vz-coment__vacio-d">Sé el primero en escribir algo.</p>
            </div>
            <div v-for="c in comentarios" :key="c.id" class="vz-cmt">
              <span class="vz-cmt__avatar">{{ inicialDe(c.autorNombre) }}</span>
              <div class="vz-cmt__cuerpo">
                <div class="vz-cmt__top">
                  <span class="vz-cmt__nombre">{{ c.autorNombre }}</span>
                  <span class="vz-cmt__tiempo">{{ tiempoRel(c.creadoEn) }}</span>
                </div>
                <p class="vz-cmt__texto">{{ c.texto }}</p>
              </div>
            </div>
          </div>
          <div class="vz-coment__input">
            <input v-model="nuevoComentario" class="vz-coment__campo" type="text" maxlength="500"
                   placeholder="Escribe un comentario…" @keyup.enter="enviarComentario" />
            <button class="vz-coment__enviar" :disabled="!nuevoComentario.trim() || enviando" @click="enviarComentario">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.vz {
  position: fixed; inset: 0; z-index: 1000; background: #000;
  overflow: hidden; touch-action: none;
}
.vz-video {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: contain; background: #000;
}
.vz-playbig {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 5; filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
}

/* Degradados */
.vz-grad { position: absolute; left: 0; right: 0; pointer-events: none; z-index: 2; }
.vz-grad--top { top: 0; height: 130px; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent); }
.vz-grad--bot { bottom: 0; height: 260px; background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent); }

/* Botones superiores */
.vz-cerrar, .vz-mute {
  position: absolute; top: calc(env(safe-area-inset-top, 0px) + 14px); z-index: 6;
  color: #fff; padding: 7px; filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5));
}
.vz-cerrar { left: 12px; }
.vz-mute {
  right: 12px; width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.32);
}

/* Acciones (columna derecha) */
.vz-acciones {
  position: absolute; right: 10px; bottom: 132px; z-index: 4;
  display: flex; flex-direction: column; gap: 20px; align-items: center;
}
.vz-acc { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.vz-acc__ic {
  color: #fff; display: flex; filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
  transition: transform 0.12s ease, color 0.15s ease;
}
.vz-acc:active .vz-acc__ic { transform: scale(0.85); }
.vz-acc__ic--like { color: #f43f5e; }
.vz-acc__ic--save { color: #fbbf24; }
.vz-acc__n {
  color: #fff; font-size: 0.8rem; font-weight: 700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* Info (abajo izquierda) */
.vz-info {
  position: absolute; left: 14px; bottom: 26px; z-index: 4;
  right: 78px; display: flex; flex-direction: column; gap: 7px;
}
.vz-autor { display: flex; align-items: center; gap: 8px; }
.vz-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.9rem; color: #fff; background: var(--grad-firma);
  border: 1.5px solid rgba(255, 255, 255, 0.85);
}
.vz-nombre { font-weight: 800; font-size: 1rem; color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5); }
.vz-staff {
  font-size: 0.6rem; font-weight: 700; color: #0f172a; background: #67e8f9;
  padding: 1px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em;
}
.vz-gym { font-size: 0.82rem; color: rgba(255, 255, 255, 0.85); text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5); }
.vz-desc {
  font-size: 0.9rem; line-height: 1.38; color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.vz-redes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 1px; }
.vz-soc {
  display: flex; align-items: center; gap: 5px; color: #fff;
  background: rgba(255, 255, 255, 0.18); padding: 5px 10px; border-radius: var(--r-pill);
  font-size: 0.78rem; font-weight: 600; backdrop-filter: blur(4px);
}
.vz-soc:active { background: rgba(255, 255, 255, 0.3); }

/* Barra de progreso */
.vz-barra {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
  height: 16px; display: flex; align-items: flex-end; padding-bottom: 4px; cursor: pointer;
}
.vz-barra::before {
  content: ''; position: absolute; bottom: 4px; left: 0; right: 0; height: 3px;
  background: rgba(255, 255, 255, 0.25);
}
.vz-barra__fill {
  position: relative; height: 3px; background: #fff; border-radius: 999px; z-index: 1;
}

/* Panel comentarios */
.vz-coment {
  position: fixed; left: 0; right: 0;
  /* Por defecto cubre toda la pantalla; al abrir el teclado, el JS fija el alto y
     el offset al área VISIBLE (visualViewport), así la hoja queda arriba del
     teclado y no se sale dejando un hueco blanco. */
  top: var(--vz-vv-top, 0px);
  height: var(--vz-vv-h, 100%);
  z-index: 1100; background: rgba(2, 6, 23, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
}
.vz-coment__panel {
  width: 100%; max-width: 460px; height: 70vh; max-height: 100%;
  display: flex; flex-direction: column;
  background: var(--surface); border-radius: 22px 22px 0 0; overflow: hidden;
}
.vz-coment__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border-soft); flex-shrink: 0;
}
.vz-coment__titulo { font-weight: 800; font-size: 1rem; color: var(--text); }
.vz-coment__x { color: var(--text-dim); padding: 4px; display: flex; }
.vz-coment__lista { flex: 1; overflow-y: auto; padding: 8px 16px; display: flex; flex-direction: column; }
.vz-coment__vacio { text-align: center; color: var(--text-dim); padding: 40px 20px; }
.vz-coment__vacio-d { font-size: 0.86rem; color: var(--text-faint); margin-top: 4px; }
.vz-cmt { display: flex; gap: 10px; padding: 9px 0; }
.vz-cmt__avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.85rem; color: #fff; background: var(--accent);
}
.vz-cmt__cuerpo { flex: 1; min-width: 0; }
.vz-cmt__top { display: flex; align-items: baseline; gap: 8px; }
.vz-cmt__nombre { font-weight: 700; font-size: 0.88rem; color: var(--text); }
.vz-cmt__tiempo { font-size: 0.74rem; color: var(--text-faint); }
.vz-cmt__texto { font-size: 0.9rem; line-height: 1.4; color: var(--text); margin-top: 2px; overflow-wrap: anywhere; }
.vz-coment__input {
  display: flex; align-items: center; gap: 9px;
  padding: 12px 16px; border-top: 1px solid var(--border-soft); flex-shrink: 0;
}
.vz-coment__campo {
  flex: 1; min-width: 0; padding: 11px 14px; border-radius: var(--r-pill);
  background: var(--surface-2); border: 1px solid var(--border-soft);
  color: var(--text); font-size: 0.92rem; font-family: inherit;
}
.vz-coment__campo:focus { outline: none; border-color: var(--accent); }
.vz-coment__enviar {
  flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; background: var(--grad-firma); box-shadow: 0 4px 12px var(--accent-glow);
}
.vz-coment__enviar:disabled { opacity: 0.4; box-shadow: none; }
.vz-sheet-enter-active, .vz-sheet-leave-active { transition: opacity 0.25s ease; }
.vz-sheet-enter-active .vz-coment__panel, .vz-sheet-leave-active .vz-coment__panel { transition: transform 0.28s ease; }
.vz-sheet-enter-from, .vz-sheet-leave-to { opacity: 0; }
.vz-sheet-enter-from .vz-coment__panel, .vz-sheet-leave-to .vz-coment__panel { transform: translateY(100%); }
</style>
