// src/composables/useVideoEmbed.js
// Convierte un enlace de video (YouTube / Vimeo / Google Drive) en una URL
// embebible para iframe, y obtiene su miniatura cuando es posible.
// La parte de Drive replica la lógica del visor de BioNova; se añadió YouTube y
// Vimeo, que son los formatos más comunes para clases de gym.

// Origen del enlace (para etiquetas e íconos).
export function tipoDeUrl(url) {
  const u = String(url || '').toLowerCase()
  if (!u) return 'otro'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('vimeo.com')) return 'vimeo'
  if (u.includes('drive.google.com') || u.includes('docs.google.com')) return 'drive'
  return 'otro'
}

// Extrae el ID de un video de YouTube en sus formas más comunes.
export function youtubeId(url) {
  const u = String(url || '')
  const patrones = [
    /[?&]v=([a-zA-Z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([a-zA-Z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([a-zA-Z0-9_-]{11})/, // /shorts/ID
  ]
  for (const re of patrones) {
    const m = u.match(re)
    if (m) return m[1]
  }
  return null
}

// Extrae el ID numérico de un video de Vimeo.
export function vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

// Devuelve la URL lista para meter en un <iframe>.
export function urlAEmbed(url) {
  if (!url) return ''
  const u = String(url).trim()

  const yt = youtubeId(u)
  if (yt) return `https://www.youtube.com/embed/${yt}?rel=0`

  const vm = vimeoId(u)
  if (vm) return `https://player.vimeo.com/video/${vm}`

  // Google Drive: open?id= → /file/d/ID/preview
  if (u.includes('drive.google.com/open?id=')) {
    const id = u.split('id=')[1].split('&')[0]
    return `https://drive.google.com/file/d/${id}/preview`
  }
  // Drive / Docs: /view o /edit → /preview
  if (u.includes('drive.google.com') || u.includes('docs.google.com')) {
    return u
      .replace(/\/view(\?.*)?$/, '/preview')
      .replace(/\/edit(\?.*)?$/, '/preview')
      .replace(/\/edit$/, '/preview')
  }

  // Cualquier otro enlace: se intenta embeber tal cual.
  return u
}

// Miniatura del video (solo YouTube la expone por URL directa). Para los demás
// devolvemos null y la tarjeta usa un fondo degradado con ícono de play.
export function miniaturaDe(url) {
  const yt = youtubeId(url)
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`
  return null
}
