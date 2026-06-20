<script setup>
// Pantalla de check-in: escanea el QR del gym con la cámara (html5-qrcode).
// CRÍTICO: la cámara se detiene y libera SIEMPRE al desmontar, al salir de la
// vista, y tras un escaneo exitoso. Nunca se deja encendida.
import { ref, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import { useCheckinStore } from '../stores/checkin'

const router = useRouter()
const checkin = useCheckinStore()

const ID_LECTOR = 'qr-lector'
let instancia = null          // instancia de Html5Qrcode
let procesandoEscaneo = false // evita callbacks duplicados de un mismo escaneo

const escaneando = ref(false)
const iniciando = ref(false)
const error = ref('')
const resultado = ref(null)   // { ok, membresiaVigente, mensaje, nombre, fechaHora }

function mensajeCamara(e) {
  const txt = String(e?.message || e || '').toLowerCase()
  const name = String(e?.name || '')
  if (name === 'NotAllowedError' || txt.includes('permission') || txt.includes('denied')) {
    return 'No diste permiso para usar la cámara. Actívalo en tu navegador e inténtalo de nuevo.'
  }
  if (name === 'NotFoundError' || txt.includes('no camera') || txt.includes('not found')) {
    return 'No encontramos una cámara en este dispositivo.'
  }
  if (name === 'NotReadableError' || txt.includes('in use') || txt.includes('readable')) {
    return 'La cámara está siendo usada por otra app. Ciérrala e inténtalo de nuevo.'
  }
  if (txt.includes('secure') || txt.includes('https')) {
    return 'La cámara requiere una conexión segura (https) o localhost.'
  }
  return 'No pudimos iniciar la cámara. Inténtalo de nuevo.'
}

async function iniciarCamara() {
  error.value = ''
  resultado.value = null
  checkin.limpiarResultado()
  procesandoEscaneo = false
  iniciando.value = true
  try {
    instancia = new Html5Qrcode(ID_LECTOR)
    await instancia.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      onEscaneoExitoso,
      // onScanFailure: ruido normal mientras no hay QR; lo ignoramos.
      () => {},
    )
    escaneando.value = true
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

  // Detenemos la cámara ANTES de registrar: no la dejamos encendida.
  await liberarCamara()

  const r = await checkin.registrarAsistenciaPorQR(textoQR)
  resultado.value = r
  if (!r.ok) {
    error.value = r.mensaje
  }
}

// Detiene el escaneo y libera el recurso de cámara (stop + clear).
async function liberarCamara() {
  escaneando.value = false
  if (!instancia) return
  try {
    // isScanning evita el warning de stop() cuando no está activo.
    if (instancia.isScanning) {
      await instancia.stop()
    }
    instancia.clear()
  } catch (e) {
    // Ignoramos errores al detener: el objetivo es liberar el hardware.
    console.warn('Error al liberar la cámara:', e)
  } finally {
    instancia = null
  }
}

async function reintentar() {
  error.value = ''
  resultado.value = null
  checkin.limpiarResultado()
  await iniciarCamara()
}

function volverAInicio() {
  router.push('/inicio')
}

// Limpieza garantizada del hardware al salir de la vista o desmontar.
onBeforeRouteLeave(async () => {
  await liberarCamara()
})
onBeforeUnmount(async () => {
  await liberarCamara()
})

function horaLegible(fecha) {
  if (!fecha) return ''
  try {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit', minute: '2-digit',
    }).format(fecha)
  } catch {
    return ''
  }
}
</script>

<template>
  <main class="screen screen--with-nav checkin">
    <header class="checkin__head">
      <h1 class="checkin__title">Check-in</h1>
      <p class="checkin__sub">Escanea el código QR de tu gimnasio</p>
    </header>

    <!-- Resultado exitoso -->
    <section v-if="resultado && resultado.ok" class="card resultado">
      <span class="resultado__check">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </span>
      <h2 class="resultado__title">¡Asistencia registrada!</h2>
      <p v-if="resultado.nombre" class="resultado__nombre">{{ resultado.nombre }}</p>
      <p class="resultado__hora">{{ horaLegible(resultado.fechaHora) }}</p>

      <div class="aviso" :class="resultado.membresiaVigente ? 'aviso--ok' : 'aviso--alerta'">
        <svg v-if="resultado.membresiaVigente" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 9v4" /><path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        <span>{{ resultado.mensaje }}</span>
      </div>

      <button class="btn btn--primary" @click="volverAInicio">Volver al inicio</button>
    </section>

    <!-- Flujo de cámara -->
    <template v-else>
      <div class="lector-marco">
        <div :id="ID_LECTOR" class="lector"></div>
        <div v-if="!escaneando && !iniciando" class="lector__placeholder">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9V6a2 2 0 0 1 2-2h3" />
            <path d="M21 9V6a2 2 0 0 0-2-2h-3" />
            <path d="M3 15v3a2 2 0 0 0 2 2h3" />
            <path d="M21 15v3a2 2 0 0 1-2 2h-3" />
            <rect x="8" y="8" width="8" height="8" rx="1.5" />
          </svg>
          <span>La cámara aparecerá aquí</span>
        </div>
      </div>

      <div v-if="error" class="alert alert--error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <button
        v-if="!escaneando"
        class="btn btn--primary"
        :disabled="iniciando || checkin.procesando"
        @click="error ? reintentar() : iniciarCamara()"
      >
        <svg v-if="iniciando" class="spin" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span>{{ iniciando ? 'Iniciando…' : (error ? 'Reintentar' : 'Iniciar cámara') }}</span>
      </button>

      <button v-else class="btn btn--ghost" @click="liberarCamara">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <span>Detener</span>
      </button>
    </template>
  </main>
</template>

<style scoped>
.checkin { gap: 18px; }
.checkin__head { margin-top: 6px; text-align: center; }
.checkin__title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
.checkin__sub { color: var(--text-dim); font-size: 0.95rem; }

.lector-marco {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: #000;
  border: 1px solid var(--border);
  box-shadow: var(--glow-accent);
}
.lector { width: 100%; height: 100%; }
.lector :deep(video) { width: 100% !important; height: 100% !important; object-fit: cover; }

.lector__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-dim);
  background: var(--bg-elev);
  font-size: 0.9rem;
}

/* Resultado */
.resultado {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 30px 22px;
}
.resultado__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(180deg, #43e0b4, var(--success));
  box-shadow: 0 0 0 6px rgba(47, 214, 166, 0.15), 0 10px 30px rgba(47, 214, 166, 0.4);
  margin-bottom: 6px;
}
.resultado__title { font-size: 1.4rem; font-weight: 800; }
.resultado__nombre { font-size: 1.05rem; font-weight: 600; }
.resultado__hora { color: var(--text-dim); font-size: 0.9rem; }

.aviso {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  font-size: 0.92rem;
  font-weight: 600;
  margin: 8px 0 4px;
}
.aviso--ok {
  background: rgba(47, 214, 166, 0.12);
  border: 1px solid rgba(47, 214, 166, 0.35);
  color: #7df0cf;
}
.aviso--alerta {
  background: rgba(255, 84, 112, 0.12);
  border: 1px solid rgba(255, 84, 112, 0.35);
  color: #ffb3c0;
}
</style>
