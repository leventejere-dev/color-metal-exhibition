/**
 * Procedural canvas textures. Everything is generated at runtime so the
 * deployed site has no binary texture dependencies.
 */
import * as THREE from 'three'
import { rng } from './geo'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function finish(c: HTMLCanvasElement, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
type RGB = [number, number, number]
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/**
 * Sheet-metal panel texture: N vertical strips (one per tray between standing
 * seams) with per-tray tonal variation, faint vertical streaking and a thin
 * shadow line at each seam. Tiled with UVs in metres.
 */
export function panelTexture(opts: {
  seed: number
  strips?: number
  palette: string[]
  variation?: number
  streaks?: number
  seamShade?: number
  height?: number
}) {
  const strips = opts.strips ?? 32
  const W = 1024
  const H = opts.height ?? 512
  const { c, ctx } = canvas(W, H)
  const r = rng(opts.seed)
  const pal = opts.palette.map(hex)
  const sw = W / strips
  const img = ctx.createImageData(W, H)
  const variation = opts.variation ?? 0.08
  const streaks = opts.streaks ?? 0.05
  const seamShade = opts.seamShade ?? 0.8
  // per-strip base colour
  const stripCol: RGB[] = []
  const stripStreak: number[][] = []
  for (let s = 0; s < strips; s++) {
    const t = r()
    const i = Math.floor(t * (pal.length - 1))
    const f = t * (pal.length - 1) - i
    const base = mix(pal[i], pal[Math.min(i + 1, pal.length - 1)], f)
    const k = 1 + (r() - 0.5) * 2 * variation
    stripCol.push([base[0] * k, base[1] * k, base[2] * k])
    const st: number[] = []
    for (let x = 0; x < Math.ceil(sw); x++) st.push((r() - 0.5) * 2 * streaks)
    stripStreak.push(st)
  }
  // low-frequency vertical wash per strip
  const wash: number[][] = []
  for (let s = 0; s < strips; s++) {
    const a = r() * 6.28
    const f = 1 + r() * 2
    const row: number[] = []
    for (let y = 0; y < H; y++) row.push(Math.sin(a + (y / H) * 6.28 * f) * streaks * 0.8)
    wash.push(row)
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = Math.floor(x / sw)
      const lx = x - s * sw
      const col = stripCol[s]
      let k = 1 + stripStreak[s][Math.floor(lx)] + wash[s][y]
      if (lx < 1.2 || lx > sw - 1.2) k *= seamShade
      const o = (y * W + x) * 4
      img.data[o] = Math.min(255, col[0] * k)
      img.data[o + 1] = Math.min(255, col[1] * k)
      img.data[o + 2] = Math.min(255, col[2] * k)
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(c)
}

/** Fine noise used as roughness variation (linear). */
export function noiseTexture(seed: number, base = 200, amp = 40, size = 256) {
  const { c, ctx } = canvas(size, size)
  const r = rng(seed)
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const v = base + (r() - 0.5) * 2 * amp
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return finish(c, false)
}

/** Football pitch: mowing stripes, markings. UV 0..1 across 113 × 76 m (incl. run-off). */
export function pitchTexture() {
  const W = 1130
  const H = 760
  const { c, ctx } = canvas(W, H)
  const s = 10 // px per metre
  ctx.fillStyle = '#3d6b39'
  ctx.fillRect(0, 0, W, H)
  const ox = 4 * s
  const oy = 4 * s
  const pw = 105 * s
  const ph = 68 * s
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? '#457640' : '#3a6636'
    ctx.fillRect(ox + (i * pw) / 14, oy, pw / 14 + 1, ph)
  }
  ctx.strokeStyle = 'rgba(240,240,232,0.92)'
  ctx.lineWidth = 2.2
  ctx.strokeRect(ox, oy, pw, ph)
  ctx.beginPath()
  ctx.moveTo(ox + pw / 2, oy)
  ctx.lineTo(ox + pw / 2, oy + ph)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ox + pw / 2, oy + ph / 2, 9.15 * s, 0, Math.PI * 2)
  ctx.stroke()
  for (const side of [0, 1]) {
    const x = side ? ox + pw - 16.5 * s : ox
    ctx.strokeRect(x, oy + ph / 2 - 20.16 * s, 16.5 * s, 40.32 * s)
    const x2 = side ? ox + pw - 5.5 * s : ox
    ctx.strokeRect(x2, oy + ph / 2 - 9.16 * s, 5.5 * s, 18.32 * s)
  }
  return finish(c, true, false)
}

