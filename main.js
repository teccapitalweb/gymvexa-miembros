import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/styles/main.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { initTema } from './composables/useTema'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Aplica el tema guardado (día/noche) antes de montar, para evitar parpadeo.
initTema()

// Arranca la suscripción al estado de sesión antes de montar el router,
// para que el guard pueda esperar a authReady.
useAuthStore().init()

app.use(router)
app.mount('#app')

// Registra el service worker (PWA) solo en producción, para no interferir con
// el HMR de Vite en desarrollo. Hace la app instalable y de carga rápida.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('No se pudo registrar el service worker:', e)
    })
  })
}
