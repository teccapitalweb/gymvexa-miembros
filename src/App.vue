<script setup>
// Raíz de la app: muestra la pantalla actual del router.
// La barra de navegación inferior solo aparece en pantallas protegidas.
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import BottomNav from './components/BottomNav.vue'

const route = useRoute()
const mostrarNav = computed(() => !route.meta.publica)
</script>

<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
  <BottomNav v-if="mostrarNav" />
</template>
