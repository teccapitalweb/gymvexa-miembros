<script setup>
// REELS — comunidad GLOBAL de video corto de Gymvexa (estilo Xiaohongshu).
// Feed en cuadrícula de 2 columnas: portadas livianas; el video pesado solo se
// reproduce al abrir uno (cuida el Storage). Todos los gyms se ven entre sí.
//
// Cabecera con jerarquía + botón "Subir" arriba. El recordatorio de redes NO es
// un bloque fijo: es un aviso flotante que aparece si faltan IG/TikTok y se va solo.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useSocioStore } from '../stores/socio'
import { CATEGORIAS_REELS, categoriaReelLabel } from '../data/categoriasReels'
import { eliminarReel } from '../services/backend'
import ReelSubir from '../components/ReelSubir.vue'
import ReelVisor from '../components/ReelVisor.vue'
import MembresiaVencida from '../components/MembresiaVencida.vue'

const router = useRouter()
const route = useRoute()
const socio = useSocioStore()

// Bloqueo por membresía vencida: solo suscribimos/mostramos los reels cuando la
// ficha del socio ya se resolvió Y la membresía está vigente. Si está vencida (o
// mientras carga) NO suscribimos (evita leer datos) y mostramos el aviso.
const puedeVerContenido = computed(
  () => socio.resuelto && !socio.membresiaVencida,
)

const vista = ref('todos') // 'todos' | 'club'
const categoriaActiva = ref('todas')

const reels = ref([])
const cargando = ref(true)
let unsub = null

const mostrarSubir = ref(false)
const reelActivo = ref(null) // para el visor

// Recordatorio flotante de redes (no es bloque fijo): aparece si faltan y se va solo.
const mostrarRecordatorio = ref(false)
let recordatorioRevisado = false
let recordatorioTimer = null

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

function quitarRecordatorio() {
  mostrarRecordatorio.value = false
  if (recordatorioTimer) {
    clearTimeout(recordatorioTimer)
    recordatorioTimer = null
  }
}

// Espera a que la ficha del socio cargue para decidir si mostrar el recordatorio
// (si lo evaluáramos antes, "datos" sería null y saldría aunque tenga redes).
watch(
  () => socio.datos,
  (d) => {
    if (!d || recordatorioRevisado) return
    recordatorioRevisado = true
    if (!d.ig && !d.tiktok) {
      mostrarRecordatorio.value = true
      recordatorioTimer = setTimeout(quitarRecordatorio, 6500)
    }
  },
  { immediate: true },
)

