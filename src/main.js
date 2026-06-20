import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/styles/main.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Arranca la suscripción al estado de sesión antes de montar el router,
// para que el guard pueda esperar a authReady.
useAuthStore().init()

app.use(router)
app.mount('#app')
