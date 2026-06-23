<script setup>
// Banner "Instalar app": aparece solo cuando el navegador permite instalar la PWA
// (evento beforeinstallprompt, principalmente Chrome/Android). Es descartable y se
// oculta si la app ya está instalada. En iOS este evento no existe (el usuario
// instala con Compartir -> Agregar a inicio), así que el banner simplemente no sale.
import { ref, onMounted, onBeforeUnmount } from 'vue'

const evento = ref(null)
const visible = ref(false)

function yaInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  )
}

function onBeforeInstall(e) {
  e.preventDefault() // evitamos el mini-infobar por defecto para usar el nuestro
  evento.value = e
  let descartado = false
  try {
    descartado = sessionStorage.getItem('gv-install-dismiss') === '1'
  } catch {
    descartado = false
  }
  if (!yaInstalada() && !descartado) visible.value = true
}

function onInstalled() {
  visible.value = false
  evento.value = null
}

async function instalar() {
  const e = evento.value
  if (!e) return
  visible.value = false
  e.prompt()
  try {
    await e.userChoice
  } catch {
    /* el usuario cerró el diálogo; no hacemos nada */
  }
  evento.value = null
}

function cerrar() {
  visible.value = false
  try {
    sessionStorage.setItem('gv-install-dismiss', '1')
  } catch {
    /* sessionStorage no disponible; no pasa nada */
  }
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>

<template>
  <transition name="install">
    <div v-if="visible" class="install" role="dialog" aria-label="Instalar la app">
      <span class="install__icon" aria-hidden="true">
        <!-- MODIFICADO: ícono de pesas → nuevo logo Gymvexa (cuadrado) -->
        <img class="install__logo" src="/gymvexa-icon.png" alt="Gymvexa" width="42" height="42" />
      </span>
      <div class="install__body">
        <p class="install__title">Instala Gymvexa</p>
        <p class="install__sub">Tenla como app en tu pantalla de inicio.</p>
      </div>
      <button class="install__btn" @click="instalar">Instalar</button>
      <button class="install__close" aria-label="Cerrar" @click="cerrar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  </transition>
</template>

<style scoped>
.install {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--safe-bottom) + var(--nav-h) + 14px);
  z-index: 60;
  width: min(440px, calc(100vw - 24px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  border-radius: var(--r-md);
  background: var(--surface-glass);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-card), 0 0 0 1px var(--accent-soft);
}
.install__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--r-sm);
  /* MODIFICADO: el fondo y el ícono ahora vienen de la imagen del logo */
  box-shadow: 0 6px 18px var(--accent-glow);
}
.install__logo {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}
.install__body { flex: 1; min-width: 0; }
.install__title { font-weight: 800; font-size: 0.96rem; }
.install__sub { color: var(--text-dim); font-size: 0.8rem; }
.install__btn {
  flex-shrink: 0;
  padding: 10px 16px;
  border-radius: var(--r-sm);
  font-weight: 700;
  font-size: 0.88rem;
  color: #fff;
  background: linear-gradient(135deg, var(--cyan) -10%, var(--accent-bright) 35%, var(--accent-deep) 110%);
  box-shadow: 0 8px 22px var(--accent-glow);
}
.install__btn:active { transform: translateY(1px) scale(0.98); }
.install__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  color: var(--text-faint);
}
.install__close:hover { color: var(--text); }

.install-enter-active,
.install-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.install-enter-from,
.install-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px);
}
</style>
