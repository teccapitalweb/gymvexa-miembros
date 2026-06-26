/* Service worker de Gymvexa Socios (PWA).
 *
 * OBJETIVO: que la app sea instalable y cargue rápido, SIN servir datos viejos.
 *
 * ESTRATEGIA DE CACHÉ (deliberadamente conservadora con los datos):
 *  - API / Firebase / cualquier petición CROSS-ORIGIN  -> NUNCA se cachea.
 *      El backend (Railway) y Firestore/Firebase son otro origen, así que este
 *      SW ni siquiera intercepta esas respuestas: van directo a la red (network).
 *      => saldo, membresía y check-in SIEMPRE frescos.
 *  - Peticiones que NO son GET (POST de vincular/checkin) -> directo a la red.
 *  - Navegaciones (cargar una ruta) -> NETWORK-FIRST con respaldo al shell
 *      cacheado (index.html) solo si no hay conexión. Así siempre se obtiene el
 *      index más reciente (que referencia los assets con hash nuevos).
 *  - Assets ESTÁTICOS del mismo origen (/assets/*, js, css, svg, png, fuentes)
 *      -> STALE-WHILE-REVALIDATE: responde al instante desde caché y actualiza
 *      en segundo plano. Como Vite usa nombres con hash, un asset nuevo es una
 *      URL nueva (no hay riesgo de servir una versión vieja del mismo archivo).
 */

const CACHE = 'gymvexa-socios-v1'
const SHELL = '/index.html'

// Precacheamos solo el shell mínimo para el arranque offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SHELL, '/'])).catch(() => {}),
  )
  self.skipWaiting()
})

// Limpia versiones de caché anteriores al activar.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function esAssetEstatico(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|mjs|css|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|eot|webmanifest)$/i.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Solo nos ocupamos de GET. POST (vincular/checkin) va directo a la red.
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // CROSS-ORIGIN (backend Railway, Firebase/Firestore, Google Fonts API, etc.):
  // no interceptar -> el navegador va a la red. Nunca cacheamos datos del backend.
  if (url.origin !== self.location.origin) return

  // Navegaciones (documentos): network-first con respaldo al shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(SHELL, copia)).catch(() => {})
          return res
        })
        .catch(() => caches.match(SHELL).then((r) => r || caches.match('/'))),
    )
    return
  }

  // Assets estáticos del mismo origen: stale-while-revalidate.
  if (esAssetEstatico(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cacheado = await cache.match(req)
        const red = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone())
            return res
          })
          .catch(() => cacheado)
        return cacheado || red
      }),
    )
  }
  // Cualquier otro GET del mismo origen: comportamiento por defecto (red).
})

/* ------------------------------------------------------------------ *
 * NOTIFICACIONES PUSH (FCM web)
 * Recibe el aviso aunque la app esté cerrada y muestra la notificación.
 * El backend (Fase 2) enviará el aviso como 'data' para tener control total
 * del título/cuerpo/ícono/destino y evitar notificaciones duplicadas.
 * ------------------------------------------------------------------ */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : '' } }
  }

  // Aceptamos { notification:{...}, data:{...} } o campos planos.
  const n = payload.notification || payload.data || payload || {}
  const titulo = n.title || n.titulo || 'Gymvexa'
  const cuerpo = n.body || n.cuerpo || ''
  const url = (payload.data && payload.data.url) || n.url || '/foro'

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/notif-badge.png',
      tag: n.tag || 'gymvexa-aviso',
      renotify: true,
      data: { url },
    }),
  )
})

// Al tocar la notificación: enfocar una pestaña abierta o abrir una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || '/foro'
  event.waitUntil(
    (async () => {
      const lista = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // Si ya hay una ventana de la app abierta: enfócala y pídele al router que
      // navegue al foro (instantáneo, sin recargar toda la app).
      for (const c of lista) {
        if ('focus' in c) {
          await c.focus()
          c.postMessage({ tipo: 'navegar', url: destino })
          return
        }
      }
      // Si no hay ninguna abierta: abre la app directamente en el foro.
      if (clients.openWindow) await clients.openWindow(destino)
    })(),
  )
})
