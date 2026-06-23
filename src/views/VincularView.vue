<script setup>
// Pantalla "Vincula tu cuenta": liga la cuenta del socio con su ficha del gym
// usando el CÓDIGO del QR (escaneado o tecleado) o el deep link /vincular?c=.
//
// CRÍTICO:
//  - Reutiliza html5-qrcode (misma librería que el check-in). La cámara se libera
//    SIEMPRE al desmontar, al salir de la vista y tras un escaneo.
//  - Tras vincular con éxito SIEMPRE refresca el token (auth.refrescarClaims(true))
//    para activar el claim {gymId, socioId} y poder leer la ficha del socio.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'
import {
  vincularSocioPorCodigo,
  vincularSocioEnBackend,
  normalizarCodigo,
  extraerCodigoDeQR,
} from '../services/backend'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const socio = useSocioStore()

// Fase de la pantalla:
// 'comprobando' (auto-vínculo silencioso por correo) | 'form' | 'escaneando' |
// 'vinculando' | 'exito'
const fase = ref('form')
const iniciando = ref(false)        // arranque de cámara
const error = ref('')
const codigoInput = ref('')          // lo que el socio teclea (formato XXXX-XXXX)
const mostrarManual = ref(false)     // panel "Tengo un código"
const exitoMensaje = ref('')         // mensaje de éxito (del backend o genérico)

// --- Cámara (mismo patrón que CheckinView) ---
const ID_LECTOR = 'qr-lector-vincular'
let instancia = null
let procesandoEscaneo = false

// Formatea un código normalizado a XXXX-XXXX para mostrarlo.
function formatearGuion(valor) {
  const c = normalizarCodigo(valor).slice(0, 8)
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c
}

// Reformatea mientras el socio teclea (mayúsculas + guion automático).
function alTeclear(e) {
  codigoInput.value = formatearGuion(e.target.value)
}

onMounted(async () => {
  const raw = route.query.c
  const cDeUrl = Array.isArray(raw) ? raw[0] : raw

  if (cDeUrl) {
    // Deep link con código: precargamos y vinculamos automáticamente.
    const codigo = normalizarCodigo(cDeUrl)
    codigoInput.value = formatearGuion(codigo)
    mostrarManual.value = true
    await intentarVincular(codigo)
    return
  }

  // Sin código en la URL: intento SILENCIOSO de auto-vínculo por correo
  // (compatibilidad con socios cuyo correo ya está pre-registrado en su ficha).
  fase.value = 'comprobando'
  try {
    await vincularSocioEnBackend()
    await auth.refrescarClaims(true)
    if (auth.tieneClaimSocio) {
      // Quedó vinculado de forma transparente -> directo a su info.
      router.replace('/inicio')
      return
    }
  } catch {
    // 404 u otros: el socio debe vincular con su código. Mostramos el formulario.
  }
  fase.value = 'form'
})

// Intenta vincular con un código (normaliza y valida 8 chars).
async function intentarVincular(codigo) {
  error.value = ''
  const norm = normalizarCodigo(codigo)
  if (norm.length !== 8) {
    error.value = 'El código debe tener 8 caracteres (formato XXXX-XXXX).'
    fase.value = 'form'
    mostrarManual.value = true
    return
  }

  await liberarCamara() // por si veníamos de escanear
  fase.value = 'vinculando'
  try {
    const r = await vincularSocioPorCodigo(norm)
    // SIEMPRE refrescamos el token para activar el claim nuevo.
    await auth.refrescarClaims(true)
    exitoMensaje.value = r.mensaje || '¡Listo! Ya estás vinculado a tu gimnasio.'
    fase.value = 'exito'
    // Precargamos la ficha (por el claim ya activo) para que /inicio entre con datos.
    try {
      await socio.vincularSocio()
    } catch {
      // No bloquea: /inicio resolverá la ficha de nuevo.
    }
    // Pequeña pausa para disfrutar la animación de éxito y luego al inicio.
    setTimeout(() => router.replace('/inicio'), 1500)
  } catch (e) {
    error.value = e?.message || 'No pudimos vincular tu cuenta. Inténtalo de nuevo.'
    fase.value = 'form'
    mostrarManual.value = true
  }
}

