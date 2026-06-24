<script setup>
import Proximamente from '../components/Proximamente.vue'
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Material</h1>
      <p class="vista-sub">Guías y documentos de tu gimnasio.</p>
    </header>

    <Proximamente
      titulo="Material en camino"
      descripcion="Tu gimnasio podrá compartirte rutinas y guías de alimentación según tu objetivo: subir masa, bajar de peso o mantenerte."
      :features="[
        'Rutinas por objetivo',
        'Guías de alimentación en PDF',
        'Material descargable a tu teléfono',
      ]"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      </template>
    </Proximamente>
  </main>
</template>
