<script setup>
import ThemeToggle from '../components/ThemeToggle.vue'
import Proximamente from '../components/Proximamente.vue'
</script>

<template>
  <main class="screen screen--with-nav">
    <ThemeToggle />
    <header class="vista-head">
      <h1 class="vista-title">Videos</h1>
      <p class="vista-sub">Rutinas y técnica en video, directo de tu gym.</p>
    </header>

    <Proximamente
      titulo="Tus videos, muy pronto"
      descripcion="Aquí vas a ver los videos que tu gimnasio suba: rutinas guiadas, técnica de ejercicios y tips de tus entrenadores."
      :features="[
        'Rutinas explicadas paso a paso',
        'Técnica correcta de cada ejercicio',
        'Contenido nuevo cada semana',
      ]"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M10.3 8.7v6.6l5.4-3.3z" />
        </svg>
      </template>
    </Proximamente>
  </main>
</template>