// Vincula con el código tecleado a mano.
async function vincularManual() {
  await intentarVincular(codigoInput.value)
}

// ----------------------------- Cámara / QR -----------------------------
function mensajeCamara(e) {
  const txt = String(e?.message || e || '').toLowerCase()
  const name = String(e?.name || '')
  if (name === 'NotAllowedError' || txt.includes('permission') || txt.includes('denied')) {
    return 'No diste permiso para usar la cámara. Actívalo en tu navegador e inténtalo de nuevo.'
  }
  if (name === 'NotFoundError' || txt.includes('no camera') || txt.includes('not found')) {
    return 'No encontramos una cámara en este dispositivo. Usa la opción "Tengo un código".'
  }
  if (name === 'NotReadableError' || txt.includes('in use') || txt.includes('readable')) {
    return 'La cámara está siendo usada por otra app. Ciérrala e inténtalo de nuevo.'
  }
  if (txt.includes('secure') || txt.includes('https')) {
    return 'La cámara requiere una conexión segura (https) o localhost.'
  }
  return 'No pudimos iniciar la cámara. Inténtalo de nuevo o teclea tu código.'
}

async function iniciarCamara() {
  error.value = ''
  procesandoEscaneo = false
  iniciando.value = true
  try {
    instancia = new Html5Qrcode(ID_LECTOR)
    await instancia.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      onEscaneoExitoso,
      () => {}, // ruido normal mientras no hay QR; lo ignoramos
    )
    fase.value = 'escaneando'
  } catch (e) {
    error.value = mensajeCamara(e)
    await liberarCamara()
  } finally {
    iniciando.value = false
  }
}

async function onEscaneoExitoso(textoQR) {
  if (procesandoEscaneo) return
  procesandoEscaneo = true

  // Detenemos la cámara ANTES de continuar: no la dejamos encendida.
  await liberarCamara()

  const codigo = extraerCodigoDeQR(textoQR)
  if (!codigo || codigo.length !== 8) {
    error.value =
      'Ese QR no contiene un código válido. Pídele a tu gimnasio tu QR de vinculación.'
    fase.value = 'form'
    return
  }
  codigoInput.value = formatearGuion(codigo)
  await intentarVincular(codigo)
}

// Detiene el escaneo y libera el recurso de cámara (stop + clear).
async function liberarCamara() {
  if (fase.value === 'escaneando') fase.value = 'form'
  if (!instancia) return
  try {
    if (instancia.isScanning) {
      await instancia.stop()
    }
    instancia.clear()
  } catch (e) {
    console.warn('Error al liberar la cámara:', e)
  } finally {
    instancia = null
  }
}

function abrirManual() {
  error.value = ''
  mostrarManual.value = true
}

async function cerrarSesion() {
  await liberarCamara()
  socio.reset()
  await auth.logout()
  router.replace('/login')
}

// Limpieza garantizada del hardware al salir de la vista o desmontar.
onBeforeRouteLeave(async () => {
  await liberarCamara()
})
onBeforeUnmount(async () => {
  await liberarCamara()
})
</script>

