// Estado global del menú lateral (drawer).
// Lo comparten el botón "Menú" del nav inferior y el componente MenuDrawer,
// por eso el ref vive FUERA de la función (singleton entre componentes).
import { ref } from 'vue'

const abierto = ref(false)

export function useDrawer() {
  function abrir() {
    abierto.value = true
  }
  function cerrar() {
    abierto.value = false
  }
  function alternar() {
    abierto.value = !abierto.value
  }
  return { abierto, abrir, cerrar, alternar }
}
