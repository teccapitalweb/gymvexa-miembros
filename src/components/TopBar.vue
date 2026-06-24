<script setup>
// Header superior — estilo BioNova.
// Logo + campanita de notificaciones + botón día/noche.
// La campanita detecta el cumpleaños del socio (campo fechaNacimiento, que el
// panel del dueño guarda como Timestamp) y muestra una felicitación ese día.
import { ref, computed } from 'vue'
import { useTema } from '../composables/useTema'
import { useSocioStore } from '../stores/socio'

const { tema, toggle } = useTema()
const socio = useSocioStore()
const notifAbierta = ref(false)

// Mismo manejo del Timestamp que el panel del dueño (acepta Timestamp o Date).
function tsToDate(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (v instanceof Date) return v
  return null
}

// ¿Hoy es el cumpleaños del socio? (compara día y mes, ignora el año)
const esCumple = computed(() => {
  const d = tsToDate(socio.datos?.fechaNacimiento)
  if (!d) return false
  const hoy = new Date()
  return d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate()
})

const primerNombre = computed(() => (socio.nombreSocio || '').trim().split(/\s+/)[0] || '')
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
            <span v-if="esCumple" class="tbtn__dot" aria-hidden="true"></span>
          </button>

          <transition name="pop">
            <div v-if="notifAbierta" class="notif-pop" role="dialog" aria-label="Notificaciones">
              <p class="notif-pop__title">Notificaciones</p>

              <!-- Cumpleaños -->
              <div v-if="esCumple" class="bday">
                <span class="bday__confeti bday__confeti--1" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--2" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--3" aria-hidden="true"></span>
                <span class="bday__confeti bday__confeti--4" aria-hidden="true"></span>
                <span class="bday__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 21h16" />
                    <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                    <path d="M5 15c1.4 0 1.4 1 2.8 1s1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.8-1 1.4 1 2.8 1" />
                    <path d="M8 12V9M12 12V8.5M16 12V9" />
                    <path d="M8 6.6h.01M12 5.6h.01M16 6.6h.01" />
                  </svg>
                </span>
                <p class="bday__title">¡Feliz cumpleaños<template v-if="primerNombre">, {{ primerNombre }}</template>!</p>
                <p class="bday__text">Todo el equipo de tu gimnasio te desea un día increíble.</p>
              </div>

              <!-- Sin novedades -->
              <div v-else class="notif-pop__empty">
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
.tbtn__dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  border: 2px solid var(--surface);
}

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
  width: 264px;
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

/* Cumpleaños */
.bday {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 12px 6px 6px;
}
.bday__icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 8px 20px var(--glow);
}
.bday__icon svg { width: 28px; height: 28px; }
.bday__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1rem;
  color: var(--text);
  margin: 0;
  line-height: 1.25;
}
.bday__text {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
}
.bday__confeti {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  opacity: 0.9;
}
.bday__confeti--1 { top: 6px; left: 18px; background: var(--accent); transform: rotate(20deg); }
.bday__confeti--2 { top: 14px; right: 22px; background: var(--success); transform: rotate(-15deg); }
.bday__confeti--3 { top: 30px; left: 30px; width: 5px; height: 5px; border-radius: 50%; background: var(--warn); }
.bday__confeti--4 { top: 24px; right: 34px; width: 5px; height: 5px; border-radius: 50%; background: var(--cyan-bright); }

/* Animación del popover */
.pop-enter-active, .pop-leave-active { transition: opacity 0.18s var(--ease), transform 0.18s var(--ease); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>