/** Seating rows for the stands (tiled in metres: 1 unit = 1 m). */
export function seatsTexture() {
  const { c, ctx } = canvas(64, 256)
  ctx.fillStyle = '#4d4c4f'
  ctx.fillRect(0, 0, 64, 256)
  const rows = 4
  for (let i = 0; i < rows; i++) {
    const y = (i * 256) / rows
    ctx.fillStyle = '#8c2f33'
    ctx.fillRect(0, y + 10, 64, 34)
    ctx.fillStyle = '#5f2124'
    ctx.fillRect(0, y + 40, 64, 6)
  }
  return finish(c)
}

/** Horizontal cladding lines (dark gable infills). */
export function linesTexture(base: string, line: string, perUnit = 3) {
  const { c, ctx } = canvas(64, 256)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 64, 256)
  ctx.fillStyle = line
  for (let i = 0; i < perUnit; i++) ctx.fillRect(0, (i * 256) / perUnit, 64, 3)
  return finish(c)
}

/** Glazing mullion grid (curtain walls). */
export function glazingTexture(cols = 1, rows = 2) {
  const { c, ctx } = canvas(256, 256)
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#4a5866')
  g.addColorStop(1, '#2d3640')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#7d8287'
  for (let i = 0; i <= cols; i++) ctx.fillRect((i * 256) / cols - 3, 0, 6, 256)
  for (let i = 0; i <= rows; i++) ctx.fillRect(0, (i * 256) / rows - 2, 256, 4)
  return finish(c)
}

/** Large radial gradient for the studio floor (fades into the background colour). */
export function floorTexture(center: string, edge: string, hold = 0.35, fade = 1) {
  const { c, ctx } = canvas(1024, 1024)
  const g = ctx.createRadialGradient(512, 512, 0, 512, 512, 512)
  g.addColorStop(0, center)
  g.addColorStop(hold, center)
  g.addColorStop(fade, edge)
  g.addColorStop(1, edge)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 1024)
  return finish(c, true, false)
}

