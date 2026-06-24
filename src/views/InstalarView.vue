<script setup>
// Pantalla pública "Instala la app" — pensada para llegar por QR pegado en el gym.
// Guía al socio a instalar la PWA según su plataforma:
//   • Android/Chrome: botón nativo si hay evento beforeinstallprompt; si no, pasos manuales.
//   • iOS/Safari: iOS no permite instalación programática -> instrucciones Compartir -> Agregar a inicio.
//   • Ya instalada (standalone): mensaje "ya la tienes" + botón para entrar.
//
// Reutiliza el MISMO enfoque de InstallPrompt.vue (beforeinstallprompt -> preventDefault ->
// prompt()/userChoice y la comprobación de display-mode standalone), pero auto-contenido en
// esta vista para no tocar ese componente.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const evento = ref(null)        // beforeinstallprompt capturado (Android/Chrome)
const instalada = ref(false)    // la app ya corre como app instalada
const instalando = ref(false)
const instaladaAhora = ref(false) // se instaló durante esta visita

// --- Detección de plataforma (solo para mostrar las instrucciones correctas) ---
const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
// iPhone/iPod/iPad. iPadOS moderno se hace pasar por Mac, así que detectamos también
// un Mac con pantalla táctil (iPad).
const esIOS = computed(() => {
  const iphone = /iphone|ipod|ipad/i.test(ua)
  const ipadOS = /macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1
  return iphone || ipadOS
})
const esAndroid = computed(() => /android/i.test(ua))

function comprobarInstalada() {
  instalada.value =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
}

function onBeforeInstall(e) {
  e.preventDefault() // usamos nuestro propio botón en vez del mini-infobar
  evento.value = e
}

function onInstalled() {
  evento.value = null
  instaladaAhora.value = true
  comprobarInstalada()
}

async function instalar() {
  const e = evento.value
  if (!e) return
  instalando.value = true
  e.prompt()
  try {
    await e.userChoice
  } catch {
    /* el usuario cerró el diálogo; no hacemos nada */
  }
  instalando.value = false
  evento.value = null
}

function entrar() {
  router.push('/inicio')
}

