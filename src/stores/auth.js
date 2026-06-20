// Store de autenticación del socio (Pinia).
// Maneja sesión con correo/contraseña y con Google (popup).
// Los datos del socio en Firestore se consultarán en el siguiente paso.

import { defineStore } from 'pinia'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,        // objeto user de Firebase (o null)
    cargando: false,   // true mientras se procesa un login/logout
    authReady: false,  // true cuando onAuthStateChanged ya respondió 1ª vez
  }),

  getters: {
    estaLogueado: (state) => !!state.user,
    uid: (state) => state.user?.uid ?? null,
    correo: (state) => state.user?.email ?? null,
  },

  actions: {
    // Suscribe el estado de sesión. Se llama una vez al iniciar la app.
    init() {
      onAuthStateChanged(auth, (user) => {
        this.user = user
        this.authReady = true
      })
    },

    async loginCorreo(correo, contrasena) {
      this.cargando = true
      try {
        const cred = await signInWithEmailAndPassword(auth, correo, contrasena)
        this.user = cred.user
        return cred.user
      } finally {
        this.cargando = false
      }
    },

    async loginGoogle() {
      this.cargando = true
      try {
        const cred = await signInWithPopup(auth, googleProvider)
        this.user = cred.user
        return cred.user
      } finally {
        this.cargando = false
      }
    },

    async logout() {
      this.cargando = true
      try {
        await signOut(auth)
        this.user = null
      } finally {
        this.cargando = false
      }
    },
  },
})
