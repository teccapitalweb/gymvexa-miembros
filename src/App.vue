<script setup>
// Raíz de la app: muestra la pantalla actual del router.
// La barra de navegación inferior solo aparece en pantallas protegidas.
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import BottomNav from './components/BottomNav.vue'
import TopBar from './components/TopBar.vue'
import MenuDrawer from './components/MenuDrawer.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const route = useRoute()
const mostrarNav = computed(() => !route.meta.publica && !route.meta.ocultarNav)
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
  <InstallPrompt />
</template>