<template>
  <main class="screen vincular">
    <!-- Halo decorativo de fondo -->
    <div class="vincular__halo" aria-hidden="true"></div>

    <!-- Comprobando cuenta (auto-vínculo silencioso) -->
    <div v-if="fase === 'comprobando'" class="estado-centro">
      <svg class="spin" width="34" height="34" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.2-8.5" />
      </svg>
      <p>Comprobando tu cuenta…</p>
    </div>

    <!-- Éxito -->
    <section v-else-if="fase === 'exito'" class="card resultado">
      <span class="resultado__check">
        <span class="resultado__ripple" aria-hidden="true"></span>
        <span class="resultado__ripple resultado__ripple--2" aria-hidden="true"></span>
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path class="resultado__tick" d="m5 13 4 4L19 7" />
        </svg>
      </span>
      <h2 class="resultado__title">¡Cuenta vinculada!</h2>
      <p class="resultado__msg">{{ exitoMensaje }}</p>
      <p class="resultado__hint">Llevándote a tu información…</p>
    </section>

    <!-- Formulario / escaneo / vinculando -->
    <template v-else>
      <div class="vincular__top stagger">
        <span class="vincular__mark">
          <span class="vincular__ring" aria-hidden="true"></span>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3" />
            <path d="M21 14v7h-7" />
          </svg>
        </span>
        <h1 class="vincular__title display">Vincula tu cuenta</h1>
        <p class="vincular__sub">
          Vincula tu cuenta con tu gimnasio. Pide a tu gimnasio que te muestre tu
          código QR.
        </p>
      </div>

      <!-- Marco de escaneo (solo visible al escanear) -->
      <div
        v-if="fase === 'escaneando' || iniciando"
        class="lector-marco"
        :class="{ 'lector-marco--activo': fase === 'escaneando' }"
      >
        <div :id="ID_LECTOR" class="lector"></div>
        <div class="guias" aria-hidden="true">
          <span class="guia guia--tl"></span>
          <span class="guia guia--tr"></span>
          <span class="guia guia--bl"></span>
          <span class="guia guia--br"></span>
          <span v-if="fase === 'escaneando'" class="guia__laser"></span>
        </div>
        <div v-if="iniciando" class="lector__placeholder">
          <svg class="spin" width="34" height="34" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
          <span>Iniciando cámara…</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="alert alert--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Botón escanear / detener -->
      <button
        v-if="fase !== 'escaneando'"
        class="btn btn--primary"
        :disabled="iniciando || fase === 'vinculando'"
        @click="iniciarCamara"
      >
        <svg v-if="iniciando || fase === 'vinculando'" class="spin" width="20" height="20"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
             stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span>{{ fase === 'vinculando' ? 'Vinculando…' : 'Escanear QR' }}</span>
      </button>

      <button v-else class="btn btn--ghost" @click="liberarCamara">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <span>Detener</span>
      </button>

      <!-- Opción: tengo un código -->
      <button
        v-if="!mostrarManual && fase !== 'escaneando'"
        class="link-codigo"
        @click="abrirManual"
      >
        Tengo un código
      </button>

      <transition name="reveal">
        <div v-if="mostrarManual && fase !== 'escaneando'" class="card manual">
          <div class="field">
            <label class="field__label" for="codigo">Tu código</label>
            <input
              id="codigo"
              :value="codigoInput"
              class="input input--codigo"
              type="text"
              inputmode="text"
              autocapitalize="characters"
              autocomplete="off"
              spellcheck="false"
              maxlength="9"
              placeholder="XXXX-XXXX"
              :disabled="fase === 'vinculando'"
              @input="alTeclear"
              @keyup.enter="vincularManual"
            />
          </div>
          <button
            class="btn btn--primary"
            :disabled="fase === 'vinculando' || normalizarCodigo(codigoInput).length !== 8"
            @click="vincularManual"
          >
            <svg v-if="fase === 'vinculando'" class="spin" width="20" height="20"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
                 stroke-linecap="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.5" />
            </svg>
            <span>{{ fase === 'vinculando' ? 'Vinculando…' : 'Vincular' }}</span>
          </button>
        </div>
      </transition>

      <button class="link-salir" @click="cerrarSesion">Usar otra cuenta</button>
    </template>
  </main>
</template>

<style scoped>
.vincular { gap: var(--sp-4); justify-content: flex-start; }

.vincular__halo {
  position: absolute;
  top: -4%;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow), transparent 62%);
  filter: blur(20px);
  opacity: 0.38;
  pointer-events: none;
  z-index: 0;
}

.vincular__top {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  margin-top: 8px;
}

.vincular__mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--r-lg);
  color: #fff;
  background: linear-gradient(140deg, var(--cyan), var(--accent-bright) 45%, var(--accent-deep));
  box-shadow: 0 14px 40px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.vincular__ring {
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

.vincular__title { font-size: 1.9rem; margin-top: 4px; }
.vincular__sub {
  color: var(--text-dim);
  font-size: 0.96rem;
  max-width: 34ch;
  margin: 0 auto;
}

/* Estado centrado (comprobando) */
.estado-centro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  color: var(--text-dim);
}