function irAPerfil() {
  quitarRecordatorio()
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

// ¿Este reel es mío? (para mostrar la basurita en su tarjeta).
function esMioReel(r) {
  return !!socio.socioId && r?.autorSocioId === socio.socioId
}

// ---------- Borrar reel propio (desde el feed) ----------
const reelABorrar = ref(null)
const borrando = ref(false)
const errorBorrado = ref('')

function pedirBorrar(r) {
  errorBorrado.value = ''
  reelABorrar.value = r
}
function cancelarBorrar() {
  if (borrando.value) return
  reelABorrar.value = null
}
async function confirmarBorrar() {
  if (borrando.value || !reelABorrar.value) return
  borrando.value = true
  errorBorrado.value = ''
  try {
    await eliminarReel(reelABorrar.value.id)
    reelABorrar.value = null
    // El feed se actualiza solo (onSnapshot quita la tarjeta).
  } catch (e) {
    errorBorrado.value = e?.message || 'No se pudo eliminar. Inténtalo de nuevo.'
  } finally {
    borrando.value = false
  }
}

// ---------- Abrir un reel directo desde una notificación (?reel=ID) ----------
let reelDeepLinkHecho = false
async function abrirDesdeRuta() {
  const id = route.query.reel
  if (!id || reelDeepLinkHecho) return
  let r = reels.value.find((x) => x.id === id)
  if (!r) {
    try {
      const snap = await getDoc(doc(db, 'reels', String(id)))
      if (snap.exists()) r = { id: snap.id, ...snap.data() }
    } catch { /* noop */ }
  }
  if (r) {
    reelDeepLinkHecho = true
    abrirVisor(r)
  }
}
watch(reels, abrirDesdeRuta)
function onPublicado() {
  mostrarSubir.value = false
  vista.value = 'todos'
  categoriaActiva.value = 'todas'
}

onMounted(() => {
  if (!socio.estaVinculado && !socio.resuelto) socio.vincularSocio()
  // Solo suscribimos si la membresía está vigente (bloqueo total a vencidos).
  if (puedeVerContenido.value) suscribir()
  abrirDesdeRuta()
})
// Suscribe/da de baja según la vigencia. Cubre el caso en que la ficha del socio
// (y su membresía) cargan DESPUÉS de montar la vista.
watch(puedeVerContenido, (ok) => {
  if (ok) {
    suscribir()
    abrirDesdeRuta()
  } else if (unsub) {
    unsub()
    unsub = null
  }
})
onUnmounted(() => {
  if (unsub) unsub()
  if (recordatorioTimer) clearTimeout(recordatorioTimer)
})
</script>

<template>
  <!-- Bloqueo total por membresía vencida: si no está vigente, solo el aviso. -->
  <MembresiaVencida v-if="socio.membresiaVencida" />

  <main v-else class="screen screen--with-nav rl-screen">
    <!-- Cabecera: título con jerarquía + botón Subir -->
    <header class="rl-head">
      <div class="rl-head__txt">
        <h1 class="rl-title">Reels</h1>
        <p class="rl-sub">La comunidad fitness de Gymvexa</p>
      </div>
      <button class="rl-subir" @click="mostrarSubir = true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Subir
      </button>
    </header>

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
    <div v-if="cargando" class="rl-load"><span class="rl-spin" aria-hidden="true"></span></div>

    <!-- Feed -->
    <div v-else-if="reelsFiltrados.length" class="rl-grid">
      <article v-for="r in reelsFiltrados" :key="r.id" class="rl-card" @click="abrirVisor(r)">
        <div class="rl-card__cover">
          <img :src="r.portadaUrl" :alt="r.descripcion || 'Reel'" loading="lazy" class="rl-card__img" />
          <span class="rl-card__play" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.35)" />
              <path d="M10 8.5v7l5-3.5z" fill="#fff" />
            </svg>
          </span>
          <!-- Vistas (reproducciones) -->
          <span class="rl-card__vistas">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
            </svg>
            {{ r.vistas || 0 }}
          </span>
          <!-- Borrar (solo si el reel es mío) -->
          <button
            v-if="esMioReel(r)"
            class="rl-card__del"
            type="button"
            aria-label="Eliminar reel"
            @click.stop="pedirBorrar(r)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
        <div class="rl-card__info">
          <p v-if="r.descripcion" class="rl-card__desc">{{ r.descripcion }}</p>
          <div class="rl-card__autor">
            <span class="rl-card__nombre">{{ r.autorNombre }}</span>
            <span v-if="r.esStaff" class="rl-card__badge">Staff</span>
          </div>
          <div class="rl-card__pie">
            <span class="rl-card__gym">{{ r.esStaff ? categoriaReelLabel(r.categoria) : r.gymNombre }}</span>
            <span class="rl-card__redes">
              <a v-if="r.ig" :href="igLink(r.ig)" target="_blank" rel="noopener" class="rl-soc" aria-label="Instagram" @click.stop>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a v-if="r.tiktok" :href="tiktokLink(r.tiktok)" target="_blank" rel="noopener" class="rl-soc" aria-label="TikTok" @click.stop>
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
      <p class="rl-empty__d">Sé el primero: toca “Subir” y comparte tu Reel.</p>
    </div>

    <!-- Recordatorio flotante de redes (no ocupa el layout) -->
    <transition name="rl-toast">
      <button v-if="mostrarRecordatorio" class="rl-toast" @click="irAPerfil">
        <span class="rl-toast__ic" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
          </svg>
        </span>
        <span class="rl-toast__txt">
          Agrega tu Instagram y TikTok en tu perfil para que aparezcan en tus videos.
        </span>
        <span class="rl-toast__x" role="button" aria-label="Cerrar" @click.stop="quitarRecordatorio">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </span>
      </button>
    </transition>

    <!-- Modal de subida -->
    <ReelSubir v-if="mostrarSubir" @cerrar="mostrarSubir = false" @publicado="onPublicado" />

    <!-- Visor del Reel (componente con me gusta, comentarios y guardados) -->
    <ReelVisor v-if="reelActivo" :reel="reelActivo" @cerrar="cerrarVisor" />

    <!-- Confirmar borrado de un reel propio (desde el feed) -->
    <transition name="rl-fade">
      <div v-if="reelABorrar" class="rl-confirm" @click.self="cancelarBorrar">
        <div class="rl-confirm__card">
          <p class="rl-confirm__titulo">¿Eliminar este reel?</p>
          <p class="rl-confirm__texto">
            Se borrará el video y sus comentarios. No se puede deshacer.
          </p>
          <p v-if="errorBorrado" class="rl-confirm__error">{{ errorBorrado }}</p>
          <div class="rl-confirm__btns">
            <button
              class="rl-confirm__btn rl-confirm__btn--cancel"
              :disabled="borrando"
              @click="cancelarBorrar"
            >
              Cancelar
            </button>
            <button
              class="rl-confirm__btn rl-confirm__btn--del"
              :disabled="borrando"
              @click="confirmarBorrar"
            >
              {{ borrando ? 'Eliminando…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
/* El gap base de .screen lo manejamos nosotros para dar jerarquía a la cabecera. */
.rl-screen { gap: 0; }

/* Cabecera */
.rl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.rl-head__txt { min-width: 0; }
.rl-title { font-size: 1.7rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1.05; }
.rl-sub { font-size: 0.86rem; color: var(--text-dim); margin-top: 3px; }
.rl-subir {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 9px 15px 9px 12px;
  border-radius: var(--r-pill);
  color: #fff;
  font-weight: 700;
  font-size: 0.86rem;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
  transition: transform 0.12s ease;
}
.rl-subir:active { transform: scale(0.96); }

/* Segmented */
.rl-seg { display: flex; gap: 6px; padding: 5px; border-radius: var(--r-pill); background: var(--surface-2); margin-bottom: 14px; }
.rl-seg__btn { flex: 1; min-width: 0; padding: 10px; border-radius: var(--r-pill); font-weight: 700; font-size: 0.9rem; color: var(--text-dim); transition: color 0.18s, background 0.18s, box-shadow 0.18s; }
.rl-seg__btn--on { color: #fff; background: var(--grad-firma); box-shadow: 0 4px 12px var(--accent-glow); }

/* Chips */
.rl-chips { display: flex; gap: 8px; min-width: 0; overflow-x: auto; padding-bottom: 2px; margin-bottom: 20px; scrollbar-width: none; }
.rl-chips::-webkit-scrollbar { display: none; }
.rl-chip { flex-shrink: 0; padding: 8px 15px; border-radius: var(--r-pill); font-size: 0.83rem; font-weight: 600; white-space: nowrap; color: var(--text-dim); background: var(--surface-2); border: 1px solid transparent; transition: color 0.16s, background 0.16s, border-color 0.16s; }
.rl-chip--on { color: var(--accent); background: var(--accent-soft); border-color: var(--accent); }

/* Cargando */
.rl-load { display: flex; justify-content: center; padding: 48px 0; }
.rl-spin { width: 30px; height: 30px; border-radius: 50%; border: 3px solid var(--accent-soft); border-top-color: var(--accent); animation: rlSpin 0.8s linear infinite; }
@keyframes rlSpin { to { transform: rotate(360deg); } }

/* Cuadrícula 2 columnas */
.rl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.rl-card { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--r-md); overflow: hidden; cursor: pointer; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04); transition: transform 0.14s ease; }
.rl-card:active { transform: scale(0.985); }
.rl-card__cover { position: relative; width: 100%; aspect-ratio: 9 / 16; background: var(--surface-2); }
.rl-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rl-card__play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.rl-card__vistas {
  position: absolute; left: 7px; bottom: 7px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 7px; border-radius: 999px;
  background: rgba(0, 0, 0, 0.5); color: #fff;
  font-size: 0.72rem; font-weight: 700; line-height: 1;
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
}
.rl-card__del {
  position: absolute; top: 7px; right: 7px;
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); color: #fff;
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
  transition: background 0.15s ease, transform 0.12s ease;
}
.rl-card__del:active { transform: scale(0.9); background: rgba(239, 68, 68, 0.85); }

