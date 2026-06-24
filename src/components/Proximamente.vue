<script setup>
// Tarjeta "Muy pronto" — estilo BioNova. La reutilizan las pantallas que
// todavía no tienen contenido real (Videos, Material, Calculadora, Foro).
defineProps({
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  features: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="proxi card">
    <span class="proxi__halo" aria-hidden="true"></span>
    <span class="proxi__icon"><slot name="icon" /></span>
    <span class="proxi__badge">Muy pronto</span>
    <h2 class="proxi__title">{{ titulo }}</h2>
    <p class="proxi__text" v-if="descripcion">{{ descripcion }}</p>

    <ul class="proxi__list" v-if="features.length">
      <li v-for="(f, i) in features" :key="i" class="proxi__feat">
        <span class="proxi__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span>{{ f }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.proxi {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 34px 24px 30px;
}
.proxi__halo {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-soft), transparent 70%);
  opacity: 0.7;
  pointer-events: none;
}
.proxi__icon {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--line);
  margin-bottom: 18px;
}
.proxi__icon :deep(svg) { width: 36px; height: 36px; }

.proxi__badge {
  position: relative;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 5px 12px;
  border-radius: var(--r-pill);
  margin-bottom: 12px;
}
.proxi__title {
  position: relative;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0 0 8px;
}
.proxi__text {
  position: relative;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-dim);
  max-width: 30ch;
  margin: 0 0 18px;
}

.proxi__list {
  position: relative;
  width: 100%;
  max-width: 320px;
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}
.proxi__feat {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 11px 13px;
}
.proxi__check {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--success);
}
.proxi__check svg { width: 13px; height: 13px; }
</style>
