// src/data/categoriasContenido.js
// Etiquetas legibles de las categorías de contenido (videos y materiales).
// Debe coincidir con el catálogo del panel (gymteck) donde el staff las crea.

export const CATEGORIAS_CONTENIDO = [
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'piernas', label: 'Piernas' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'brazos', label: 'Brazos' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'movilidad', label: 'Movilidad' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'principiantes', label: 'Principiantes' },
  { value: 'general', label: 'General' },
]

const PORVALUE = Object.fromEntries(
  CATEGORIAS_CONTENIDO.map((c) => [c.value, c.label])
)

// Etiqueta legible de una categoría. Si es estándar usa su label; si es propia
// (creada al vuelo en el panel) reconstruye una versión bonita del value.
export function categoriaLabel(value) {
  if (!value) return 'General'
  if (PORVALUE[value]) return PORVALUE[value]
  const t = String(value).replace(/_/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
