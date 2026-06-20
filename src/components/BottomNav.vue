<script setup>
// Barra de navegación inferior tipo app (móvil).
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const activo = computed(() => route.name)

const items = [
  { name: 'inicio', label: 'Inicio', to: '/inicio', icon: 'inicio', activable: true },
  { name: 'checkin', label: 'Check-in', to: '/checkin', icon: 'checkin', activable: true },
  { name: 'perfil', label: 'Perfil', to: '/perfil', icon: 'perfil', activable: true },
]
</script>

<template>
  <nav class="bottom-nav">
    <div class="bottom-nav__inner">
      <router-link
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item--active': item.activable && activo === item.name }"
      >
        <span class="nav-item__icon">
          <!-- Inicio (casa) -->
          <svg v-if="item.icon === 'inicio'" width="24" height="24" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
          <!-- Check-in (QR) -->
          <svg v-else-if="item.icon === 'checkin'" width="24" height="24" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3" />
            <path d="M21 14v7h-7" />
          </svg>
          <!-- Perfil (persona) -->
          <svg v-else width="24" height="24" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
          </svg>
        </span>
        <span class="nav-item__label">{{ item.label }}</span>
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
  background: rgba(13, 20, 38, 0.92);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--border);
  padding-bottom: var(--safe-bottom);
}

.bottom-nav__inner {
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  height: var(--nav-h);
  display: flex;
  align-items: stretch;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-dim);
  font-size: 0.7rem;
  font-weight: 600;
  transition: color 0.18s ease;
}

.nav-item__icon {
  position: relative;
  display: flex;
}

.nav-item--active {
  color: var(--accent-bright);
}

/* Glow sutil bajo el ícono activo */
.nav-item--active .nav-item__icon::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: var(--r-pill);
  background: radial-gradient(circle, var(--accent-glow), transparent 70%);
  z-index: -1;
}
</style>