/* Marco lector (idéntico en espíritu al de check-in) */
.lector-marco {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--r-xl);
  overflow: hidden;
  background: #000;
  border: 1px solid var(--border);
  box-shadow: var(--glow-accent);
  transition: box-shadow 0.3s ease;
}
.lector-marco--activo {
  box-shadow: 0 0 0 1px var(--accent-soft), 0 0 50px var(--accent-glow);
}
.lector { width: 100%; height: 100%; }
.lector :deep(video) { width: 100% !important; height: 100% !important; object-fit: cover; }
.lector :deep(img) { display: none; }

.guias { position: absolute; inset: 0; pointer-events: none; }
.guia {
  position: absolute;
  width: 34px;
  height: 34px;
  border: 3px solid var(--cyan);
  filter: drop-shadow(0 0 6px var(--cyan-glow));
}
.guia--tl { top: 22px; left: 22px; border-right: 0; border-bottom: 0; border-top-left-radius: 12px; }
.guia--tr { top: 22px; right: 22px; border-left: 0; border-bottom: 0; border-top-right-radius: 12px; }
.guia--bl { bottom: 22px; left: 22px; border-right: 0; border-top: 0; border-bottom-left-radius: 12px; }
.guia--br { bottom: 22px; right: 22px; border-left: 0; border-top: 0; border-bottom-right-radius: 12px; }
.guia__laser {
  position: absolute;
  left: 28px;
  right: 28px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--cyan-bright), transparent);
  box-shadow: 0 0 14px var(--cyan-glow);
  animation: laser 2.4s ease-in-out infinite;
}
@keyframes laser {
  0%, 100% { top: 30px; opacity: 0.4; }
  50%      { top: calc(100% - 30px); opacity: 1; }
}
.lector__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-dim);
  background:
    radial-gradient(420px 280px at 50% 40%, rgba(59, 130, 246, 0.12), transparent 70%),
    var(--bg-elev);
  font-size: 0.92rem;
}
.lector__placeholder svg { color: var(--cyan-bright); }

/* Enlace "Tengo un código" */
.link-codigo {
  position: relative;
  z-index: 1;
  align-self: center;
  padding: 6px 4px;
  color: var(--accent-bright);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.link-codigo:hover { border-color: var(--accent-bright); }

/* Panel manual */
.manual {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 18px;
}
.input--codigo {
  height: 60px;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.35rem;
  text-align: center;
  padding: 0 18px;
  text-indent: 0.3em; /* compensa el tracking para centrar óptico */
}
.input--codigo::placeholder {
  letter-spacing: 0.2em;
  font-weight: 600;
}

/* Enlace cerrar sesión / usar otra cuenta */
.link-salir {
  position: relative;
  z-index: 1;
  align-self: center;
  margin-top: 4px;
  padding: 8px;
  color: var(--text-faint);
  font-size: 0.86rem;
  font-weight: 600;
}
.link-salir:hover { color: var(--text-dim); }

/* Resultado de éxito (animación tipo check-in) */
.resultado {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 38px 24px;
  margin-top: 12%;
  animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.resultado__check {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  color: #04231a;
  background: linear-gradient(160deg, #5cf2cd, var(--success));
  box-shadow: 0 0 0 8px rgba(47, 224, 173, 0.14), 0 12px 36px var(--success-glow);
  margin-bottom: 10px;
  animation: pop 0.5s cubic-bezier(0.18, 1.4, 0.4, 1) both;
}
@keyframes pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); }
}
.resultado__tick {
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
  animation: draw 0.4s 0.22s ease forwards;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
.resultado__ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--success);
  animation: ripple 1.1s ease-out 0.2s forwards;
  opacity: 0;
}
.resultado__ripple--2 { animation-delay: 0.45s; }
@keyframes ripple {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.9); opacity: 0; }
}
.resultado__title { font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; }
.resultado__msg { color: var(--text); font-size: 1rem; max-width: 30ch; }
.resultado__hint { color: var(--text-dim); font-size: 0.88rem; margin-top: 4px; }

/* Transición del panel manual */
.reveal-enter-active { transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.reveal-enter-from { opacity: 0; transform: translateY(-8px); }
</style>
