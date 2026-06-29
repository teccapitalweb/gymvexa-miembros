<script setup>
// Pantalla "Videos guardados": muestra en cuadrícula los reels que el socio
// guardó con la estrella (reels cuyo guardadoPor contiene su uid). Se carga solo
// al entrar (lectura única, más barata) y se refresca al cerrar el visor por si
// quitó algún guardado. Tocar una tarjeta abre el visor a pantalla completa.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase'
import ReelVisor from '../components/ReelVisor.vue'
import { categoriaReelLabel } from '../data/categoriasReels'

const router = useRouter()
const cargando = ref(true)
const reels = ref([])
const reelActivo = ref(null)
const miUid = computed(() => auth.currentUser?.uid || null)

function igLink(u) { return 'https://instagram.com/' + u }
function tiktokLink(u) { return 'https://www.tiktok.com/@' + u }

async function cargar() {
  cargando.value = true
  try {
    if (!miUid.value) { reels.value = []; return }
    const q = query(
      collection(db, 'reels'),
      where('guardadoPor', 'array-contains', miUid.value),
    )
    const snap = await getDocs(q)
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    // Los más recientes primero (orden en cliente, así no necesita índice compuesto).
    lista.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0))
    reels.value = lista
  } catch (e) {
    reels.value = []
  } finally {
    cargando.value = false
  }
}

function abrir(r) { reelActivo.value = r }
function cerrar() {
  reelActivo.value = null
  cargar() // refresca por si quitó algún guardado dentro del visor
}

onMounted(cargar)
</script>

<template>
  <main class="screen screen--with-nav gd">
    <header class="gd-head">
      <button class="gd-back" aria-label="Volver" @click="router.push('/perfil')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div class="gd-head__txt">
        <h1 class="gd-title">Videos guardados</h1>
        <p class="gd-sub">Los reels que marcaste con la estrella</p>
      </div>
    </header>

    <div v-if="cargando" class="gd-estado">
      <span class="gd-spinner" aria-hidden="true"></span>
      <p>Cargando tus guardados…</p>
    </div>

    <div v-else-if="!reels.length" class="gd-vacio">
      <span class="gd-vacio__ic">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      </span>
      <p class="gd-vacio__t">Aún no has guardado videos</p>
      <p class="gd-vacio__d">Toca la estrella en un Reel para guardarlo y verlo aquí.</p>
      <button class="gd-vacio__btn" @click="router.push('/reels')">Ir a Reels</button>
    </div>

    <div v-else class="gd-grid">
      <article v-for="r in reels" :key="r.id" class="gd-card" @click="abrir(r)">
        <div class="gd-cover">
          <img :src="r.portadaUrl" :alt="r.descripcion || 'Reel'" loading="lazy" class="gd-img" />
          <span class="gd-play" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.35)" />
              <path d="M10 8.5v7l5-3.5z" fill="#fff" />
            </svg>
          </span>
        </div>
        <div class="gd-info">
          <p v-if="r.descripcion" class="gd-desc">{{ r.descripcion }}</p>
          <div class="gd-autor">
            <span class="gd-nombre">{{ r.autorNombre }}</span>
            <span v-if="r.esStaff" class="gd-badge">Staff</span>
          </div>
          <div class="gd-pie">
            <span class="gd-gym">{{ r.esStaff ? categoriaReelLabel(r.categoria) : r.gymNombre }}</span>
            <span class="gd-redes">
              <a v-if="r.ig" :href="igLink(r.ig)" target="_blank" rel="noopener" class="gd-soc" aria-label="Instagram" @click.stop>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a v-if="r.tiktok" :href="tiktokLink(r.tiktok)" target="_blank" rel="noopener" class="gd-soc" aria-label="TikTok" @click.stop>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 3c.3 2.1 1.7 3.7 3.8 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.4-2.7 5.8-5.9 5.4-2.6-.3-4.5-2.5-4.4-5.1.1-2.7 2.5-4.8 5.2-4.6.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.2-.1-2.3.8-2.4 2-.1 1.2.8 2.2 2 2.3 1.3.1 2.4-.9 2.4-2.2V3h2.6z" />
                </svg>
              </a>
            </span>
          </div>
        </div>
      </article>
    </div>

    <ReelVisor v-if="reelActivo" :reel="reelActivo" @cerrar="cerrar" />
  </main>
</template>

<style scoped>
.gd { gap: 0; }
.gd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.gd-back {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text); background: var(--surface-2); border: 1px solid var(--border-soft);
}
.gd-back:active { transform: scale(0.94); }
.gd-title { font-size: 1.5rem; font-weight: 800; color: var(--text); line-height: 1.1; }
.gd-sub { font-size: 0.86rem; color: var(--text-dim); margin-top: 2px; }

/* Estados */
.gd-estado, .gd-vacio {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 56px 24px; color: var(--text-dim);
}
.gd-spinner {
  width: 30px; height: 30px; border-radius: 50%; margin-bottom: 14px;
  border: 3px solid var(--border-soft); border-top-color: var(--accent);
  animation: gd-spin 0.8s linear infinite;
}
@keyframes gd-spin { to { transform: rotate(360deg); } }
.gd-vacio__ic { color: var(--accent); margin-bottom: 14px; opacity: 0.85; }
.gd-vacio__t { font-size: 1.05rem; font-weight: 700; color: var(--text); }
.gd-vacio__d { font-size: 0.9rem; color: var(--text-dim); margin-top: 6px; max-width: 280px; }
.gd-vacio__btn {
  margin-top: 20px; padding: 11px 22px; border-radius: var(--r-pill);
  font-weight: 700; font-size: 0.92rem; color: #fff;
  background: var(--grad-firma); box-shadow: 0 4px 14px var(--accent-glow);
}
.gd-vacio__btn:active { transform: scale(0.96); }

/* Cuadrícula (mismo estilo del feed) */
.gd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.gd-card {
  display: flex; flex-direction: column; background: var(--surface);
  border: 1px solid var(--border-soft); border-radius: var(--r-md); overflow: hidden;
  cursor: pointer; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04); transition: transform 0.14s ease;
}
.gd-card:active { transform: scale(0.985); }
.gd-cover { position: relative; width: 100%; aspect-ratio: 9 / 16; background: var(--surface-2); }
.gd-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gd-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.gd-info { padding: 9px 10px 11px; display: flex; flex-direction: column; gap: 6px; }
.gd-desc {
  font-size: 0.83rem; color: var(--text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.gd-autor { display: flex; align-items: center; gap: 5px; min-width: 0; }
.gd-nombre { font-size: 0.8rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gd-badge {
  font-size: 0.58rem; font-weight: 700; color: #0f172a; background: #67e8f9;
  padding: 1px 6px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; flex-shrink: 0;
}
.gd-pie { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.gd-gym { font-size: 0.72rem; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gd-redes { display: flex; gap: 7px; flex-shrink: 0; }
.gd-soc { color: var(--text-dim); display: flex; }
.gd-soc:active { color: var(--accent); }
</style>
