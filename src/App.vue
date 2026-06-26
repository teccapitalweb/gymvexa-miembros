<script setup>
// Raíz de la app: muestra la pantalla actual del router.
// La barra de navegación inferior solo aparece en pantallas protegidas.
import { useRoute } from 'vue-router'
import { computed, watch } from 'vue'
import BottomNav from './components/BottomNav.vue'
import TopBar from './components/TopBar.vue'
import MenuDrawer from './components/MenuDrawer.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import PushSoftAsk from './components/PushSoftAsk.vue'
import { useSocioStore } from './stores/socio'
import { iniciarAvisosForo, detenerAvisosForo } from './composables/useForoNuevos'

const route = useRoute()
const mostrarNav = computed(() => !route.meta.publica && !route.meta.ocultarNav)

// Detector del puntito "hay publicaciones nuevas" en la pestaña Foro: arranca
// cuando el socio queda vinculado (ya hay gymId) y se detiene al cerrar sesión.
const socio = useSocioStore()
watch(
  () => socio.gymId,
  (gymId) => {
    if (gymId) iniciarAvisosForo(gymId)
    else detenerAvisosForo()
  },
  { immediate: true },
)
</script>

<template>
  <TopBar v-if="mostrarNav" />
  <router-view v-slot="{ Component, route }">
    <transition name="page" mode="out-in">
      <component :is="Component" :key="route.name" />
    </transition>
  </router-view>
  <BottomNav v-if="mostrarNav" />
  <MenuDrawer v-if="mostrarNav" />
  <!-- Soft-ask de notificaciones: solo en zona logueada; él decide cuándo salir. -->
  <PushSoftAsk v-if="mostrarNav" />
  <!-- El banner de instalación se oculta en /instalar para no duplicar el botón
       grande de esa página; en el resto de rutas funciona igual que siempre. -->
  <InstallPrompt v-if="route.name !== 'instalar'" />
</template>
