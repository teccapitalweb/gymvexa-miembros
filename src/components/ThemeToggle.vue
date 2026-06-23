<script setup>
// Botón flotante para alternar día / noche. Aparece sobre todas las pantallas.
import { useTema } from '../composables/useTema'
const { tema, toggle } = useTema()
</script>

<template>
  <div class="theme-toggle-bar">
    <button
      class="theme-toggle"
      type="button"
      :aria-label="tema === 'light' ? 'Activar modo noche' : 'Activar modo día'"
      @click="toggle"
    >
      <!-- En modo noche mostramos el sol (invita a ir a día); en día, la luna. -->
      <svg v-if="tema === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Barra que coloca el botón arriba a la derecha, dentro del flujo de la pantalla
   (se desplaza con el scroll y no tapa el contenido). */
.theme-toggle-bar {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-bottom: 2px;
}
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--r-pill);
  color: var(--text-dim);
  background: var(--surface-glass);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  transition: color 0.2s var(--ease), transform 0.2s var(--ease), background 0.3s var(--ease);
}
.theme-toggle:hover { color: var(--text); }
.theme-toggle:active { transform: scale(0.94); }
.theme-toggle svg { width: 20px; height: 20px; }
</style>
