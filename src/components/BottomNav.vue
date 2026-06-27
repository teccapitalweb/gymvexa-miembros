<script setup>
// Barra de navegación inferior (móvil) — estilo BioNova.
// 5 accesos: Inicio · Reels · Check-in (FAB central) · Foro · Menú.
// El botón "Menú" abre el menú lateral (drawer). La lógica de rutas no cambia.
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useDrawer } from '../composables/useDrawer'
import { useAvisosForo } from '../composables/useForoNuevos'

const route = useRoute()
const activo = computed(() => route.name)
const { abierto, abrir } = useDrawer()
// Puntito de "hay publicaciones nuevas" en la pestaña Foro.
const { hayNuevos: hayNuevosForo } = useAvisosForo()
</script>

<template>
  <nav class="bottom-nav">
    <div class="bottom-nav__inner">
      <!-- Inicio -->
      <router-link
        to="/inicio"
        class="nav-item"
        :class="{ 'nav-item--active': activo === 'inicio' }"
      >
        <span class="nav-item__dot" aria-hidden="true"></span>
        <span class="nav-item__icon">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </span>
        <span class="nav-item__label">Inicio</span>
      </router-link>

      <!-- Reels -->
      <router-link
        to="/reels"
        class="nav-item"
        :class="{ 'nav-item--active': activo === 'reels' }"
      >
        <span class="nav-item__dot" aria-hidden="true"></span>
        <span class="nav-item__icon">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="M10 8.5v7l5-3.5z" />
          </svg>
        </span>
        <span class="nav-item__label">Reels</span>
      </router-link>

      <!-- Check-in (FAB central elevado) -->
      <router-link
        to="/checkin"
        class="nav-fab"
        :class="{ 'nav-fab--active': activo === 'checkin' }"
      >
        <span class="nav-fab__btn">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3" />
            <path d="M21 14v7h-7" />
          </svg>
        </span>
        <span class="nav-fab__label">Check-in</span>
      </router-link>

      <!-- Foro -->
      <router-link
        to="/foro"
        class="nav-item"
        :class="{ 'nav-item--active': activo === 'foro' }"
      >
        <span class="nav-item__dot" aria-hidden="true"></span>
        <span class="nav-item__icon">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.5 11.3a7.5 7.5 0 0 1-10.6 6.83L4 20l1.67-5.9A7.5 7.5 0 1 1 20.5 11.3z" />
            <path d="M9 10.5h6.5M9 13.5h4" />
          </svg>
          <span v-if="hayNuevosForo" class="nav-item__badge" aria-hidden="true"></span>
        </span>
        <span class="nav-item__label">Foro</span>
      </router-link>

      <!-- Menú (abre el menú lateral) -->
      <button
        type="button"
        class="nav-item nav-item--btn"
        :class="{ 'nav-item--active': abierto }"
        @click="abrir"
        aria-label="Abrir menú"
      >
        <span class="nav-item__dot" aria-hidden="true"></span>
        <span class="nav-item__icon">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </span>
        <span class="nav-item__label">Menú</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  /* Fondo 100% SÓLIDO (sin vidrio ni backdrop-filter). En Android como PWA el
     blur no se pinta aunque el navegador diga que lo soporta, y un fondo
     translúcido dejaba ver el contenido de atrás. Sólido = se ve bien en todos. */
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}

.bottom-nav__inner {
  position: relative;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  height: var(--nav-h);
  display: flex;
  align-items: stretch;
  padding: 0 6px;
}

/* ---- Items laterales ---- */
.nav-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-faint);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.2s var(--ease);
  -webkit-tap-highlight-color: transparent;
}

/* Reset cuando el item es un <button> (el de Menú). */
.nav-item--btn {
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

/* Indicador activo sutil: línea corta arriba. */
.nav-item__dot {
  position: absolute;
  top: 6px;
  width: 18px;
  height: 2.5px;
  border-radius: var(--r-pill);
  background: var(--accent);
  opacity: 0;
  transform: scaleX(0.4);
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}

.nav-item__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 28px;
  transition: transform 0.2s var(--ease);
}
.nav-item:active .nav-item__icon { transform: scale(0.9); }

/* Puntito "hay publicaciones nuevas" (solo en Foro). */
.nav-item__badge {
  position: absolute;
  top: 0;
  right: 7px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff4d4f;
  box-shadow: 0 0 0 2px var(--surface), 0 0 7px rgba(255, 77, 79, 0.6);
  animation: foroBadgePulse 2s ease-in-out infinite;
}
@keyframes foroBadgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

.nav-item--active { color: var(--accent); }
.nav-item--active .nav-item__dot { opacity: 1; transform: scaleX(1); }

/* ---- FAB central (Check-in) ---- */
.nav-fab {
  position: relative;
  flex: 0 0 auto;
  width: 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 9px;
  color: var(--text-dim);
  -webkit-tap-highlight-color: transparent;
}

.nav-fab__btn {
  position: absolute;
  top: -22px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 8px 24px var(--glow), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  border: 3px solid var(--bg);
  transition: transform 0.18s var(--ease), box-shadow 0.2s var(--ease);
}
.nav-fab:active .nav-fab__btn { transform: scale(0.93); }
.nav-fab--active .nav-fab__btn {
  box-shadow: 0 0 0 3px var(--accent-soft), 0 10px 28px var(--glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.nav-fab__label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: color 0.2s var(--ease);
}
.nav-fab--active { color: var(--accent); }
</style>
