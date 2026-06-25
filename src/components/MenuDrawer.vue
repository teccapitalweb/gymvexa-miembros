<script setup>
// Menú lateral (drawer) — estilo BioNova.
// Se abre desde el botón "Menú" del nav inferior. Agrupa todos los accesos.
// Solo presentación + navegación: no toca la lógica de sesión salvo el logout.
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDrawer } from '../composables/useDrawer'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'

const { abierto, cerrar } = useDrawer()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const socio = useSocioStore()

const nombre = computed(() => socio.nombreSocio || 'Socio Gymvexa')
const inicial = computed(() => (socio.nombreSocio || 'G').trim().charAt(0).toUpperCase())

const esActivo = (name) => route.name === name

// Navega y cierra el menú.
function ir(ruta) {
  cerrar()
  if (route.path !== ruta) router.push(ruta)
}

async function cerrarSesion() {
  cerrar()
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="drawer" :class="{ 'drawer--open': abierto }">
    <div class="drawer__overlay" @click="cerrar" aria-hidden="true"></div>

    <aside class="drawer__panel" role="dialog" aria-label="Menú">
      <!-- Encabezado: identidad del socio -->
      <header class="drawer__head">
        <div class="drawer__user">
          <span class="drawer__avatar">{{ inicial }}</span>
          <span class="drawer__user-meta">
            <span class="drawer__name">{{ nombre }}</span>
            <span class="drawer__role">Miembro Gymvexa</span>
          </span>
        </div>
        <button type="button" class="drawer__close" @click="cerrar" aria-label="Cerrar menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <nav class="drawer__nav">
        <!-- PRINCIPAL -->
        <p class="drawer__kicker">Principal</p>
        <button class="ditem" :class="{ 'ditem--active': esActivo('inicio') }" @click="ir('/inicio')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
          </span>
          <span class="ditem__label">Inicio</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem" :class="{ 'ditem--active': esActivo('checkin') }" @click="ir('/checkin')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3" /><path d="M21 14v7h-7" />
            </svg>
          </span>
          <span class="ditem__label">Check-in</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>

        <!-- ENTRENAMIENTO -->
        <p class="drawer__kicker">Entrenamiento</p>
        <button class="ditem" :class="{ 'ditem--active': esActivo('rutinas') }" @click="ir('/rutinas')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M6.5 9v6M17.5 9v6M6.5 12h11M3.5 10.5v3M20.5 10.5v3" />
            </svg>
          </span>
          <span class="ditem__label">Rutinas</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem" :class="{ 'ditem--active': esActivo('progreso') }" @click="ir('/progreso')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19V5M4 19h16" /><path d="M8 16l3.5-4 3 2.5L20 8" />
            </svg>
          </span>
          <span class="ditem__label">Progreso</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem" :class="{ 'ditem--active': esActivo('videos') }" @click="ir('/videos')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M10.3 8.7v6.6l5.4-3.3z" />
            </svg>
          </span>
          <span class="ditem__label">Videos</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem" :class="{ 'ditem--active': esActivo('material') }" @click="ir('/material')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          </span>
          <span class="ditem__label">Material</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem" :class="{ 'ditem--active': esActivo('calculadora') }" @click="ir('/calculadora')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" />
              <path d="M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h7" />
            </svg>
          </span>
          <span class="ditem__label">Calculadora corporal</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>

        <!-- COMUNIDAD -->
        <p class="drawer__kicker">Comunidad</p>
        <button class="ditem" :class="{ 'ditem--active': esActivo('foro') }" @click="ir('/foro')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.5 11.3a7.5 7.5 0 0 1-10.6 6.83L4 20l1.67-5.9A7.5 7.5 0 1 1 20.5 11.3z" />
              <path d="M9 10.5h6.5M9 13.5h4" />
            </svg>
          </span>
          <span class="ditem__label">Foro</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>

        <!-- MI CUENTA -->
        <p class="drawer__kicker">Mi cuenta</p>
        <button class="ditem" :class="{ 'ditem--active': esActivo('perfil') }" @click="ir('/perfil')">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
            </svg>
          </span>
          <span class="ditem__label">Mi perfil</span>
          <span class="ditem__chev" aria-hidden="true">›</span>
        </button>
        <button class="ditem ditem--danger" @click="cerrarSesion">
          <span class="ditem__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
            </svg>
          </span>
          <span class="ditem__label">Cerrar sesión</span>
        </button>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}
.drawer--open { pointer-events: auto; }

.drawer__overlay {
  position: absolute;
  inset: 0;
  background: rgba(2, 8, 20, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.26s var(--ease);
}
.drawer--open .drawer__overlay { opacity: 1; }

.drawer__panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  max-width: 84vw;
  background: var(--surface);
  border-right: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  padding: calc(var(--safe-top) + 16px) 14px calc(var(--safe-bottom) + 16px);
  padding-left: calc(var(--safe-left) + 14px);
  transform: translateX(-102%);
  transition: transform 0.28s var(--ease);
  overflow-y: auto;
}
.drawer--open .drawer__panel { transform: translateX(0); }

/* ---- Encabezado ---- */
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 6px 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
}
.drawer__user { display: flex; align-items: center; gap: 12px; min-width: 0; }
.drawer__avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--glow);
}
.drawer__user-meta { display: flex; flex-direction: column; min-width: 0; }
.drawer__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer__role { font-size: 0.74rem; color: var(--text-dim); }
.drawer__close {
  flex: 0 0 auto;
  border: 0;
  background: var(--surface-2);
  color: var(--text-dim);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.18s var(--ease), color 0.18s var(--ease);
}
.drawer__close:active { background: var(--surface-3); color: var(--text); }

/* ---- Secciones ---- */
.drawer__nav { display: flex; flex-direction: column; gap: 2px; }
.drawer__kicker {
  margin: 14px 8px 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.drawer__kicker:first-child { margin-top: 0; }

.ditem {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
  padding: 11px 10px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: background 0.16s var(--ease), color 0.16s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ditem:active { background: var(--surface-2); }
.ditem__icon {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  color: var(--text-dim);
  transition: color 0.16s var(--ease);
}
.ditem__icon svg { width: 22px; height: 22px; display: block; }
.ditem__label { flex: 1; min-width: 0; }
.ditem__chev {
  flex: 0 0 auto;
  color: var(--text-faint);
  font-size: 1.2rem;
  line-height: 1;
  font-weight: 400;
}

/* Activo: tinte de acento */
.ditem--active {
  background: var(--accent-soft);
  color: var(--accent);
}
.ditem--active .ditem__icon { color: var(--accent); }
.ditem--active .ditem__chev { color: var(--accent); }

/* Cerrar sesión */
.ditem--danger { color: var(--danger); margin-top: 4px; }
.ditem--danger .ditem__icon { color: var(--danger); }
.ditem--danger:active { background: var(--danger-soft); }
</style>
