<script setup>
// Modal para SUBIR un Reel:
//  1) elegir video  2) validar duración (≤30s) y tamaño (≤50MB)
//  3) generar la PORTADA automática (primer fotograma, vía canvas)
//  4) elegir categoría (obligatoria) + descripción (opcional)
//  5) subir video + portada a Storage y pedir al backend que cree el registro.
import { ref, computed, onBeforeUnmount } from 'vue'
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage, auth } from '../firebase'
import { crearReel } from '../services/backend'
import { CATEGORIAS_REELS } from '../data/categoriasReels'

const emit = defineEmits(['cerrar', 'publicado'])

const MAX_SEG = 30
const MAX_MB = 50
const MAX_DESC = 300

const archivo = ref(null) // File del video
const videoPreviewUrl = ref('') // objectURL para previsualizar
const portadaBlob = ref(null) // Blob JPEG de la portada generada
const portadaPreviewUrl = ref('')
const duracion = ref(0)
const pesoMB = ref(0)

const categoria = ref('')
const descripcion = ref('')

const error = ref('')
const procesando = ref(false) // generando portada / validando
const subiendo = ref(false)
const progreso = ref(0)

const fileInput = ref(null)

const listoParaPublicar = computed(
  () => !!archivo.value && !!portadaBlob.value && !!categoria.value && !subiendo.value,
)

function abrirSelector() {
  if (subiendo.value) return
  fileInput.value?.click()
}

function limpiarObjetos() {
  if (videoPreviewUrl.value) URL.revokeObjectURL(videoPreviewUrl.value)
  if (portadaPreviewUrl.value) URL.revokeObjectURL(portadaPreviewUrl.value)
}

function resetArchivo() {
  limpiarObjetos()
  archivo.value = null
  videoPreviewUrl.value = ''
  portadaBlob.value = null
  portadaPreviewUrl.value = ''
  duracion.value = 0
  pesoMB.value = 0
}

async function onElegir(e) {
  const file = e.target.files?.[0]
  if (e.target) e.target.value = '' // permite re-elegir el mismo archivo
  if (!file) return
  error.value = ''

  if (!file.type.startsWith('video/')) {
    error.value = 'Elige un archivo de video.'
    return
  }
  const mb = file.size / (1024 * 1024)
  if (mb > MAX_MB) {
    error.value = `El video pesa ${mb.toFixed(0)} MB. El máximo es ${MAX_MB} MB.`
    return
  }

  resetArchivo()
  procesando.value = true
  try {
    await prepararVideo(file)
    archivo.value = file
    pesoMB.value = mb
  } catch (err) {
    resetArchivo()
    error.value = err?.message || 'No se pudo leer el video. Prueba con otro.'
  } finally {
    procesando.value = false
  }
}

// Carga el video, valida la duración y captura el primer fotograma como portada.
function prepararVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    let listoMeta = false

    const fallar = (msg) => {
      URL.revokeObjectURL(url)
      reject(new Error(msg))
    }

    video.onloadedmetadata = () => {
      listoMeta = true
      if (video.duration && video.duration > MAX_SEG + 0.5) {
        return fallar(
          `El video dura ${Math.round(video.duration)} s. El máximo es ${MAX_SEG} s.`,
        )
      }
      duracion.value = video.duration || 0
      // Salta a un instante temprano para tomar la portada del primer fotograma.
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
      } catch {
        capturar(video, url, resolve, fallar)
      }
    }

    video.onseeked = () => capturar(video, url, resolve, fallar)

    video.onerror = () => fallar('No se pudo procesar el video.')

    // Salvavidas: si en 12s no cargó metadata, abortamos.
    setTimeout(() => {
      if (!listoMeta) fallar('El video tardó demasiado en cargar.')
    }, 12000)
  })
}

function capturar(video, url, resolve, fallar) {
  try {
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return fallar('El video no tiene imagen válida.')
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (!blob) return fallar('No se pudo generar la portada.')
        portadaBlob.value = blob
        portadaPreviewUrl.value = URL.createObjectURL(blob)
        // Conservamos el objectURL del video para previsualizarlo en el modal.
        videoPreviewUrl.value = url
        resolve()
      },
      'image/jpeg',
      0.8,
    )
  } catch {
    fallar('No se pudo generar la portada.')
  }
}

