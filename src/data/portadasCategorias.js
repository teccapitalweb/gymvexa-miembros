// src/data/portadasCategorias.js
// Portada visual por categoría: un degradado propio + un ícono temático.
// Se asigna automáticamente según la categoría del video/material, igual para
// todos los de esa categoría (consistencia visual tipo BioNova).

// --- Íconos (SVG line, heredan color con currentColor) ---
const I_DUMBBELL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11"/></svg>'
const I_HEART =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-6.5-4.2-9-8.3C1.2 8.3 3 5 6.2 5c1.9 0 3.1 1.1 3.8 2.1C10.7 6.1 11.9 5 13.8 5 17 5 18.8 8.3 17 11.7 14.5 15.8 12 20 12 20z"/></svg>'
const I_BOLT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 5 13h6l-1 8 8-11h-6z"/></svg>'
const I_BARBELL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10"/></svg>'
const I_KETTLEBELL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 7.5a2.5 2.5 0 1 1 5 0"/><path d="M8.8 7.8C7 9 6 11.3 6 14a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4c0-2.7-1-5-2.8-6.2"/></svg>'
const I_STRETCH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1.6"/><path d="M9 7v4l-2 5M9 11l4-1 3 3"/></svg>'
const I_LOTUS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2"/><path d="M12 8.5c-3 1.5-5 3.5-5 6.5M12 8.5c3 1.5 5 3.5 5 6.5M6 15h12"/></svg>'
const I_APPLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-1-2 0-4 2.5-4.5"/><path d="M12 8c-2.5-1.5-5 0-5.5 3.5C6 15 8 20 12 20s6-5 5.5-8.5C17 8 14.5 6.5 12 8z"/></svg>'
const I_STAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4 2.3 4.6 5.1.7-3.7 3.6.9 5.1L12 19.2 7.4 18.6l.9-5.1-3.7-3.6 5.1-.7z"/></svg>'
const I_CORE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="3"/><path d="M9 9h6M9 12h6M9 15h6"/></svg>'

// --- Mapa de portadas: degradado (2 tonos) + ícono por categoría ---
export const PORTADAS = {
  pecho: { grad: ['#fb7185', '#e11d48'], icon: I_DUMBBELL },
  espalda: { grad: ['#60a5fa', '#1d4ed8'], icon: I_DUMBBELL },
  piernas: { grad: ['#a78bfa', '#6d28d9'], icon: I_DUMBBELL },
  gluteos: { grad: ['#f472b6', '#be185d'], icon: I_DUMBBELL },
  hombros: { grad: ['#fbbf24', '#ea580c'], icon: I_DUMBBELL },
  brazos: { grad: ['#22d3ee', '#0891b2'], icon: I_DUMBBELL },
  abdomen: { grad: ['#34d399', '#059669'], icon: I_CORE },
  cardio: { grad: ['#fb7185', '#db2777'], icon: I_HEART },
  hiit: { grad: ['#fcd34d', '#f59e0b'], icon: I_BOLT },
  fuerza: { grad: ['#3b82f6', '#1e3a8a'], icon: I_BARBELL },
  funcional: { grad: ['#2dd4bf', '#0d9488'], icon: I_KETTLEBELL },
  movilidad: { grad: ['#c084fc', '#7c3aed'], icon: I_STRETCH },
  yoga: { grad: ['#d8b4fe', '#9333ea'], icon: I_LOTUS },
  nutricion: { grad: ['#a3e635', '#65a30d'], icon: I_APPLE },
  principiantes: { grad: ['#5eead4', '#0d9488'], icon: I_STAR },
  general: { grad: ['#38bdf8', '#0369a1'], icon: I_BARBELL },
}

// Portada de respaldo para categorías propias (creadas al vuelo en el panel).
const PORTADA_DEFAULT = { grad: ['#38bdf8', '#0369a1'], icon: I_BARBELL }

export function portadaDe(categoria) {
  return PORTADAS[categoria] || PORTADA_DEFAULT
}

// CSS del degradado de una categoría (para usar en :style).
export function gradientePortada(categoria) {
  const p = portadaDe(categoria)
  return `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`
}