onMounted(() => {
  comprobarInstalada()
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>

<template>
  <main class="screen instalar">
    <!-- Halo decorativo de fondo (consistente con login) -->
    <div class="instalar__halo" aria-hidden="true"></div>

    <!-- Encabezado de marca -->
    <header class="instalar__top stagger">
      <div class="brand">
        <span class="brand__mark">
          <span class="brand__ring" aria-hidden="true"></span>
          <img class="brand__logo" src="/gymvexa-icon.png" alt="Gymvexa" width="76" height="76" />
        </span>
      </div>
      <h1 class="instalar__title display">Instala la app de Gymvexa</h1>
      <p class="instalar__sub">
        Tu acceso al gym en una sola app: check-in rápido por QR, tu membresía y
        saldo siempre a la mano.
      </p>
    </header>

    <!-- Beneficios rápidos -->
    <ul class="bene stagger" aria-label="Beneficios">
      <li class="bene__item">
        <span class="bene__ic" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h7v7h-7z" />
          </svg>
        </span>
        <span class="bene__tx">Check-in al instante</span>
      </li>
      <li class="bene__item">
        <span class="bene__ic" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" />
          </svg>
        </span>
        <span class="bene__tx">Membresía y saldo</span>
      </li>
      <li class="bene__item">
        <span class="bene__ic" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z" /><path d="M12 10v3l2 2" /><path d="M9 2h6" />
          </svg>
        </span>
        <span class="bene__tx">Sin filas en recepción</span>
      </li>
    </ul>

    <!-- ====================== CASO: YA ESTÁ INSTALADA ====================== -->
    <section v-if="instalada || instaladaAhora" class="card panel panel--ok stagger">
      <div class="panel__head">
        <span class="panel__badge panel__badge--ok" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div>
          <h2 class="panel__title">¡Ya tienes la app instalada!</h2>
          <p class="panel__desc">Ábrela desde tu pantalla de inicio o entra ahora mismo.</p>
        </div>
      </div>
      <button class="btn btn--primary" @click="entrar">Entrar a la app</button>
    </section>

    <!-- ====================== CASO: ANDROID / CHROME ====================== -->
    <section v-else-if="!esIOS" class="card panel stagger">
      <!-- Hay evento nativo: botón de instalación directa -->
      <template v-if="evento">
        <div class="panel__head">
          <span class="panel__badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />
            </svg>
          </span>
          <div>
            <h2 class="panel__title">Instálala en un toque</h2>
            <p class="panel__desc">Se agregará a tu pantalla de inicio como una app más.</p>
          </div>
        </div>
        <button class="btn btn--primary" :disabled="instalando" @click="instalar">
          <svg v-if="instalando" class="spin" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
          <span>{{ instalando ? 'Instalando…' : 'Instalar app' }}</span>
        </button>
      </template>

      <!-- Sin evento nativo: instrucciones manuales (menú del navegador) -->
      <template v-else>
        <div class="panel__head">
          <span class="panel__badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </span>
          <div>
            <h2 class="panel__title">Agrégala a tu pantalla de inicio</h2>
            <p class="panel__desc">Desde el menú de tu navegador, en 2 pasos.</p>
          </div>
        </div>
        <ol class="pasos">
          <li class="paso">
            <span class="paso__n">1</span>
            <span class="paso__tx">Toca el menú <strong>⋮</strong> (arriba a la derecha del navegador).</span>
          </li>
          <li class="paso">
            <span class="paso__n">2</span>
            <span class="paso__tx">Elige <strong>“Instalar app”</strong> o <strong>“Agregar a pantalla de inicio”</strong>.</span>
          </li>
        </ol>
        <p class="nota">Consejo: abre esta página en <strong>Chrome</strong> para instalarla con un solo toque.</p>
      </template>
    </section>

    <!-- ====================== CASO: iOS / SAFARI ====================== -->
    <section v-else class="card panel stagger">
      <div class="panel__head">
        <span class="panel__badge" aria-hidden="true">
          <!-- Ícono Compartir (estilo iOS) -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4" /><path d="m8 8 4-4 4 4" />
            <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
        </span>
        <div>
          <h2 class="panel__title">Instálala en tu iPhone</h2>
          <p class="panel__desc">En Safari, sigue estos 3 pasos.</p>
        </div>
      </div>
      <ol class="pasos">
        <li class="paso">
          <span class="paso__n">1</span>
          <span class="paso__tx">
            Toca el botón <strong>Compartir</strong>
            <span class="paso__ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 16V4" /><path d="m8 8 4-4 4 4" />
                <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
            </span>
            en la barra de Safari.
          </span>
        </li>
        <li class="paso">
          <span class="paso__n">2</span>
          <span class="paso__tx">
            Desliza y elige
            <strong>“Agregar a inicio”</strong>
            <span class="paso__ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8" /><path d="M8 12h8" />
              </svg>
            </span>
          </span>
        </li>
        <li class="paso">
          <span class="paso__n">3</span>
          <span class="paso__tx">Confirma con <strong>“Agregar”</strong>. ¡Listo, ya está en tu inicio!</span>
        </li>
      </ol>
      <p class="nota">Importante: en iPhone debes abrir esta página en <strong>Safari</strong> (no funciona desde otros navegadores).</p>
    </section>

    <p class="instalar__foot">
      ¿Ya la instalaste? <button class="enlace" type="button" @click="entrar">Entrar a la app</button>
    </p>
  </main>
</template>

<style scoped>
.instalar {
  justify-content: flex-start;
  gap: 18px;
}

/* Halo radial detrás del encabezado (consistente con login). */
.instalar__halo {
  position: absolute;
  top: -6%;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 62%);
  filter: blur(20px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.instalar__top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.brand { margin-bottom: 2px; }
.brand__mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: var(--r-lg);
  box-shadow: 0 14px 40px var(--accent-glow);
}
.brand__logo {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}
.brand__ring {
  position: absolute;
  inset: -7px;
  border-radius: calc(var(--r-lg) + 7px);
  border: 1.5px solid var(--accent-soft);
  box-shadow: 0 0 26px var(--accent-glow);
  animation: brandPulse 3.2s ease-in-out infinite;
}
@keyframes brandPulse {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50%      { opacity: 0.9; transform: scale(1.04); }
}

.instalar__title {
  font-size: 1.9rem;
  line-height: 1.08;
  background: linear-gradient(180deg, #ffffff, #c7d8f5);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  max-width: 18ch;
}
:root[data-theme="light"] .instalar__title {
  background: linear-gradient(180deg, #0f172a, #06b6d4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.instalar__sub {
  color: var(--text-dim);
  font-size: 0.96rem;
  max-width: 34ch;
}

/* Beneficios en fila de chips. */
.bene {
  position: relative;
  z-index: 1;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.bene__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-dim);
}
.bene__ic { display: inline-flex; color: var(--cyan); }

/* Panel principal (tarjeta con la acción/instrucciones). */
.panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel--ok { border-color: rgba(34, 197, 94, 0.32); }
.panel__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.panel__badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  color: var(--cyan);
  background: var(--accent-soft);
  border: 1px solid var(--line);
}
.panel__badge--ok {
  color: var(--success);
  background: var(--success-soft);
  border-color: rgba(34, 197, 94, 0.3);
}
.panel__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.12rem;
  letter-spacing: -0.01em;
}
.panel__desc {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin-top: 2px;
}

/* Pasos numerados (instrucciones manuales / iOS). */
.pasos {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.paso {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.94rem;
  color: var(--text);
}
.paso__n {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--r-pill);
  font-size: 0.82rem;
  font-weight: 800;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
}
.paso__tx { padding-top: 2px; line-height: 1.4; }
.paso__tx strong { color: var(--text); font-weight: 800; }
.paso__ic {
  display: inline-flex;
  vertical-align: middle;
  margin: 0 2px;
  color: var(--cyan);
}

.nota {
  font-size: 0.82rem;
  color: var(--text-faint);
  padding: 10px 12px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
.nota strong { color: var(--text-dim); }

.instalar__foot {
  position: relative;
  z-index: 1;
  text-align: center;
  font-size: 0.86rem;
  color: var(--text-faint);
  margin-top: 2px;
}
.enlace {
  color: var(--cyan-bright);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
