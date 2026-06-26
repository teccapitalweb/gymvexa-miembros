<script setup>
// SOFT-ASK de notificaciones: nuestro propio mensaje ANTES del cuadro nativo del
// navegador. Así no quemamos el permiso (que es de una sola oportunidad): el cuadro
// real solo aparece si el socio toca "Activar".
//
// Aparece UNA vez, cuando:
//   - el socio ya está vinculado a su gym,
//   - el dispositivo soporta push (en iOS: solo dentro de la PWA instalada),
//   - el permiso del navegador sigue sin decidirse ('default'),
//   - y no lo hemos mostrado antes.
// Quien diga "Ahora no" puede activarlo después desde Mi Perfil.
import { ref, watch, onMounted } from 'vue'
import { useSocioStore } from '../stores/socio'
import {
  pushSoportado,
  permisoActual,
  yaPreguntado,
  marcarPreguntado,
  activarPush,
} from '../composables/usePush'

const socio = useSocioStore()
const visible = ref(false)
const trabajando = ref(false)

async function evaluar() {
  if (visible.value || yaPreguntado()) return
  if (!socio.estaVinculado) return
  if (permisoActual() !== 'default') return
  if (!(await pushSoportado())) return
  // Pequeña espera para no aparecer encima de la animación de "cuenta vinculada".
  setTimeout(() => {
    if (!yaPreguntado() && permisoActual() === 'default' && socio.estaVinculado) {
      visible.value = true
    }
  }, 1200)
}

async function activar() {
  if (trabajando.value) return
  trabajando.value = true
  marcarPreguntado()
  await activarPush()
  trabajando.value = false
  visible.value = false
}

function ahoraNo() {
  marcarPreguntado()
  visible.value = false
}

onMounted(evaluar)
watch(() => socio.estaVinculado, (v) => { if (v) evaluar() })
</script>

<template>
  <transition name="soft">
    <div v-if="visible" class="soft" role="dialog" aria-modal="true" aria-label="Activar notificaciones">
      <div class="soft__backdrop" @click="ahoraNo"></div>
      <div class="soft__card">
        <span class="soft__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </span>
        <h2 class="soft__title">Activa las notificaciones</h2>
        <p class="soft__text">
          Entérate al instante de avisos, promociones y descuentos que publique tu gimnasio,
          aunque no tengas la app abierta.
        </p>
        <div class="soft__actions">
          <button class="soft__btn soft__btn--primary" :disabled="trabajando" @click="activar">
            {{ trabajando ? 'Activando…' : 'Activar' }}
          </button>
          <button class="soft__btn soft__btn--ghost" :disabled="trabajando" @click="ahoraNo">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.soft {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.soft__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(3, 7, 18, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.soft__card {
  position: relative;
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 28px 24px 22px;
  border-radius: var(--r-lg, 20px);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-card), 0 0 0 1px var(--accent-soft);
}
.soft__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  color: #fff;
  background: var(--grad-firma);
  box-shadow: 0 10px 26px var(--accent-glow);
  margin-bottom: 2px;
}
.soft__title {
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.soft__text {
  color: var(--text-dim);
  font-size: 0.92rem;
  line-height: 1.45;
}
.soft__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}
.soft__btn {
  width: 100%;
  padding: 13px 18px;
  border-radius: var(--r-sm, 12px);
  font-weight: 700;
  font-size: 0.95rem;
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.soft__btn:disabled {
  opacity: 0.65;
}
.soft__btn--primary {
  color: #fff;
  background: linear-gradient(135deg, var(--cyan) -10%, var(--accent-bright) 35%, var(--accent-deep) 110%);
  box-shadow: 0 8px 22px var(--accent-glow);
}
.soft__btn--primary:not(:disabled):active {
  transform: translateY(1px) scale(0.985);
}
.soft__btn--ghost {
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--border-soft);
}
.soft__btn--ghost:not(:disabled):active {
  transform: translateY(1px) scale(0.985);
}

.soft-enter-active,
.soft-leave-active {
  transition: opacity 0.25s ease;
}
.soft-enter-active .soft__card,
.soft-leave-active .soft__card {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
}
.soft-enter-from,
.soft-leave-to {
  opacity: 0;
}
.soft-enter-from .soft__card,
.soft-leave-to .soft__card {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
