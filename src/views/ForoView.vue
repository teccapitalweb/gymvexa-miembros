<script setup>
// Foro de la comunidad del gym (app del socio).
// Lee/escribe gyms/{gymId}/foro y su subcolección /comentarios directamente en
// Firestore (las reglas ya están vivas: cualquier miembro publica, comenta y
// reacciona; cada quien borra lo SUYO y el staff modera desde el panel).
//
// Esta versión cubre: publicar (texto), likes (corazón), comentarios, borrar lo
// propio y expiración a 15 días del lado cliente. Las IMÁGENES y las
// NOTIFICACIONES (backend) se enchufan en el siguiente paso; si un post ya trae
// imagenUrl, esta vista ya la muestra.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db, storage } from '../firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useAuthStore } from '../stores/auth'
import { useSocioStore } from '../stores/socio'
import { notificarForo } from '../services/backend'

const auth = useAuthStore()
const socioStore = useSocioStore()

const gymId = computed(() => socioStore.gymId)
const miUid = computed(() => auth.uid)
const miNombre = computed(() => socioStore.nombreSocio || 'Socio')
// Para escribir (publicar/comentar/reaccionar) se necesita el claim de socio.
const puedePublicar = computed(() => auth.tieneClaimSocio)

// --- Tiempo / expiración ---
const MAX_DIAS = 15
const ahora = ref(Date.now())
let tick = null // refresca "ahora" cada minuto (tiempos relativos + corte 15 días)

// --- Feed ---
const posts = ref([])
const cargando = ref(true)
let unsub = null

function suscribir() {
  if (!gymId.value || unsub) return
  cargando.value = true
  const q = query(
    collection(db, 'gyms', gymId.value, 'foro'),
    orderBy('creadoEn', 'desc')
  )
  unsub = onSnapshot(
    q,
    (snap) => {
      posts.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cargando.value = false
    },
    (err) => {
      console.error('[foro] onSnapshot:', err)
      cargando.value = false
    }
  )
}
function desuscribir() {
  if (unsub) {
    unsub()
    unsub = null
  }
}

// Timestamp de Firestore -> ms. serverTimestamp recién creado llega null: lo
// tratamos como "ahora" para que el post se vea de inmediato (optimista).
function aMs(creadoEn) {
  if (!creadoEn) return ahora.value
  if (typeof creadoEn.toMillis === 'function') return creadoEn.toMillis()
  if (typeof creadoEn.seconds === 'number') return creadoEn.seconds * 1000
  return ahora.value
}

// Oculta del lado cliente los posts con más de 15 días (el backend los borra
// de verdad con su cron; mientras, no se muestran).
const postsVisibles = computed(() => {
  const corte = ahora.value - MAX_DIAS * 86400000
  return posts.value.filter((p) => aMs(p.creadoEn) >= corte)
})