async function publicar() {
  if (!listoParaPublicar.value) return
  error.value = ''
  subiendo.value = true
  progreso.value = 0

  const uid = auth.currentUser?.uid
  const ts = Date.now()
  const ext = (archivo.value.name.split('.').pop() || 'mp4').toLowerCase().slice(0, 5)
  const videoPath = `reels/${uid}/${ts}_video.${ext}`
  const portadaPath = `reels/${uid}/${ts}_portada.jpg`

  try {
    // 1) Subir el VIDEO (con progreso).
    const tarea = uploadBytesResumable(storageRef(storage, videoPath), archivo.value, {
      contentType: archivo.value.type || 'video/mp4',
    })
    await new Promise((resolve, reject) => {
      tarea.on(
        'state_changed',
        (snap) => {
          // Reservamos el 90% del progreso para el video, 10% para la portada.
          progreso.value = Math.round((snap.bytesTransferred / snap.totalBytes) * 90)
        },
        reject,
        resolve,
      )
    })
    const videoUrl = await getDownloadURL(tarea.snapshot.ref)

    // 2) Subir la PORTADA.
    await uploadBytesResumable(storageRef(storage, portadaPath), portadaBlob.value, {
      contentType: 'image/jpeg',
    })
    progreso.value = 96
    const portadaUrl = await getDownloadURL(storageRef(storage, portadaPath))

    // 3) Crear el registro en el backend (datos de confianza).
    try {
      await crearReel({
        categoria: categoria.value,
        descripcion: descripcion.value.trim(),
        videoUrl,
        videoPath,
        portadaUrl,
        portadaPath,
      })
    } catch (err) {
      // Si el backend rechaza, limpiamos los archivos que ya subimos.
      deleteObject(storageRef(storage, videoPath)).catch(() => {})
      deleteObject(storageRef(storage, portadaPath)).catch(() => {})
      throw err
    }

    progreso.value = 100
    emit('publicado')
  } catch (err) {
    error.value = err?.message || 'No se pudo publicar el video. Inténtalo de nuevo.'
    subiendo.value = false
  }
}

function cerrar() {
  if (subiendo.value) return // no cerrar a media subida
  emit('cerrar')
}

onBeforeUnmount(limpiarObjetos)
</script>

<template>
  <div class="rs-overlay" @click.self="cerrar">
    <div class="rs-panel" role="dialog" aria-modal="true" aria-label="Subir Reel">
      <header class="rs-head">
        <h2 class="rs-title">Subir Reel</h2>
        <button class="rs-x" aria-label="Cerrar" :disabled="subiendo" @click="cerrar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div class="rs-body">
        <input
          ref="fileInput"
          type="file"
          accept="video/*"
          class="rs-file"
          @change="onElegir"
        />

        <!-- Sin video aún -->
        <button
          v-if="!archivo && !procesando"
          class="rs-drop"
          @click="abrirSelector"
        >
          <span class="rs-drop__ic" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M10 9.5v5l4.2-2.5z" />
            </svg>
          </span>
          <span class="rs-drop__t">Elegir video</span>
          <span class="rs-drop__d">Vertical · máximo {{ MAX_SEG }} s · {{ MAX_MB }} MB</span>
        </button>

        <!-- Procesando (validando + portada) -->
        <div v-else-if="procesando" class="rs-loading">
          <span class="rs-spin" aria-hidden="true"></span>
          <span>Procesando video…</span>
        </div>

        <!-- Video listo: preview + datos -->
        <template v-else>
          <div class="rs-preview">
            <video
              :src="videoPreviewUrl"
              class="rs-video"
              controls
              playsinline
              :poster="portadaPreviewUrl"
            ></video>
            <div class="rs-meta">
              <span class="rs-meta__chip">{{ duracion.toFixed(0) }} s</span>
              <span class="rs-meta__chip">{{ pesoMB.toFixed(1) }} MB</span>
              <button class="rs-cambiar" :disabled="subiendo" @click="abrirSelector">
                Cambiar
              </button>
            </div>
          </div>

          <!-- Categoría (obligatoria) -->
          <div class="rs-campo">
            <label class="rs-label">
              Categoría <span class="rs-req">obligatoria</span>
            </label>
            <div class="rs-chips">
              <button
                v-for="c in CATEGORIAS_REELS"
                :key="c.value"
                class="rs-chip"
                :class="{ 'rs-chip--on': categoria === c.value }"
                :disabled="subiendo"
                @click="categoria = c.value"
              >
                {{ c.label }}
              </button>
            </div>
          </div>

          <!-- Descripción (opcional) -->
          <div class="rs-campo">
            <label class="rs-label">
              Descripción <span class="rs-opt">opcional</span>
            </label>
            <textarea
              v-model="descripcion"
              class="rs-textarea"
              :maxlength="MAX_DESC"
              rows="2"
              placeholder="Cuéntale algo a la comunidad…"
              :disabled="subiendo"
            ></textarea>
            <span class="rs-contador">{{ descripcion.length }}/{{ MAX_DESC }}</span>
          </div>
        </template>

        <p v-if="error" class="rs-error">{{ error }}</p>
      </div>

      <footer class="rs-foot">
        <div v-if="subiendo" class="rs-prog">
          <div class="rs-prog__bar"><div class="rs-prog__fill" :style="{ width: progreso + '%' }"></div></div>
          <span class="rs-prog__txt">Subiendo… {{ progreso }}%</span>
        </div>
        <button
          v-else
          class="rs-publicar"
          :disabled="!listoParaPublicar"
          @click="publicar"
        >
          Publicar Reel
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.rs-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.rs-panel {
  width: 100%;
  max-width: 460px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 22px 22px 0 0;
  border: 1px solid var(--border-soft);
  border-bottom: none;
  overflow: hidden;
}
.rs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.rs-title { font-size: 1.1rem; font-weight: 800; color: var(--text); }
.rs-x {
  display: flex;
  color: var(--text-dim);
  padding: 4px;
  border-radius: 10px;
}
.rs-x:disabled { opacity: 0.4; }
.rs-body { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.rs-file { display: none; }

.rs-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 34px 20px;
  border: 1.5px dashed var(--border-soft);
  border-radius: var(--r-md);
  background: var(--surface-2);
  cursor: pointer;
  text-align: center;
}
.rs-drop__ic { color: var(--accent); }
.rs-drop__t { font-weight: 700; color: var(--text); font-size: 1rem; }
.rs-drop__d { font-size: 0.83rem; color: var(--text-dim); }

