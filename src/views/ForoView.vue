<script setup>
import Proximamente from '../components/Proximamente.vue'
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Foro</h1>
      <p class="vista-sub">La comunidad de tu gimnasio, en un solo lugar.</p>
    </header>

    <Proximamente
      titulo="El foro llega pronto"
      descripcion="Comparte tus avances, sube fotos, haz preguntas y motívate con los demás socios de tu gimnasio."
      :features="[
        'Publica y comenta con la comunidad',
        'Comparte fotos de tus avances',
        'Resuelve dudas con otros socios',
      ]"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.5 11.3a7.5 7.5 0 0 1-10.6 6.83L4 20l1.67-5.9A7.5 7.5 0 1 1 20.5 11.3z" />
          <path d="M9 10.5h6.5M9 13.5h4" />
        </svg>
      </template>
    </Proximamente>
  </main>
</template>
