// Composable de tema (día / noche).
// - Guarda la preferencia del usuario en localStorage para recordarla entre visitas.
// - Aplica el atributo data-theme="light" en <html> (la noche es el valor por defecto).
// - Ajusta el meta theme-color para que la barra del navegador móvil combine.
import { ref } from 'vue'

const STORAGE_KEY = 'gv-tema'

// Estado compartido a nivel de módulo (singleton): todas las pantallas leen el mismo.
const tema = ref('dark')

// Color de la barra del navegador móvil según el tema (debe coincidir con --bg).
const THEME_COLOR = { dark: '#081225', light: '#f4f7fb' }

function aplicar(valor) {
  const root = document.documentElement
  if (valor === 'light') root.setAttribute('data-theme', 'light')
  else root.removeAttribute('data-theme')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[valor] || THEME_COLOR.dark)
}

// Cambia el tema SIN animar: neutraliza las transiciones solo durante el instante
// del toggle (clase `tema-cambiando` en <html>) y las restaura al frame siguiente.
// Evita el tirón de animar el color de las superficies grandes bajo las capas con
// backdrop-filter; las transiciones normales (hover, focus, página) quedan intactas.
function aplicarSinAnimar(valor) {
  const root = document.documentElement
  root.classList.add('tema-cambiando')
  aplicar(valor)
  // Doble requestAnimationFrame: el cambio de color se pinta con las transiciones
  // ya desactivadas, y solo después (frame siguiente) volvemos a habilitarlas.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('tema-cambiando')
    })
  })
}

// Se llama UNA vez al arrancar (en main.js), antes de montar, para evitar parpadeo.
export function initTema() {
  let guardado = null
  try {
    guardado = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* localStorage no disponible: usamos el valor por defecto */
  }
  tema.value = guardado === 'light' ? 'light' : 'dark'
  aplicar(tema.value)
}

export function useTema() {
  function toggle() {
    tema.value = tema.value === 'light' ? 'dark' : 'light'
    aplicarSinAnimar(tema.value)
    try {
      localStorage.setItem(STORAGE_KEY, tema.value)
    } catch {
      /* si no se puede guardar, el cambio igual aplica en esta sesión */
    }
  }
  return { tema, toggle }
}
