// Generador de íconos PWA para Gymvexa Socios — SIN dependencias.
// Dibuja la mancuerna de la marca (misma del login/nav) sobre el gradiente
// neón (cyan -> azul) y exporta PNG 192/512, maskable 512 y apple-touch 180.
//
// Uso: node scripts/generate-icons.mjs
// Regenera los PNG en public/icons/. No requiere ImageMagick ni sharp.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// ----------------------------- PNG mínimo -----------------------------
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ----------------------------- Color / SDF -----------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lerp = (a, b, t) => a + (b - a) * t
const lerpC = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]

// Colores reales del diseño (oscuro-neón).
const CYAN = hex('#38bdf8')
const BRIGHT = hex('#5b9bff')
const DEEP = hex('#2563eb')
const WHITE = hex('#f4f8ff')

// Gradiente diagonal (arriba-izq cyan -> abajo-der azul profundo).
function bgColor(u, v) {
  const t = (u + v) / 2
  return t < 0.45 ? lerpC(CYAN, BRIGHT, t / 0.45) : lerpC(BRIGHT, DEEP, (t - 0.45) / 0.55)
}

// Distancia a un segmento (cápsula de radio r).
function sdSegment(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay
  const denom = bax * bax + bay * bay
  const h = Math.min(1, Math.max(0, denom ? (pax * bax + pay * bay) / denom : 0))
  return Math.hypot(pax - bax * h, pay - bay * h) - r
}

// Mancuerna de la marca, escalada por s alrededor del centro (0.5, 0.5).
function dumbbellSDF(u, v, s) {
  const c = 0.5
  const k = (x) => c + (x - c) * s
  const r = 0.046 * s
  let d = sdSegment(u, v, k(0.271), k(0.5), k(0.729), k(0.5), r) // barra
  d = Math.min(d, sdSegment(u, v, k(0.271), k(0.375), k(0.271), k(0.625), r)) // poste interno izq
  d = Math.min(d, sdSegment(u, v, k(0.729), k(0.375), k(0.729), k(0.625), r)) // poste interno der
  d = Math.min(d, sdSegment(u, v, k(0.146), k(0.4375), k(0.146), k(0.5625), r)) // poste externo izq
  d = Math.min(d, sdSegment(u, v, k(0.854), k(0.4375), k(0.854), k(0.5625), r)) // poste externo der
  return d
}

function render(N, s) {
  const buf = Buffer.alloc(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N, v = (y + 0.5) / N
      const bg = bgColor(u, v)
      const dpx = dumbbellSDF(u, v, s) * N
      const cov = Math.min(1, Math.max(0, 0.5 - dpx)) // antialiasing de 1px
      const i = (y * N + x) * 4
      buf[i] = Math.round(lerp(bg[0], WHITE[0], cov))
      buf[i + 1] = Math.round(lerp(bg[1], WHITE[1], cov))
      buf[i + 2] = Math.round(lerp(bg[2], WHITE[2], cov))
      buf[i + 3] = 255 // opaco (recomendado para íconos instalables / maskable)
    }
  }
  return buf
}

const targets = [
  { file: 'icon-192.png', N: 192, s: 1.05 },
  { file: 'icon-512.png', N: 512, s: 1.05 },
  { file: 'icon-maskable-512.png', N: 512, s: 0.82 }, // contenido dentro de la zona segura
  { file: 'apple-touch-icon.png', N: 180, s: 1.05 },
]
for (const t of targets) {
  const png = encodePNG(t.N, t.N, render(t.N, t.s))
  writeFileSync(resolve(OUT, t.file), png)
  console.log('wrote', t.file, '-', png.length, 'bytes')
}