function hace(creadoEn) {
  const diff = Math.max(0, ahora.value - aMs(creadoEn))
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} d`
}

function inicial(nombre) {
  return (nombre || 'S').trim().charAt(0).toUpperCase()
}

// --- Likes ---
function yaDiLike(p) {
  return Array.isArray(p.likedBy) && p.likedBy.includes(miUid.value)
}
async function alternarLike(p) {
  if (!puedePublicar.value || !gymId.value) return
  const dio = yaDiLike(p)
  try {
    await updateDoc(doc(db, 'gyms', gymId.value, 'foro', p.id), {
      likes: increment(dio ? -1 : 1),
      likedBy: dio ? arrayRemove(miUid.value) : arrayUnion(miUid.value),
    })
    // Solo avisamos cuando se DA like (no al quitarlo). El backend ignora el
    // caso de darte like a ti mismo.
    if (!dio) notificarForo(p.id, 'like')
  } catch (e) {
    console.error('[foro] like:', e)
  }
}

// --- Publicar ---
const texto = ref('')
const publicando = ref(false)
const errorPub = ref('')

// --- Imagen del post (opcional) ---
const imagenBlob = ref(null) // blob comprimido listo para subir
const imagenPreview = ref('') // dataURL para la vista previa
const errorImg = ref('')
const fileInput = ref(null) // <input type=file> oculto

// Comprime y redimensiona la imagen en el CLIENTE (máx 1280px, JPEG ~0.82) para
// que la subida sea rápida y ligera sin importar el tamaño de la foto del
// celular (una foto de 8MB queda en ~200-400KB). Evita topar el límite de 5MB.
function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1280
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('proceso'))
          resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.82) })
        },
        'image/jpeg',
        0.82
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagen'))
    }
    img.src = url
  })
}

function abrirSelectorImagen() {
  errorImg.value = ''
  fileInput.value?.click()
}

async function onElegirImagen(e) {
  const file = e.target.files?.[0]
  if (!file) return
  errorImg.value = ''
  if (!file.type.startsWith('image/')) {
    errorImg.value = 'Selecciona una imagen.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  try {
    const { blob, dataUrl } = await comprimirImagen(file)
    imagenBlob.value = blob
    imagenPreview.value = dataUrl
  } catch (err) {
    console.error('[foro] imagen:', err)
    errorImg.value = 'No se pudo procesar la imagen.'
  } finally {
    // Permite volver a elegir el MISMO archivo (si lo quitó y lo vuelve a poner).
    if (fileInput.value) fileInput.value.value = ''
  }
}

function quitarImagen() {
  imagenBlob.value = null
  imagenPreview.value = ''
  errorImg.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function publicar() {
  const t = texto.value.trim()
  // Se puede publicar con texto, con imagen, o ambos.
  if ((!t && !imagenBlob.value) || publicando.value) return
  if (!puedePublicar.value) {
    errorPub.value = 'Verifica tu correo para poder publicar.'
    return
  }
  publicando.value = true
  errorPub.value = ''
  try {
    // Si hay imagen, primero se sube a Storage y se obtiene su URL.
    let imagenUrl = null
    let imagenPath = null
    if (imagenBlob.value) {
      // Guardamos la RUTA además de la URL: así el borrado (manual o el cron del
      // backend) puede eliminar el archivo de Storage sin tener que parsear la URL.
      imagenPath = `gyms/${gymId.value}/foro/${miUid.value}_${Date.now()}.jpg`
      const ruta = storageRef(storage, imagenPath)
      await uploadBytes(ruta, imagenBlob.value, { contentType: 'image/jpeg' })
      imagenUrl = await getDownloadURL(ruta)
    }

    const datos = {
      uid: miUid.value,
      autorNombre: miNombre.value,
      // Necesario para las notificaciones: el backend lee este campo del post
      // para saber a qué socio avisarle cuando le dan like o lo comentan.
      autorSocioId: socioStore.socioId || null,
      texto: t,
      likes: 0,
      likedBy: [],
      comentariosCount: 0,
      creadoEn: serverTimestamp(),
    }
    if (imagenUrl) {
      datos.imagenUrl = imagenUrl
      datos.imagenPath = imagenPath
    }

    await addDoc(collection(db, 'gyms', gymId.value, 'foro'), datos)
    texto.value = ''
    quitarImagen()
  } catch (e) {
    console.error('[foro] publicar:', e)
    errorPub.value = 'No se pudo publicar. Inténtalo de nuevo.'
  } finally {
    publicando.value = false
  }
}

// --- Borrar post (el socio borra lo SUYO; el staff modera desde el panel) ---
function puedoBorrar(p) {
  return p.uid === miUid.value
}
const postABorrar = ref(null)
const borrandoPost = ref(false)
async function confirmarBorrarPost() {
  if (!postABorrar.value || !gymId.value) return
  borrandoPost.value = true
  const post = postABorrar.value
  try {
    await deleteDoc(doc(db, 'gyms', gymId.value, 'foro', post.id))
    // Borra también la imagen de Storage (si tenía) para no dejarla huérfana.
    // Best-effort: si falla, NO rompe el borrado del post. Usa la ruta guardada;
    // para posts viejos sin imagenPath, cae a la URL (ref() también la acepta).
    const refImg = post.imagenPath || post.imagenUrl
    if (refImg) {
      deleteObject(storageRef(storage, refImg)).catch((err) =>
        console.error('[foro] borrar imagen:', err)
      )
    }
    if (postAbierto.value === post.id) cerrarComentarios()
    postABorrar.value = null
  } catch (e) {
    console.error('[foro] borrar post:', e)
  } finally {
    borrandoPost.value = false
  }
}

// --- Comentarios (solo uno abierto a la vez) ---
const postAbierto = ref(null)
const comentarios = ref([])
const cargandoComentarios = ref(false)
let unsubComentarios = null
const textoComentario = ref('')
const enviandoComentario = ref(false)

function toggleComentarios(p) {
  if (postAbierto.value === p.id) {
    cerrarComentarios()
  } else {
    abrirComentarios(p)
  }
}
function abrirComentarios(p) {
  cerrarComentarios()
  postAbierto.value = p.id
  cargandoComentarios.value = true
  const q = query(
    collection(db, 'gyms', gymId.value, 'foro', p.id, 'comentarios'),
    orderBy('creadoEn', 'asc')
  )
  unsubComentarios = onSnapshot(
    q,
    (snap) => {
      comentarios.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      cargandoComentarios.value = false
    },
    (e) => {
      console.error('[foro] comentarios:', e)
      cargandoComentarios.value = false
    }
  )
}
function cerrarComentarios() {
  if (unsubComentarios) {
    unsubComentarios()
    unsubComentarios = null
  }
  postAbierto.value = null
  comentarios.value = []
  textoComentario.value = ''
}
async function enviarComentario(p) {
  const t = textoComentario.value.trim()
  if (!t || enviandoComentario.value) return
  if (!puedePublicar.value) return
  enviandoComentario.value = true
  try {
    await addDoc(
      collection(db, 'gyms', gymId.value, 'foro', p.id, 'comentarios'),
      {
        uid: miUid.value,
        autorNombre: miNombre.value,
        texto: t,
        creadoEn: serverTimestamp(),
      }
    )
    // El contador vive en el post (las reglas permiten tocar solo comentariosCount).
    await updateDoc(doc(db, 'gyms', gymId.value, 'foro', p.id), {
      comentariosCount: increment(1),
    })
    notificarForo(p.id, 'comentario')
    textoComentario.value = ''
  } catch (e) {
    console.error('[foro] enviar comentario:', e)
  } finally {
    enviandoComentario.value = false
  }
}
// Borrado de comentario CON confirmación (modal), igual que los posts.
// Antes se borraba directo al tocar la X; ahora primero pide confirmar.
const comentABorrar = ref(null) // { p, c }
const borrandoComent = ref(false)
async function confirmarBorrarComentario() {
  if (!comentABorrar.value || !gymId.value) return
  borrandoComent.value = true
  const { p, c } = comentABorrar.value
  try {
    await deleteDoc(
      doc(db, 'gyms', gymId.value, 'foro', p.id, 'comentarios', c.id)
    )
    await updateDoc(doc(db, 'gyms', gymId.value, 'foro', p.id), {
      comentariosCount: increment(-1),
    })
    comentABorrar.value = null
  } catch (e) {
    console.error('[foro] borrar comentario:', e)
  } finally {
    borrandoComent.value = false
  }
}

onMounted(() => {
  // Igual que en Videos/Materiales: resuelve el gymId aunque se entre directo
  // aquí tras recargar. Idempotente.
  socioStore.vincularSocio()
  if (gymId.value) suscribir()
  tick = setInterval(() => {
    ahora.value = Date.now()
  }, 60000)
})
watch(gymId, (g) => {
  if (g) suscribir()
})
onUnmounted(() => {
  desuscribir()
  cerrarComentarios()
  if (tick) clearInterval(tick)
})
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Foro</h1>
      <p class="vista-sub">La comunidad de tu gym, en un solo lugar.</p>
    </header>

    <!-- Composer -->
    <div class="composer card">
      <div class="composer__top">
        <span class="avatar">{{ inicial(miNombre) }}</span>
        <textarea
          v-model="texto"
          class="composer__input"
          rows="2"
          maxlength="1000"
          placeholder="¿Qué quieres compartir con la comunidad?"
          :disabled="!puedePublicar"
        ></textarea>
      </div>

      <!-- Vista previa de la imagen elegida -->
      <div v-if="imagenPreview" class="composer__preview">
        <img :src="imagenPreview" alt="Vista previa" />
        <button
          type="button"
          class="composer__preview-x"
          aria-label="Quitar imagen"
          @click="quitarImagen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- input de archivo oculto -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="composer__file"
        @change="onElegirImagen"
      />

      <p v-if="!puedePublicar" class="composer__aviso">
        Verifica tu correo para poder publicar y comentar.
      </p>
      <p v-else-if="errorImg" class="composer__error">{{ errorImg }}</p>
      <p v-else-if="errorPub" class="composer__error">{{ errorPub }}</p>

      <div class="composer__foot">
        <button
          class="composer__foto"
          type="button"
          :disabled="!puedePublicar || publicando"
          @click="abrirSelectorImagen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2.5" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span>Foto</span>
        </button>
        <button
          class="btn-pub"
          type="button"
          :disabled="(!texto.trim() && !imagenBlob) || publicando || !puedePublicar"
          @click="publicar"
        >
          {{ publicando ? 'Publicando…' : 'Publicar' }}
        </button>
      </div>
      <p class="composer__hint composer__hint--abajo">Las publicaciones se borran a los 15 días.</p>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="foro-lista">
      <div v-for="n in 3" :key="n" class="foro-skeleton"></div>
    </div>

    <!-- Vacío -->
    <div v-else-if="postsVisibles.length === 0" class="foro-vacio card">
      <span class="foro-vacio__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.5 11.3a7.5 7.5 0 0 1-10.6 6.83L4 20l1.67-5.9A7.5 7.5 0 1 1 20.5 11.3z" />
          <path d="M9 10.5h6.5M9 13.5h4" />
        </svg>
      </span>
      <h2 class="foro-vacio__title">Aún no hay publicaciones</h2>
      <p class="foro-vacio__text">
        Sé el primero en compartir un avance, una duda o una foto con la comunidad de tu gym.
      </p>
    </div>

    <!-- Feed -->
    <div v-else class="foro-lista">
      <article v-for="p in postsVisibles" :key="p.id" class="post card">
        <header class="post__head">
          <span class="avatar">{{ inicial(p.autorNombre) }}</span>
          <div class="post__meta">
            <span class="post__autor-row">
              <span class="post__autor">{{ p.autorNombre }}</span>
              <span v-if="p.esStaff" class="badge-staff">Staff</span>
            </span>
            <span class="post__fecha">{{ hace(p.creadoEn) }}</span>
          </div>
          <button
            v-if="puedoBorrar(p)"
            class="post__borrar"
            type="button"
            aria-label="Borrar publicación"
            @click="postABorrar = p"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </header>

        <p class="post__texto">{{ p.texto }}</p>
        <img v-if="p.imagenUrl" :src="p.imagenUrl" class="post__img" alt="" loading="lazy" />

        <div class="post__acciones">
          <button
            class="accion"
            :class="{ 'accion--like': yaDiLike(p) }"
            type="button"
            @click="alternarLike(p)"
          >
            <svg viewBox="0 0 24 24" :fill="yaDiLike(p) ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            <span>{{ p.likes || 0 }}</span>
          </button>
          <button
            class="accion"
            :class="{ 'accion--on': postAbierto === p.id }"
            type="button"
            @click="toggleComentarios(p)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-3.2A8.4 8.4 0 0 1 3 11.5a8.38 8.38 0 0 1 9-8.3 8.38 8.38 0 0 1 9 8.3z" />
            </svg>
            <span>{{ p.comentariosCount || 0 }}</span>
          </button>
        </div>

        <!-- Comentarios -->
        <div v-if="postAbierto === p.id" class="coment">
          <div v-if="cargandoComentarios" class="coment__cargando">Cargando comentarios…</div>
          <template v-else>
            <p v-if="comentarios.length === 0" class="coment__vacio">
              Aún no hay comentarios. Sé el primero.
            </p>
            <div v-for="c in comentarios" :key="c.id" class="coment__item">
              <span class="avatar avatar--sm">{{ inicial(c.autorNombre) }}</span>
              <div class="coment__cuerpo">
                <div class="coment__meta">
                  <span class="coment__autor">{{ c.autorNombre }}</span>
                  <span v-if="c.esStaff" class="badge-staff">Staff</span>
                  <span class="coment__fecha">{{ hace(c.creadoEn) }}</span>
                </div>
                <p class="coment__texto">{{ c.texto }}</p>
              </div>
              <button
                v-if="c.uid === miUid"
                class="coment__borrar"
                type="button"
                aria-label="Borrar comentario"
                @click="comentABorrar = { p, c }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </template>

          <div class="coment__nuevo">
            <input
              v-model="textoComentario"
              class="coment__input"
              type="text"
              maxlength="500"
              placeholder="Escribe un comentario…"
              :disabled="!puedePublicar"
              @keyup.enter="enviarComentario(p)"
            />
            <button
              class="coment__enviar"
              type="button"
              aria-label="Enviar"
              :disabled="!textoComentario.trim() || enviandoComentario || !puedePublicar"
              @click="enviarComentario(p)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Confirmar borrado -->
    <Transition name="modal">
      <div v-if="postABorrar" class="modal" @click.self="postABorrar = null">
        <div class="modal__panel">
          <h3 class="modal__title">Borrar publicación</h3>
          <p class="modal__text">
            ¿Seguro que quieres borrar tu publicación? Esta acción no se puede deshacer.
          </p>
          <div class="modal__acciones">
            <button class="btn-ghost" type="button" @click="postABorrar = null">Cancelar</button>
            <button class="btn-danger" type="button" :disabled="borrandoPost" @click="confirmarBorrarPost">
              {{ borrandoPost ? 'Borrando…' : 'Sí, borrar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirmar borrar comentario -->
    <Transition name="modal">
      <div v-if="comentABorrar" class="modal" @click.self="comentABorrar = null">
        <div class="modal__panel">
          <h3 class="modal__title">Borrar comentario</h3>
          <p class="modal__text">
            ¿Seguro que quieres borrar tu comentario? Esta acción no se puede deshacer.
          </p>
          <div class="modal__acciones">
            <button class="btn-ghost" type="button" @click="comentABorrar = null">Cancelar</button>
            <button class="btn-danger" type="button" :disabled="borrandoComent" @click="confirmarBorrarComentario">
              {{ borrandoComent ? 'Borrando…' : 'Sí, borrar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
/* --------------------------------- Avatar --------------------------------- */
.avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-bright);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.02rem;
}
.avatar--sm {
  width: 30px;
  height: 30px;
  font-size: 0.82rem;
}

/* -------------------------------- Composer -------------------------------- */
.composer {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.composer__top {
  display: flex;
  gap: 11px;
  align-items: flex-start;
}
.composer__input {
  flex: 1;
  min-height: 46px;
  resize: none;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 11px 13px;
  color: var(--text);
  font-family: var(--font-display);
  font-size: 0.94rem;
  line-height: 1.4;
  transition: border-color 0.18s;
}
.composer__input:focus {
  outline: none;
  border-color: var(--accent);
}
.composer__input::placeholder { color: var(--text-faint); }
.composer__input:disabled { opacity: 0.6; }
.composer__aviso {
  margin: 0;
  font-size: 0.8rem;
  color: var(--accent-bright);
}
.composer__error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger);
}
.composer__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.composer__hint {
  font-size: 0.74rem;
  color: var(--text-faint);
}
.btn-pub {
  flex-shrink: 0;
  padding: 9px 20px;
  border-radius: var(--r-pill);
  border: none;
  background: var(--accent);
  color: #04121e;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.86rem;
  cursor: pointer;
  transition: background 0.18s, opacity 0.18s;
}
.btn-pub:hover { background: var(--accent-bright); }
.btn-pub:disabled { opacity: 0.45; cursor: default; }

/* --------------------------------- Feed ----------------------------------- */
.foro-lista {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin-top: var(--sp-4);
}

.post {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.post__head {
  display: flex;
  align-items: center;
  gap: 11px;
}
.post__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.post__autor {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Fila nombre + insignia: el nombre trunca, la insignia siempre se ve. */
.post__autor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
/* Insignia "Staff" para avisos del gym (publicaciones/comentarios del panel). */
.badge-staff {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--r-pill);
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.6;
}
.post__fecha {
  font-size: 0.76rem;
  color: var(--text-faint);
}
.post__borrar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: color 0.18s, background 0.18s;
}
.post__borrar:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
.post__borrar svg { width: 17px; height: 17px; }

.post__texto {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}
.post__img {
  width: 100%;
  border-radius: 14px;
  display: block;
  max-height: 460px;
  object-fit: cover;
}

.post__acciones {
  display: flex;
  gap: 8px;
}
.accion {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-dim);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.18s, border-color 0.18s, background 0.18s;
}
.accion svg { width: 17px; height: 17px; }
.accion:hover { color: var(--text); border-color: var(--line-strong); }
.accion--like {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-soft);
}
.accion--on {
  color: var(--accent-bright);
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* ------------------------------ Comentarios ------------------------------- */
.coment {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: 1px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.coment__cargando,
.coment__vacio {
  font-size: 0.84rem;
  color: var(--text-faint);
  margin: 0;
}
.coment__item {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.coment__cuerpo {
  flex: 1;
  min-width: 0;
  background: var(--surface-2);
  border-radius: 13px;
  padding: 8px 11px;
}
.coment__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}
.coment__autor {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--text);
}
.coment__fecha {
  font-size: 0.7rem;
  color: var(--text-faint);
}
.coment__texto {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}
.coment__borrar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: color 0.18s;
}
.coment__borrar:hover { color: var(--danger); }
.coment__borrar svg { width: 14px; height: 14px; }

.coment__nuevo {
  display: flex;
  gap: 8px;
  align-items: center;
}
.coment__input {
  flex: 1;
  min-width: 0;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 9px 15px;
  color: var(--text);
  font-family: var(--font-display);
  font-size: 0.86rem;
  transition: border-color 0.18s;
}
.coment__input:focus {
  outline: none;
  border-color: var(--accent);
}
.coment__input::placeholder { color: var(--text-faint); }
.coment__enviar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #04121e;
  cursor: pointer;
  transition: background 0.18s, opacity 0.18s;
}
.coment__enviar:hover { background: var(--accent-bright); }
.coment__enviar:disabled { opacity: 0.45; cursor: default; }
.coment__enviar svg { width: 17px; height: 17px; }

/* --------------------------------- Vacío ---------------------------------- */
.foro-vacio {
  margin-top: var(--sp-4);
  padding: 36px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}
.foro-vacio__icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--r-lg);
  background: var(--accent-soft);
  color: var(--accent-bright);
}
.foro-vacio__icon svg { width: 30px; height: 30px; }
.foro-vacio__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text);
  margin: 0;
}
.foro-vacio__text {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
  max-width: 320px;
}

/* -------------------------------- Skeleton -------------------------------- */
.foro-skeleton {
  height: 150px;
  border-radius: var(--r-lg);
  background: linear-gradient(
    100deg,
    var(--surface) 30%,
    var(--surface-2) 50%,
    var(--surface) 70%
  );
  background-size: 200% 100%;
  animation: foroShimmer 1.4s infinite;
}
@keyframes foroShimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

/* --------------------------------- Modal ---------------------------------- */
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 8, 18, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.modal__panel {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  padding: 22px;
  box-shadow: var(--shadow-card);
}
.modal__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.12rem;
  color: var(--text);
  margin: 0 0 8px;
}
.modal__text {
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0 0 18px;
}
.modal__acciones {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-ghost,
.btn-danger {
  padding: 10px 18px;
  border-radius: var(--r-pill);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.86rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.18s, background 0.18s, border-color 0.18s;
}
.btn-ghost {
  background: var(--surface-2);
  color: var(--text);
  border-color: var(--line);
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent-bright); }
.btn-danger {
  background: var(--danger);
  color: #2a0008;
}
.btn-danger:hover { filter: brightness(1.08); }
.btn-danger:disabled { opacity: 0.5; cursor: default; }

.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal__panel,
.modal-leave-active .modal__panel { transition: transform 0.22s ease; }
.modal-enter-from .modal__panel,
.modal-leave-to .modal__panel { transform: scale(0.94); }

@media (prefers-reduced-motion: reduce) {
  .foro-skeleton { animation: none; }
  .modal-enter-active, .modal-leave-active,
  .modal-enter-active .modal__panel, .modal-leave-active .modal__panel {
    transition: none;
  }
}
/* Composer: imagen (botón Foto + vista previa) */
.composer__file { display: none; }
.composer__preview {
  position: relative;
  margin: 10px 0 0;
  border-radius: var(--r-lg);
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.composer__preview img {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
}
.composer__preview-x {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.composer__preview-x svg { width: 16px; height: 16px; }
.composer__foto {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-dim);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s, background 0.18s;
}
.composer__foto:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.composer__foto:disabled { opacity: 0.5; cursor: default; }
.composer__foto svg { width: 18px; height: 18px; }
.composer__hint--abajo {
  margin: 10px 2px 0;
  text-align: center;
}
</style>
