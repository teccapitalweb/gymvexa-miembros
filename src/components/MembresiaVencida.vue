<script setup>
// Aviso reutilizable "membresía vencida". Se muestra cuando un socio con la
// membresía NO vigente intenta entrar al foro o a los reels (bloqueo total de
// esas secciones). Se usa de dos formas:
//  - como VISTA del router (destino al que el guard manda a los vencidos), y
//  - INLINE dentro de ForoView/ReelsView (red de seguridad si el guard no alcanzó
//    a bloquear porque la ficha del socio cargó después de montar la vista).
// El botón lleva al perfil, donde vive la membresía y el pago/renovación.
import { useRouter } from 'vue-router'

const router = useRouter()

function irAMiMembresia() {
  router.push('/perfil')
}
</script>

<template>
  <main class="screen screen--with-nav mv">
    <section class="mv__card card">
      <span class="mv__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="5" width="16" height="16" rx="3" />
          <path d="M4 10h16" />
          <path d="M8 3v4M16 3v4" />
          <path d="m9.5 14.5 5 3M14.5 14.5l-5 3" />
        </svg>
      </span>

      <h1 class="mv__title">Tu membresía está vencida</h1>
      <p class="mv__text">
        Renueva tu membresía para acceder a la comunidad (foro y reels). El resto
        de la app sigue disponible para ti.
      </p>

      <button type="button" class="mv__btn" @click="irAMiMembresia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 7h18v12H3z" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
        <span>Ver mi membresía</span>
      </button>
    </section>
  </main>
</template>

<style scoped>
.mv {
  justify-content: center;
  align-items: center;
}
.mv__card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 32px 24px;
}
.mv__icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: var(--r-lg);
  color: var(--accent-bright, var(--accent));
  background: var(--accent-soft);
}
.mv__icon svg { width: 36px; height: 36px; }
.mv__title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--text);
  line-height: 1.2;
}
.mv__text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-dim);
  max-width: 32ch;
}
.mv__btn {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 22px;
  border-radius: var(--r-pill);
  border: none;
  color: #fff;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.92rem;
  background: var(--grad-firma);
  box-shadow: 0 6px 16px var(--accent-glow);
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.18s ease;
}
.mv__btn:active { transform: scale(0.97); opacity: 0.94; }
.mv__btn svg { width: 19px; height: 19px; }
</style>
