// src/data/categoriasReels.js
// Categorías de la COMUNIDAD GLOBAL de Reels. Son propias de Reels y distintas
// a las de Videos del entrenador (categoriasContenido.js). Al subir un Reel,
// elegir una de estas es OBLIGATORIO, para que el feed se pueda explorar/filtrar.

export const CATEGORIAS_REELS = [
  { value: 'rutinas', label: 'Rutinas de entrenamiento' },
  { value: 'ejercicios_musculo', label: 'Ejercicios por músculo' },
  { value: 'maquinas', label: 'Videos de máquinas' },
  { value: 'nutricion', label: 'Alimentación y nutrición' },
  { value: 'transformaciones', label: 'Transformaciones y progreso' },
  { value: 'principiantes', label: 'Consejos para principiantes' },
  { value: 'retos', label: 'Retos del gimnasio' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'salud_descanso', label: 'Salud, descanso y recuperación' },
  { value: 'suplementos', label: 'Suplementos y productos del gym' },
  { value: 'motivacion', label: 'Motivación diaria' },
  { value: 'dudas', label: 'Dudas y preguntas' },
  { value: 'eventos', label: 'Eventos y avisos' },
  { value: 'companero', label: 'Compañero de entrenamiento' },
  { value: 'logros', label: 'Logros de miembros' },
]

const PORVALUE = Object.fromEntries(CATEGORIAS_REELS.map((c) => [c.value, c.label]))

// Etiqueta legible de una categoría por su value.
export function categoriaReelLabel(value) {
  if (!value) return 'General'
  return PORVALUE[value] || value
}
