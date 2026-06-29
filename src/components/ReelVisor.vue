<script setup>
// Visor de un Reel a pantalla completa (estilo Xiaohongshu): video arriba, panel
// de info con autor/gym/descripción/redes, y barra de acciones (me gusta,
// comentar, guardar). Los comentarios se abren en un panel inferior.
//
// Me gusta y Guardar se hacen directo en Firestore (las reglas dejan tocar solo
// los contadores/listas). Comentar crea en la sub-colección + sube el contador.
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

onMounted(suscribirReel)
onUnmounted(() => {
  if (unsubReel) unsubReel()
  if (unsubComent) unsubComent()
})
</script>

<template>
  <div class="vz" @click.self="emit('cerrar')">
    <button class="vz-x" aria-label="Cerrar" @click="emit('cerrar')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>

    <div class="vz-card">
      <video :src="reelVivo.videoUrl" class="vz-video" controls autoplay playsinline
             :poster="reelVivo.portadaUrl"></video>

      <div class="vz-info">
        <div class="vz-autor">
          <span class="vz-avatar">{{ inicial }}</span>
          <div class="vz-autor__txt">
            <div class="vz-autor__top">
              <span class="vz-nombre">{{ reelVivo.autorNombre }}</span>
              <span v-if="reelVivo.esStaff" class="vz-staff">Staff</span>
            </div>
            <span class="vz-gym">{{ reelVivo.gymNombre }}</span>
          </div>
        </div>

        <span class="vz-cat">{{ categoriaReelLabel(reelVivo.categoria) }}</span>
        <p v-if="reelVivo.descripcion" class="vz-desc">{{ reelVivo.descripcion }}</p>

        <div v-if="reelVivo.ig || reelVivo.tiktok" class="vz-redes">
          <a v-if="reelVivo.ig" :href="igLink(reelVivo.ig)" target="_blank" rel="noopener" class="vz-soc">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            <span>@{{ reelVivo.ig }}</span>
          </a>
          <a v-if="reelVivo.tiktok" :href="tiktokLink(reelVivo.tiktok)" target="_blank" rel="noopener" class="vz-soc">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
            </svg>
            <span>@{{ reelVivo.tiktok }}</span>
          </a>
        </div>
      </div>

      <!-- Barra de acciones -->
      <div class="vz-acciones">
        <button class="vz-acc" :class="{ 'vz-acc--like': yaDiLike }" @click="toggleLike">
          <svg width="26" height="26" viewBox="0 0 24 24" :fill="yaDiLike ? 'currentColor' : 'none'"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <span>{{ likes }}</span>
        </button>

        <button class="vz-acc" @click="abrirComentarios">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
          <span>{{ comentariosCount }}</span>
        </button>

        <button class="vz-acc" :class="{ 'vz-acc--save': yaGuarde }" @click="toggleGuardar">
          <svg width="26" height="26" viewBox="0 0 24 24" :fill="yaGuarde ? 'currentColor' : 'none'"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <span>{{ guardados }}</span>
        </button>
      </div>
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
            <input
              v-model="nuevoComentario"
              class="vz-coment__campo"
              type="text"
              maxlength="500"
              placeholder="Escribe un comentario…"
              @keyup.enter="enviarComentario"
            />
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
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(2, 6, 23, 0.93);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 16px;
}
.vz-x { position: absolute; top: 14px; right: 14px; color: #fff; padding: 6px; z-index: 3; }

.vz-card { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 12px; }
.vz-video {
  width: 100%; max-height: 56vh; border-radius: var(--r-md);
  background: #000; aspect-ratio: 9 / 16; object-fit: contain;
}

/* Info */
.vz-info { display: flex; flex-direction: column; gap: 8px; }
.vz-autor { display: flex; align-items: center; gap: 10px; }
.vz-avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem; color: #fff;
  background: var(--grad-firma);
}
.vz-autor__txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.vz-autor__top { display: flex; align-items: center; gap: 7px; }
.vz-nombre { font-weight: 800; font-size: 1rem; color: #fff; }
.vz-staff {
  font-size: 0.62rem; font-weight: 700; color: #0f172a; background: #67e8f9;
  padding: 1px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em;
}
.vz-gym { font-size: 0.85rem; color: rgba(255, 255, 255, 0.66); }
.vz-cat { font-size: 0.78rem; color: rgba(255, 255, 255, 0.55); }
.vz-desc { font-size: 0.92rem; line-height: 1.4; color: rgba(255, 255, 255, 0.92); }
.vz-redes { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 2px; }
.vz-soc {
  display: flex; align-items: center; gap: 6px; color: #fff;
  background: rgba(255, 255, 255, 0.12); padding: 6px 11px; border-radius: var(--r-pill);
  font-size: 0.82rem; font-weight: 600;
}
.vz-soc:active { background: rgba(255, 255, 255, 0.22); }

/* Acciones */
.vz-acciones {
  display: flex; align-items: center; justify-content: space-around;
  gap: 8px; padding: 10px 4px 4px; margin-top: 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.vz-acc {
  display: flex; align-items: center; gap: 8px;
  color: rgba(255, 255, 255, 0.86); font-size: 0.96rem; font-weight: 700;
  padding: 6px 14px; border-radius: var(--r-pill); transition: color 0.15s, transform 0.12s;
}
.vz-acc:active { transform: scale(0.92); }
.vz-acc--like { color: #f43f5e; }
.vz-acc--save { color: #fbbf24; }

/* Panel comentarios */
.vz-coment {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(2, 6, 23, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
}
.vz-coment__panel {
  width: 100%; max-width: 460px; height: 72vh;
  display: flex; flex-direction: column;
  background: var(--surface); border-radius: 22px 22px 0 0; overflow: hidden;
}
.vz-coment__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border-soft); flex-shrink: 0;
}
.vz-coment__titulo { font-weight: 800; font-size: 1rem; color: var(--text); }
.vz-coment__x { color: var(--text-dim); padding: 4px; display: flex; }

.vz-coment__lista { flex: 1; overflow-y: auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 4px; }
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
  transition: opacity 0.15s, transform 0.12s;
}
.vz-coment__enviar:disabled { opacity: 0.4; box-shadow: none; }
.vz-coment__enviar:not(:disabled):active { transform: scale(0.92); }

.vz-sheet-enter-active, .vz-sheet-leave-active { transition: opacity 0.25s ease; }
.vz-sheet-enter-active .vz-coment__panel, .vz-sheet-leave-active .vz-coment__panel { transition: transform 0.28s ease; }
.vz-sheet-enter-from, .vz-sheet-leave-to { opacity: 0; }
.vz-sheet-enter-from .vz-coment__panel, .vz-sheet-leave-to .vz-coment__panel { transform: translateY(100%); }
</style>