/** Soft contact-shadow blob (alpha). */
export function blobTexture() {
  const { c, ctx } = canvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(0,0,0,0.85)')
  g.addColorStop(0.72, 'rgba(0,0,0,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return finish(c, false, false)
}

/** Normal map with fine vertical flutes for the cylindrical table body. */
export function flutingNormal(flutes = 1) {
  const W = 256
  const { c, ctx } = canvas(W, 4)
  const img = ctx.createImageData(W, 4)
  for (let x = 0; x < W; x++) {
    const t = ((x / W) * flutes) % 1
    // concave flute profile: slope of a half-cosine
    const slope = Math.sin(t * Math.PI * 2) * 0.55
    const nx = slope
    const nz = Math.sqrt(1 - nx * nx)
    for (let y = 0; y < 4; y++) {
      const o = (y * W + x) * 4
      img.data[o] = (nx * 0.5 + 0.5) * 255
      img.data[o + 1] = 128
      img.data[o + 2] = (nz * 0.5 + 0.5) * 255
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(c, false)
}

/** Brushed-metal streak texture (used as roughness map). */
export function brushedTexture(seed = 3, horizontal = true) {
  const W = 512
  const H = 512
  const { c, ctx } = canvas(W, H)
  const r = rng(seed)
  ctx.fillStyle = 'rgb(150,150,150)'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 2600; i++) {
    const v = 110 + r() * 90
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`
    if (horizontal) ctx.fillRect(0, r() * H, W, 1 + r())
    else ctx.fillRect(r() * W, 0, 1 + r(), H)
  }
  return finish(c, false)
}

/** Load the official logo SVG and rasterise it on a transparent canvas. */
export async function logoTexture(url: string, opts: { width?: number; tagline?: string; taglineColor?: string; tint?: string } = {}) {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  const W = opts.width ?? 2048
  const logoH = (W * 47.5) / 537
  const tag = opts.tagline ? logoH * 0.62 : 0
  const pad = W * 0.02
  const { c, ctx } = canvas(W + pad * 2, Math.ceil(logoH + tag + pad * 2))
  ctx.drawImage(img, pad, pad, W, logoH)
  if (opts.tint) {
    // single-colour logo variant (brand book: black on gold, white on black)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = opts.tint
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.globalCompositeOperation = 'source-over'
  }
  if (opts.tagline) {
    try {
      await document.fonts.load(`${opts.tint ? 600 : 500} ${Math.round(logoH * 0.26)}px Montserrat`)
    } catch {
      /* fall back to system font */
    }
    ctx.fillStyle = opts.taglineColor ?? '#939598'
    ctx.font = `${opts.tint ? 600 : 500} ${Math.round(logoH * 0.26)}px Montserrat, Arial, sans-serif`
    ctx.textBaseline = 'top'
    const text = opts.tagline
    // letter-spaced, justified under the full logo width
    const chars = [...text]
    const widths = chars.map((ch) => ctx.measureText(ch).width)
    const total = widths.reduce((a, b) => a + b, 0)
    const gap = (W - total) / (chars.length - 1)
    let x = pad
    const y = pad + logoH + logoH * 0.3
    chars.forEach((ch, i) => {
      ctx.fillText(ch, x, y)
      x += widths[i] + gap
    })
  }
  const t = finish(c, true, false)
  return { texture: t, aspect: c.width / c.height }
}

/** Engraved plaque / label text. */
export async function labelTexture(lines: { text: string; size: number; weight?: number; color: string; spacing?: number }[], w = 1024, h = 256, bg?: string) {
  try {
    await Promise.all(lines.map((l) => document.fonts.load(`${l.weight ?? 500} ${l.size}px Montserrat`)))
  } catch {
    /* ignore */
  }
  const { c, ctx } = canvas(w, h)
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
  }
  const totalH = lines.reduce((a, l) => a + l.size * 1.45, 0)
  let y = (h - totalH) / 2
  for (const l of lines) {
    ctx.font = `${l.weight ?? 500} ${l.size}px Montserrat, Arial, sans-serif`
    ctx.fillStyle = l.color
    ctx.textBaseline = 'top'
    const sp = l.spacing ?? 0.18
    const chars = [...l.text]
    const widths = chars.map((ch) => ctx.measureText(ch).width + l.size * sp)
    const total = widths.reduce((a, b) => a + b, 0) - l.size * sp
    let x = (w - total) / 2
    chars.forEach((ch, i) => {
      ctx.fillText(ch, x, y)
      x += widths[i]
    })
    y += l.size * 1.45
  }
  return finish(c, true, false)
}

/** Mottled verdigris (patinated copper) colour map. */
export function patinaTexture(seed = 71) {
  const S = 512
  const { c, ctx } = canvas(S, S)
  const r = rng(seed)
  ctx.fillStyle = '#6f907d'
  ctx.fillRect(0, 0, S, S)
  const blot = (col: string, n: number, rMin: number, rMax: number, a: number) => {
    for (let i = 0; i < n; i++) {
      const x = r() * S
      const y = r() * S
      const rad = rMin + r() * (rMax - rMin)
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, col.replace('A', String(a)))
      g.addColorStop(1, col.replace('A', '0'))
      ctx.fillStyle = g
      // draw wrapped so the texture tiles seamlessly
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) ctx.fillRect(x - rad + dx, y - rad + dy, rad * 2, rad * 2)
    }
  }
  blot('rgba(140,178,158,A)', 70, 20, 90, 0.45)
  blot('rgba(78,108,92,A)', 60, 15, 70, 0.4)
  blot('rgba(120,98,70,A)', 18, 8, 30, 0.3)
  blot('rgba(170,200,182,A)', 120, 2, 8, 0.5)
  // faint vertical run-off streaks
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? '60,90,76' : '150,185,166'},${0.05 + r() * 0.08})`
    ctx.fillRect(r() * S, 0, 1 + r() * 3, S)
  }
  return finish(c)
}
