// Helper de dinero. En Firestore el dinero se guarda en CENTAVOS (enteros).
// Para mostrar, dividimos entre 100 y formateamos como MXN.

const formateadorMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})

// centavos (entero) -> "$1,234.56". Tolera null/undefined/NaN -> "$0.00".
export function centavosAPesos(centavos) {
  const n = Number(centavos)
  const pesos = Number.isFinite(n) ? n / 100 : 0
  return formateadorMXN.format(pesos)
}

export function useDinero() {
  return { centavosAPesos }
}
