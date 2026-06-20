// Router de la App de Miembros (historial web).
// Rutas iniciales: /login (pública) y /inicio (protegida).

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/inicio' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { publica: true },
  },
  {
    path: '/inicio',
    name: 'inicio',
    component: () => import('../views/InicioView.vue'),
    meta: { requiereSocio: true },
  },
  // Las siguientes pantallas (check-in, perfil) se construyen en el próximo paso.
  { path: '/:pathMatch(.*)*', redirect: '/inicio' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Espera a que Firebase resuelva el estado de sesión la primera vez,
// para no rebotar a /login antes de saber si hay socio logueado.
function esperarAuthReady(authStore) {
  return new Promise((resolve) => {
    if (authStore.authReady) return resolve()
    const stop = authStore.$subscribe((_mutation, state) => {
      if (state.authReady) {
        stop()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await esperarAuthReady(authStore)

  // Ruta protegida sin sesión -> al login.
  if (to.meta.requiereSocio && !authStore.estaLogueado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Si ya hay sesión y va al login, mándalo a inicio.
  if (to.name === 'login' && authStore.estaLogueado) {
    return { name: 'inicio' }
  }

  return true
})

export default router
