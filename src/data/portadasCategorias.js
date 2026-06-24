// src/data/portadasCategorias.js
// Portada visual por categoría: una imagen PROPIA self-hosteada en
// public/portadas/{categoria}.webp. Se sirve desde el MISMO origen (CDN de
// Vercel) y el service worker la cachea -> carga instantánea, incluso offline.
//
// Antes se hotlinkeaban de Unsplash (images.unsplash.com) en vivo: en redes
// lentas (el wifi del gym) esas peticiones se colgaban y la tarjeta se veía
// como un recuadro blanco por minutos. Con la imagen local eso se elimina.
//
// El degradado queda como respaldo del color si la imagen no cargara.

// Color de marca por categoría (respaldo del degradado y base de la portada).
const GRADS = {
  pecho: ['#fb7185', '#e11d48'],
  espalda: ['#60a5fa', '#1d4ed8'],
  piernas: ['#a78bfa', '#6d28d9'],
  gluteos: ['#f472b6', '#be185d'],
  hombros: ['#fbbf24', '#ea580c'],
  brazos: ['#22d3ee', '#0891b2'],
  abdomen: ['#34d399', '#059669'],
  cardio: ['#fb7185', '#db2777'],
  hiit: ['#fcd34d', '#f59e0b'],
  fuerza: ['#3b82f6', '#1e3a8a'],
  funcional: ['#2dd4bf', '#0d9488'],
  movilidad: ['#c084fc', '#7c3aed'],
  yoga: ['#d8b4fe', '#9333ea'],
  nutricion: ['#a3e635', '#65a30d'],
  principiantes: ['#5eead4', '#0d9488'],
  general: ['#38bdf8', '#0369a1'],
}

// Categoría con portada propia, o "general" para las creadas al vuelo en el
// panel (que no tienen imagen dedicada).
function claveConPortada(categoria) {
  return GRADS[categoria] ? categoria : 'general'
}

// Objeto de portada { foto, grad } de una categoría.
export function portadaDe(categoria) {
  const k = claveConPortada(categoria)
  return { foto: `/portadas/${k}.webp`, grad: GRADS[k] }
}

// URL de la foto de portada (local, mismo origen). Ej: /portadas/pecho.webp
export function fotoPortada(categoria) {
  return portadaDe(categoria).foto
}

// CSS del degradado de respaldo de una categoría (para usar en :style).
export function gradientePortada(categoria) {
  const g = GRADS[claveConPortada(categoria)]
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`
}
