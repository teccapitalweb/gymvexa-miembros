// src/data/portadasCategorias.js
// Portada visual por categoría: una FOTO real (Unsplash, uso libre) que se
// asigna automáticamente según la categoría del video/material — igual para
// todos los de esa categoría (consistencia tipo BioNova).
// El degradado queda como respaldo por si la foto no carga.

const U = 'https://images.unsplash.com/photo-'
const Q = '?auto=format&fit=crop&w=700&q=70'

// foto = imagen de fondo; grad = respaldo de color si la foto no carga.
export const PORTADAS = {
  pecho: { foto: U + '1605296867304-46d5465a13f1' + Q, grad: ['#fb7185', '#e11d48'] },
  espalda: { foto: U + '1577221084712-45b0445d2b00' + Q, grad: ['#60a5fa', '#1d4ed8'] },
  piernas: { foto: U + '1434608519344-49d77a699e1d' + Q, grad: ['#a78bfa', '#6d28d9'] },
  gluteos: { foto: U + '1599058917212-d750089bc07e' + Q, grad: ['#f472b6', '#be185d'] },
  hombros: { foto: U + '1517836357463-d25dfeac3438' + Q, grad: ['#fbbf24', '#ea580c'] },
  brazos: { foto: U + '1581009146145-b5ef050c2e1e' + Q, grad: ['#22d3ee', '#0891b2'] },
  abdomen: { foto: U + '1550345332-09e3ac987658' + Q, grad: ['#34d399', '#059669'] },
  cardio: { foto: U + '1571008887538-b36bb32f4571' + Q, grad: ['#fb7185', '#db2777'] },
  hiit: { foto: U + '1548690312-e3b507d8c110' + Q, grad: ['#fcd34d', '#f59e0b'] },
  fuerza: { foto: U + '1526506118085-60ce8714f8c5' + Q, grad: ['#3b82f6', '#1e3a8a'] },
  funcional: { foto: U + '1607962837359-5e7e89f86776' + Q, grad: ['#2dd4bf', '#0d9488'] },
  movilidad: { foto: U + '1506126613408-eca07ce68773' + Q, grad: ['#c084fc', '#7c3aed'] },
  yoga: { foto: U + '1544367567-0f2fcb009e0b' + Q, grad: ['#d8b4fe', '#9333ea'] },
  nutricion: { foto: U + '1512621776951-a57141f2eefd' + Q, grad: ['#a3e635', '#65a30d'] },
  principiantes: { foto: U + '1526506118085-60ce8714f8c5' + Q, grad: ['#5eead4', '#0d9488'] },
  general: { foto: U + '1607962837359-5e7e89f86776' + Q, grad: ['#38bdf8', '#0369a1'] },
}

// Portada de respaldo para categorías propias (creadas al vuelo en el panel):
// foto genérica de gym + degradado azul.
const PORTADA_DEFAULT = {
  foto: U + '1526506118085-60ce8714f8c5' + Q,
  grad: ['#38bdf8', '#0369a1'],
}

export function portadaDe(categoria) {
  return PORTADAS[categoria] || PORTADA_DEFAULT
}

// URL de la foto de portada de una categoría.
export function fotoPortada(categoria) {
  return portadaDe(categoria).foto
}

// CSS del degradado de respaldo de una categoría (para usar en :style).
export function gradientePortada(categoria) {
  const p = portadaDe(categoria)
  return `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`
}
