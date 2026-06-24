<script setup>
import Proximamente from '../components/Proximamente.vue'
</script>

<template>
  <main class="screen screen--with-nav">
    <header class="vista-head">
      <h1 class="vista-title">Calculadora corporal</h1>
      <p class="vista-sub">Tus números clave, al instante.</p>
    </header>

    <Proximamente
      titulo="Calculadora muy pronto"
      descripcion="Con tu peso, estatura y objetivo, calcula al momento tu IMC, la proteína y el agua que necesitas al día."
      :features="[
        'Índice de masa corporal (IMC)',
        'Proteína diaria recomendada',
        'Agua diaria según tu peso',
      ]"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h7" />
        </svg>
      </template>
    </Proximamente>
  </main>
</template>
