<script setup>
// REELS — comunidad GLOBAL de video corto de Gymvexa (estilo Xiaohongshu).
// Feed en cuadrícula de 2 columnas: portadas livianas; el video pesado solo se
// reproduce al abrir uno (cuida el Storage). Todos los gyms se ven entre sí.
//
// TANDA 1A (esta): la base navegable — los 2 filtros (Todos / Mi club), las
// categorías deslizables, el aviso para completar redes y el estado vacío.
// La SUBIDA de videos, el feed real, el visor y eliminar llegan en la 1B.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocioStore } from '../stores/socio'
import { CATEGORIAS_REELS } from '../data/categoriasReels'

const router = useRouter()
const socio = useSocioStore()

// Filtro principal: todos los gyms o solo el mío.
const vista = ref('todos') // 'todos' | 'club'
// Filtro de categoría ('todas' = sin filtro).
const categoriaActiva = ref('todas')

// ¿El socio ya puso alguna red? Si no, le sugerimos completarla (sin obligar).
const faltanRedes = computed(() => {
  const d = socio.datos || {}
  return !d.ig && !d.tiktok
})

function irAPerfil() {
  router.push('/perfil')
}

onMounted(() => {
  if (!socio.estaVinculado && !socio.resuelto) socio.vincularSocio()
})
</script>

<template>
  <section class="reels">
    <header class="reels__top">
      <h1 class="reels__title">Reels</h1>
      <p class="reels__sub">La comunidad fitness de Gymvexa</p>
    </header>

    <!-- Aviso para completar redes (solo si no tiene ninguna) -->
    <button v-if="faltanRedes" class="reels__aviso" @click="irAPerfil">
      <span class="reels__aviso-ic" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <span class="reels__aviso-txt">
        Agrega tu Instagram y TikTok en tu perfil para que aparezcan en tus videos.
      </span>
      <span class="reels__aviso-go" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>

    <!-- Filtro principal: Todos / Mi club -->
    <div class="reels__seg" role="tablist">
      <button
        class="reels__seg-btn"
        :class="{ 'reels__seg-btn--on': vista === 'todos' }"
        role="tab"
        :aria-selected="vista === 'todos'"
        @click="vista = 'todos'"
      >
        Todos los videos
      </button>
      <button
        class="reels__seg-btn"
        :class="{ 'reels__seg-btn--on': vista === 'club' }"
        role="tab"
        :aria-selected="vista === 'club'"
        @click="vista = 'club'"
      >
        Solo mi club
      </button>
    </div>

    <!-- Categorías deslizables -->
    <div class="reels__chips">
      <button
        class="chip"
        :class="{ 'chip--on': categoriaActiva === 'todas' }"
        @click="categoriaActiva = 'todas'"
      >
        Para ti
      </button>
      <button
        v-for="c in CATEGORIAS_REELS"
        :key="c.value"
        class="chip"
        :class="{ 'chip--on': categoriaActiva === c.value }"
        @click="categoriaActiva = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- Feed (cuadrícula 2 columnas). En 1A va el estado vacío; el feed real es 1B. -->
    <div class="reels__empty">
      <span class="reels__empty-ic" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.5v5l4.2-2.5z" />
        </svg>
      </span>
      <p class="reels__empty-t">Aún no hay videos aquí</p>
      <p class="reels__empty-d">Muy pronto vas a poder subir el tuyo y verlo junto al de toda la comunidad Gymvexa.</p>
    </div>
  </section>
</template>

<style scoped>
.reels {
  padding: 16px 14px calc(var(--nav-h, 64px) + 24px);
  max-width: 720px;
  margin: 0 auto;
  overflow-x: clip;
}
.reels__top { margin-bottom: 12px; }
.reels__title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.reels__sub {
  color: var(--text-dim);
  font-size: 0.88rem;
  margin-top: 2px;
}

/* Aviso de completar redes */
.reels__aviso {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 11px 12px;
  margin-bottom: 14px;
  border-radius: var(--r-md, 14px);
  background: var(--accent-soft);
  border: 1px solid var(--border-soft);
  cursor: pointer;
}
.reels__aviso-ic { color: var(--accent); display: flex; flex-shrink: 0; }
.reels__aviso-txt {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.35;
}
.reels__aviso-go { color: var(--text-dim); display: flex; flex-shrink: 0; }

/* Segmented: Todos / Mi club */
.reels__seg {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: var(--r-pill, 999px);
  background: var(--surface-2, rgba(148, 163, 184, 0.12));
  margin-bottom: 14px;
}
.reels__seg-btn {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: var(--r-pill, 999px);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-dim);
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.reels__seg-btn--on {
  color: #fff;
  background: var(--grad-firma, linear-gradient(135deg, var(--accent-bright), var(--accent-deep)));
  box-shadow: 0 6px 16px var(--accent-glow);
}

/* Chips de categorías */
.reels__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 18px;
  scrollbar-width: none;
}
.reels__chips::-webkit-scrollbar { display: none; }
.chip {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--r-pill, 999px);
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-dim);
  background: var(--surface-2, rgba(148, 163, 184, 0.12));
  border: 1px solid transparent;
  transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}
.chip--on {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* Estado vacío */
.reels__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 48px 24px;
  color: var(--text-dim);
}
.reels__empty-ic {
  display: flex;
  color: var(--text-faint);
  margin-bottom: 4px;
}
.reels__empty-t { font-weight: 700; font-size: 1.02rem; color: var(--text); }
.reels__empty-d { font-size: 0.88rem; line-height: 1.45; max-width: 320px; }
</style>