/* Confirmación de borrado */
.rl-confirm {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
}
.rl-confirm__card {
  width: 100%; max-width: 320px;
  background: var(--surface); color: var(--text);
  border: 1px solid var(--border-soft); border-radius: var(--r-md);
  padding: 20px; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}
.rl-confirm__titulo { margin: 0 0 6px; font-size: 1.05rem; font-weight: 800; color: var(--text); }
.rl-confirm__texto { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--text-dim); }
.rl-confirm__error { margin: 10px 0 0; font-size: 0.84rem; color: var(--danger, #ef4444); }
.rl-confirm__btns { display: flex; gap: 10px; margin-top: 18px; }
.rl-confirm__btn {
  flex: 1 1 0; padding: 11px; border-radius: var(--r-md);
  font-weight: 700; font-size: 0.92rem;
  transition: opacity 0.15s ease, transform 0.12s ease;
}
.rl-confirm__btn:disabled { opacity: 0.6; }
.rl-confirm__btn:not(:disabled):active { transform: scale(0.98); }
.rl-confirm__btn--cancel { background: transparent; border: 1px solid var(--border-soft); color: var(--text); }
.rl-confirm__btn--del { background: var(--danger, #ef4444); color: #fff; }
.rl-fade-enter-active, .rl-fade-leave-active { transition: opacity 0.18s ease; }
.rl-fade-enter-from, .rl-fade-leave-to { opacity: 0; }
.rl-card__info { padding: 9px 10px 11px; display: flex; flex-direction: column; gap: 6px; }
.rl-card__desc { font-size: 0.83rem; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rl-card__autor { display: flex; align-items: center; gap: 5px; min-width: 0; }
.rl-card__nombre { font-size: 0.8rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-card__badge { flex-shrink: 0; font-size: 0.6rem; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 1px 6px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; }
.rl-card__pie { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.rl-card__gym { font-size: 0.72rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-card__redes { display: flex; gap: 6px; flex-shrink: 0; }
.rl-soc { color: var(--text-dim); display: flex; transition: color 0.15s; }
.rl-soc:active { color: var(--accent); }

/* Vacío */
.rl-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 24px; color: var(--text-dim); }
.rl-empty__ic { display: flex; color: var(--text-faint); margin-bottom: 4px; }
.rl-empty__t { font-weight: 700; font-size: 1.02rem; color: var(--text); }
.rl-empty__d { font-size: 0.88rem; line-height: 1.45; max-width: 320px; }

/* Recordatorio flotante (toast) */
.rl-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--nav-h, 68px) + 14px);
  z-index: 80;
  width: calc(100% - 28px);
  max-width: 432px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 12px 12px 12px 13px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
  cursor: pointer;
}
.rl-toast__ic { color: var(--accent); display: flex; flex-shrink: 0; }
.rl-toast__txt { flex: 1; min-width: 0; font-size: 0.83rem; color: var(--text); line-height: 1.35; }
.rl-toast__x { color: var(--text-faint); display: flex; flex-shrink: 0; padding: 2px; }
.rl-toast-enter-active, .rl-toast-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.rl-toast-enter-from, .rl-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(14px); }

/* FAB */
/* (sin botón flotante: el botón "Subir" vive en la cabecera) */

/* Visor */
/* (el visor ahora vive en el componente ReelVisor.vue) */
</style>
