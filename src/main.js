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

// Login con Google por redirect: procesamos el RETORNO de Google ANTES de montar
// el router. Así, cuando corra el primer guard, la sesión (si getRedirectResult
// trajo user) YA está establecida -> el guard de /login mueve al usuario a
// inicio/vincular, en vez de dejarlo atorado en el login por una carrera con el
// router. NO tragamos errores: procesarRedirectGoogle deja rastro (console.error +
// errorRedirect) que LoginView muestra si el redirect falló (p. ej. getRedirectResult
// null por bloqueo de storage en móvil/PWA).
let destinoPostLogin = null
try {
  destinoPostLogin = await useAuthStore().procesarRedirectGoogle()
} catch (e) {
  // Fallo inesperado (no el null esperado): lo dejamos visible para diagnóstico.
  console.error('[login] Fallo inesperado procesando el redirect de Google:', e)
}

app.use(router)
app.mount('#app')

// Si veníamos de Google con la sesión ya completada, vamos al destino guardado.
if (destinoPostLogin) router.replace(destinoPostLogin)

// Registra el service worker (PWA) solo en producción, para no interferir con
// el HMR de Vite en desarrollo. Hace la app instalable y de carga rápida.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('No se pudo registrar el service worker:', e)
    })
  })
}

// Cuando se toca una notificación push y la app YA está abierta, el service
// worker nos pide navegar (p. ej. al foro). Lo hacemos con el router de Vue:
// es instantáneo y no recarga toda la app.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data || {}
    if (msg.tipo === 'navegar' && msg.url) {
      router.push(msg.url).catch(() => {})
    }
  })
}