.rs-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-dim);
  font-size: 0.9rem;
}
.rs-spin {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--accent-soft);
  border-top-color: var(--accent);
  animation: rsSpin 0.8s linear infinite;
}
@keyframes rsSpin { to { transform: rotate(360deg); } }

.rs-preview { display: flex; flex-direction: column; gap: 8px; }
.rs-video {
  width: 100%;
  max-height: 46vh;
  border-radius: var(--r-md);
  background: #000;
  aspect-ratio: 9 / 16;
  object-fit: contain;
}
.rs-meta { display: flex; align-items: center; gap: 8px; }
.rs-meta__chip {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface-2);
  padding: 4px 10px;
  border-radius: var(--r-pill);
}
.rs-cambiar {
  margin-left: auto;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--accent);
  padding: 4px 6px;
}
.rs-cambiar:disabled { opacity: 0.5; }

.rs-campo { display: flex; flex-direction: column; gap: 8px; }
.rs-label { font-weight: 700; font-size: 0.92rem; color: var(--text); }
.rs-req { font-size: 0.72rem; font-weight: 600; color: var(--accent); }
.rs-opt { font-size: 0.72rem; font-weight: 500; color: var(--text-faint); }

.rs-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rs-chip {
  padding: 7px 12px;
  border-radius: var(--r-pill);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface-2);
  border: 1px solid transparent;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.rs-chip--on {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}
.rs-chip:disabled { opacity: 0.5; }

.rs-textarea {
  width: 100%;
  resize: none;
  padding: 11px 12px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--border-soft);
  color: var(--text);
  font-size: 0.92rem;
  font-family: inherit;
  line-height: 1.4;
}
.rs-textarea:focus { outline: none; border-color: var(--accent); }
.rs-contador { align-self: flex-end; font-size: 0.74rem; color: var(--text-faint); }

.rs-error {
  color: #ef4444;
  font-size: 0.85rem;
  line-height: 1.35;
  background: rgba(239, 68, 68, 0.08);
  padding: 9px 11px;
  border-radius: var(--r-md);
}

.rs-foot { padding: 14px 16px; border-top: 1px solid var(--border-soft); flex-shrink: 0; }
.rs-publicar {
  width: 100%;
  padding: 13px;
  border-radius: var(--r-md);
  font-weight: 800;
  font-size: 0.98rem;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
  transition: opacity 0.18s, transform 0.12s;
}
.rs-publicar:disabled { opacity: 0.45; box-shadow: none; }
.rs-publicar:not(:disabled):active { transform: scale(0.99); }

.rs-prog { display: flex; flex-direction: column; gap: 7px; }
.rs-prog__bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}
.rs-prog__fill {
  height: 100%;
  background: var(--grad-firma);
  border-radius: 999px;
  transition: width 0.25s ease;
}
.rs-prog__txt { font-size: 0.84rem; color: var(--text-dim); text-align: center; font-weight: 600; }
</style>
