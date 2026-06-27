<script setup>
// REELS — comunidad GLOBAL de video corto de Gymvexa (estilo Xiaohongshu).
// Feed en cuadrícula de 2 columnas: portadas livianas; el video pesado solo se
// reproduce al abrir uno (cuida el Storage). Todos los gyms se ven entre sí.
//
// TANDA 1A (esta): la base navegable — los 2 filtros (Todos / Mi club), las
// categorías deslizables, el aviso para completar redes y el estado vacío.
// La SUBIDA de videos, el feed real, el visor y eliminar llegan en la 1B.
//
// Usa el MISMO contenedor estándar que el resto de la app (.screen / vista-head),
// para que el ancho y el ritmo vertical sean idénticos al Foro y demás vistas.
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
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Reels</h1>
      <p class="vista-sub">La comunidad fitness de Gymvexa</p>
    </header>

    <!-- Aviso para completar redes (solo si no tiene ninguna) -->
    <button v-if="faltanRedes" class="rl-aviso" @click="irAPerfil">
      <span class="rl-aviso__ic" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <span class="rl-aviso__txt">
        Agrega tu Instagram y TikTok en tu perfil para que aparezcan en tus videos.
      </span>
      <span class="rl-aviso__go" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>

    <!-- Filtro principal: Todos / Mi club -->
    <div class="rl-seg" role="tablist">
      <button
        class="rl-seg__btn"
        :class="{ 'rl-seg__btn--on': vista === 'todos' }"
        role="tab"
        :aria-selected="vista === 'todos'"
        @click="vista = 'todos'"
      >
        Todos los videos
      </button>
      <button
        class="rl-seg__btn"
        :class="{ 'rl-seg__btn--on': vista === 'club' }"
        role="tab"
        :aria-selected="vista === 'club'"
        @click="vista = 'club'"
      >
        Solo mi club
      </button>
    </div>

    <!-- Categorías deslizables -->
    <div class="rl-chips">
      <button
        class="rl-chip"
        :class="{ 'rl-chip--on': categoriaActiva === 'todas' }"
        @click="categoriaActiva = 'todas'"
      >
        Para ti
      </button>
      <button
        v-for="c in CATEGORIAS_REELS"
        :key="c.value"
        class="rl-chip"
        :class="{ 'rl-chip--on': categoriaActiva === c.value }"
        @click="categoriaActiva = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- Feed (cuadrícula 2 columnas). En 1A va el estado vacío; el feed real es 1B. -->
    <div class="rl-empty">
      <span class="rl-empty__ic" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.5v5l4.2-2.5z" />
        </svg>
      </span>
      <p class="rl-empty__t">Aún no hay videos aquí</p>
      <p class="rl-empty__d">Muy pronto vas a poder subir el tuyo y verlo junto al de toda la comunidad Gymvexa.</p>
    </div>
  </main>
</template>

<style scoped>
/* Aviso de completar redes */
.rl-aviso {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 11px 12px;
  border-radius: var(--r-md);
  background: var(--accent-soft);
  border: 1px solid var(--border-soft);
  cursor: pointer;
}
.rl-aviso__ic { color: var(--accent); display: flex; flex-shrink: 0; }
.rl-aviso__txt {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.35;
}
.rl-aviso__go { color: var(--text-dim); display: flex; flex-shrink: 0; }

/* Segmented: Todos / Mi club */
.rl-seg {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
}
.rl-seg__btn {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: var(--r-pill);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-dim);
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.rl-seg__btn--on {
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
}

/* Chips de categorías (deslizables) */
.rl-chips {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.rl-chips::-webkit-scrollbar { display: none; }
.rl-chip {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--r-pill);
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid transparent;
  transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}
.rl-chip--on {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* Estado vacío */
.rl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 40px 24px;
  color: var(--text-dim);
}
.rl-empty__ic { display: flex; color: var(--text-faint); margin-bottom: 4px; }
.rl-empty__t { font-weight: 700; font-size: 1.02rem; color: var(--text); }
.rl-empty__d { font-size: 0.88rem; line-height: 1.45; max-width: 320px; }
</style>
