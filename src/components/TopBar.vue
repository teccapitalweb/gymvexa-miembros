<script setup>
// Header superior — estilo BioNova.
// Logo + campanita de notificaciones + botón día/noche (un solo lugar).
// La campanita es visual por ahora; luego mostrará felicitaciones de cumpleaños.
import { ref } from 'vue'
import { useTema } from '../composables/useTema'

const { tema, toggle } = useTema()
const notifAbierta = ref(false)
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <!-- Logo -->
      <router-link to="/inicio" class="topbar__brand" aria-label="Inicio">
        <img src="/gymvexa-icon.png" alt="" class="topbar__logo" />
        <span class="topbar__name">Gymvexa</span>
      </router-link>

      <!-- Acciones -->
      <div class="topbar__actions">
        <!-- Campanita -->
        <div class="topbar__notif">
          <button
            class="tbtn"
            type="button"
            @click="notifAbierta = !notifAbierta"
            :class="{ 'tbtn--on': notifAbierta }"
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <transition name="pop">
            <div v-if="notifAbierta" class="notif-pop" role="dialog" aria-label="Notificaciones">
              <p class="notif-pop__title">Notificaciones</p>
              <div class="notif-pop__empty">
                <span class="notif-pop__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <p class="notif-pop__text">Aquí llegarán tus avisos y felicitaciones. ¡Muy pronto!</p>
              </div>
            </div>
          </transition>
        </div>

        <!-- Día / noche -->
        <button
          class="tbtn"
          type="button"
          @click="toggle"
          :aria-label="tema === 'light' ? 'Activar modo noche' : 'Activar modo día'"
        >
          <svg v-if="tema === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Capa para cerrar el popover al tocar fuera -->
    <div v-if="notifAbierta" class="notif-overlay" @click="notifAbierta = false" aria-hidden="true"></div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--surface-glass);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-bottom: 1px solid var(--line);
  padding-top: var(--safe-top);
}
.topbar__inner {
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--safe-right) + 16px) 0 calc(var(--safe-left) + 16px);
}

/* Marca */
.topbar__brand {
  display: flex;
  align-items: center;
  gap: 9px;
  -webkit-tap-highlight-color: transparent;
}
.topbar__logo {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  object-fit: contain;
}
.topbar__name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  background: var(--grad-firma);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Botones de acción */
.topbar__actions { display: flex; align-items: center; gap: 8px; }
.topbar__notif { position: relative; }
.tbtn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition: color 0.18s var(--ease), background 0.18s var(--ease), border-color 0.18s var(--ease), transform 0.18s var(--ease);
}
.tbtn:hover { color: var(--text); border-color: var(--line-strong); }
.tbtn:active { transform: scale(0.94); }
.tbtn--on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.tbtn svg { width: 19px; height: 19px; }

/* Popover de notificaciones */
.notif-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.notif-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  width: 256px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  padding: 14px;
}
.notif-pop__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--text);
  margin: 0 0 12px;
}
.notif-pop__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 8px 4px 4px;
}
.notif-pop__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
}
.notif-pop__icon svg { width: 22px; height: 22px; }
.notif-pop__text {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
}

/* Animación del popover */
.pop-enter-active, .pop-leave-active { transition: opacity 0.18s var(--ease), transform 0.18s var(--ease); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>
