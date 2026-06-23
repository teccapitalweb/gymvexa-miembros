<script setup>
// Barra de navegación inferior (móvil) — Quiet Neon.
// Inicio y Perfil a los lados; Check-in como FAB central elevado.
// Solo estilo/estructura: las rutas y la navegación NO cambian.
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const activo = computed(() => route.name)
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </span>
        <span class="nav-item__label">Inicio</span>
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

      <!-- Perfil -->
      <router-link
        to="/perfil"
        class="nav-item"
        :class="{ 'nav-item--active': activo === 'perfil' }"
      >
        <span class="nav-item__dot" aria-hidden="true"></span>
        <span class="nav-item__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
          </svg>
        </span>
        <span class="nav-item__label">Perfil</span>
      </router-link>
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
  /* Fondo más silencioso (vidrio sobrio, sin glow). */
  background: rgba(6, 9, 16, 0.78);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
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
  padding: 0 8px;
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
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.2s var(--ease);
  -webkit-tap-highlight-color: transparent;
}

/* Indicador activo sutil: línea corta arriba (sin glow pesado). */
.nav-item__dot {
  position: absolute;
  top: 6px;
  width: 18px;
  height: 2.5px;
  border-radius: var(--r-pill);
  background: var(--accent-bright);
  opacity: 0;
  transform: scaleX(0.4);
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}

.nav-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 30px;
  transition: transform 0.2s var(--ease);
}
.nav-item:active .nav-item__icon { transform: scale(0.9); }

.nav-item--active { color: var(--accent-bright); }
.nav-item--active .nav-item__dot { opacity: 1; transform: scaleX(1); }

/* ---- FAB central (Check-in) ---- */
.nav-fab {
  position: relative;
  flex: 0 0 auto;
  width: 84px;
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
  /* Un único glow intencional: este es EL acento del nav. */
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
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: color 0.2s var(--ease);
}
.nav-fab--active { color: var(--accent-bright); }
</style>
