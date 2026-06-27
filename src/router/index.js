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
    // Pantalla pública "Instala la app": pensada para llegar por QR pegado en el
    // gym. No requiere login (alguien que aún no es socio puede instalar la PWA).
    path: '/instalar',
    name: 'instalar',
    component: () => import('../views/InstalarView.vue'),
    meta: { publica: true },
  },
  {
    // Pantalla "Vincula tu cuenta": requiere sesión pero NO requiere el claim de
    // socio (es justo donde se obtiene). Acepta el deep link /vincular?c=CODIGO.
    path: '/vincular',
    name: 'vincular',
    component: () => import('../views/VincularView.vue'),
    meta: { requiereLogin: true, ocultarNav: true },
  },
  {
    path: '/inicio',
    name: 'inicio',
    component: () => import('../views/InicioView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/checkin',
    name: 'checkin',
    component: () => import('../views/CheckinView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('../views/PerfilView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/videos',
    name: 'videos',
    component: () => import('../views/VideosView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/material',
    name: 'material',
    component: () => import('../views/MaterialView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/calculadora',
    name: 'calculadora',
    component: () => import('../views/CalculadoraView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/rutinas',
    name: 'rutinas',
    component: () => import('../views/RutinasView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/progreso',
    name: 'progreso',
    component: () => import('../views/ProgresoView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/foro',
    name: 'foro',
    component: () => import('../views/ForoView.vue'),
    meta: { requiereSocio: true },
  },
  {
    path: '/reels',
    name: 'reels',
    component: () => import('../views/ReelsView.vue'),
    meta: { requiereSocio: true },
  },
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

  const necesitaSesion = to.meta.requiereSocio || to.meta.requiereLogin

  // Ruta que requiere sesión y no hay sesión -> al login.
  // Se preserva el destino COMPLETO (incl. ?c=CODIGO) para retomarlo tras entrar.
  if (necesitaSesion && !authStore.estaLogueado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Logueado pero SIN claim de socio en una ruta que lo exige -> a vincular.
  if (to.meta.requiereSocio && !authStore.tieneClaimSocio) {
    return { name: 'vincular' }
  }

  // Si ya está vinculado y va a /vincular, no tiene nada que hacer ahí -> a inicio.
  if (to.name === 'vincular' && authStore.estaLogueado && authStore.tieneClaimSocio) {
    return { name: 'inicio' }
  }

  // Si ya hay sesión y va al login, mándalo a inicio o a vincular según su claim.
  if (to.name === 'login' && authStore.estaLogueado) {
    return authStore.tieneClaimSocio ? { name: 'inicio' } : { name: 'vincular' }
  }

  return true
})

export default router
