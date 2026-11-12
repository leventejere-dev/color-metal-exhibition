/**
 * Procedural textures for the Satu Mare parking garage (brick plinth,
 * perforated brick screen, expanded-metal mesh, formwork concrete) and the
 * landscape print on the stadium backdrop. Generated at runtime like the rest.
 */
import * as THREE from 'three'
import { rng } from './geo'

type RGB = [number, number, number]

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function finish(c: HTMLCanvasElement, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgb = (c: RGB, k = 1) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`

/**
 * Yellow-ochre clinker brick, running bond. One tile = 2.0 m × 1.2 m
 * (8 bricks of 250 mm × 16 courses of 75 mm). With `lattice`, the bricks form a
 * perforated screen: one continuous course in four, short piers between
 * openings, staggered from band to band — as on the plinth of the car park.
 */
export function brickTexture(seed = 81, lattice = false) {
  const W = 512
  const H = 512
  const { c, ctx } = canvas(W, H)
  const r = rng(seed)
  const pal = ['#e4a73c', '#dc9e35', '#e9b047', '#d89838', '#e6ab41', '#dea43a'].map(hex)
  ctx.fillStyle = '#d3c7b0'
  ctx.fillRect(0, 0, W, H)
  const courses = 16
  const ch = H / courses
  const bw = W / 8
  const j = 3
  const brick = (x: number, y: number, w: number, h: number) => {
    const col = mix(pal[Math.floor(r() * pal.length)], pal[Math.floor(r() * pal.length)], r())
    const k = 0.93 + r() * 0.12
    for (const dx of [-W, 0, W]) {
      ctx.fillStyle = rgb(col, k)
      ctx.fillRect(x + j / 2 + dx, y + j / 2, w - j, h - j)
      ctx.fillStyle = 'rgba(255,240,200,0.10)'
      ctx.fillRect(x + j / 2 + dx, y + j / 2, w - j, 2)
    }
  }
  if (!lattice) {
    for (let row = 0; row < courses; row++) {
      const off = row % 2 ? bw / 2 : 0
      for (let i = 0; i < 8; i++) brick(i * bw + off, row * ch, bw, ch)
    }
    return finish(c)
  }
  const period = W / 6 // 0.333 m: ~0.21 m opening + ~0.125 m pier
  const pier = period * 0.38
  for (let band = 0; band < courses / 4; band++) {
    const y0 = band * 4 * ch
    const off = band % 2 ? bw / 2 : 0
    for (let i = 0; i < 8; i++) brick(i * bw + off, y0, bw, ch)
    const shift = band % 2 ? period / 2 : 0
    for (let i = 0; i < 6; i++) {
      const x = i * period + shift
      for (let k = 1; k < 4; k++) brick(x, y0 + k * ch, pier, ch)
      const ox = x + pier
      const ow = period - pier
      for (const dx of [-W, 0, W]) {
        // opening: deep shadow with a sunlit sill
        ctx.fillStyle = '#2d241b'
        ctx.fillRect(ox + dx + 1, y0 + ch + 1, ow - 2, 3 * ch - 2)
        ctx.fillStyle = 'rgba(214,150,60,0.55)'
        ctx.fillRect(ox + dx + 1, y0 + 4 * ch - 9, ow - 2, 7)
      }
    }
  }
  return finish(c)
}

/**
 * Expanded-metal diamond pattern (one diamond per tile, long way horizontal).
 * `alpha`: white strands on black (alphaMap). Otherwise the gold colour map,
 * in which the two strand directions catch the light differently.
 */
export function expandedMeshTexture(alpha: boolean) {
  const W = 256
  const H = 128
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = alpha ? '#000' : '#c99a3b'
  ctx.fillRect(0, 0, W, H)
  const lines = [
    { a: [0, H / 2], b: [W / 2, 0], fam: 0 },
    { a: [W / 2, H], b: [W, H / 2], fam: 0 },
    { a: [W / 2, 0], b: [W, H / 2], fam: 1 },
    { a: [0, H / 2], b: [W / 2, H], fam: 1 },
  ]
  ctx.lineCap = 'round'
  for (const dx of [-W, 0, W]) {
    for (const dy of [-H, 0, H]) {
      for (const l of lines) {
        ctx.strokeStyle = alpha ? '#fff' : l.fam === 0 ? '#ebbd55' : '#b5862c'
        ctx.lineWidth = 21
        ctx.beginPath()
        ctx.moveTo(l.a[0] + dx, l.a[1] + dy)
        ctx.lineTo(l.b[0] + dx, l.b[1] + dy)
        ctx.stroke()
      }
      // bonds (knuckles) where the strands meet
      ctx.fillStyle = alpha ? '#fff' : '#d8a945'
      for (const [x, y] of [
        [0, H / 2],
        [W, H / 2],
      ]) {
        ctx.beginPath()
        ctx.ellipse(x + dx, y + dy, 26, 15, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  return finish(c, !alpha)
}

/** Raw concrete with formwork panel joints and tie holes. Tile = 5.0 m × 2.5 m. */
export function formworkTexture(seed = 91) {
  const W = 512
  const H = 256
  const { c, ctx } = canvas(W, H)
  const r = rng(seed)
  ctx.fillStyle = '#b4b2ac'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 2; k++) {
      const v = 190 + (r() - 0.5) * 14
      ctx.fillStyle = `rgb(${v | 0},${(v - 1) | 0},${(v - 5) | 0})`
      ctx.fillRect(i * 128 + 1, k * 128 + 1, 126, 126)
    }
  }
  for (let i = 0; i < 900; i++) {
    const v = 150 + r() * 90
    ctx.fillStyle = `rgba(${v | 0},${v | 0},${(v - 4) | 0},0.25)`
    ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2)
  }
  ctx.fillStyle = 'rgba(90,88,84,0.55)'
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 2; k++)
      for (const [fx, fy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        ctx.beginPath()
        ctx.arc(i * 128 + fx * 128, k * 128 + fy * 128, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
  return finish(c)
}

/** Roller-shutter slats (white, horizontal). Tile = 1 m × 1 m. */
export function shutterTexture() {
  const { c, ctx } = canvas(64, 256)
  ctx.fillStyle = '#eceded'
  ctx.fillRect(0, 0, 64, 256)
  for (let i = 0; i < 14; i++) {
    const y = (i * 256) / 14
    ctx.fillStyle = 'rgba(120,126,132,0.55)'
    ctx.fillRect(0, y, 64, 2)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(0, y + 2, 64, 2)
  }
  return finish(c)
}

/**
 * Painted landscape print for the stadium backdrop, after the aerial photo of
 * the surroundings: flat farmland in green, ochre and ploughed-brown strips,
 * tree belts, villages with red roofs and a hazy horizon under a light sky.
 */
export function landscapeTexture(seed = 17) {
  const W = 2048
  const H = 560
  const { c, ctx } = canvas(W, H)
  const r = rng(seed)
  const hz = H * 0.36 // horizon line
  const sky = ctx.createLinearGradient(0, 0, 0, hz)
  sky.addColorStop(0, '#a9c3dc')
  sky.addColorStop(0.65, '#d3e0ea')
  sky.addColorStop(1, '#eef0ee')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, hz + 2)
  // soft clouds
  for (let i = 0; i < 26; i++) {
    const x = r() * W
    const y = hz * (0.12 + r() * 0.55)
    const rw = 60 + r() * 160
    const g = ctx.createRadialGradient(x, y, 0, x, y, rw)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, 0.32)
    ctx.translate(-x, -y)
    ctx.fillStyle = g
    ctx.fillRect(x - rw, y - rw, rw * 2, rw * 2)
    ctx.restore()
  }
  // farmland: bands widening towards the viewer, fields converging on a vanishing point
  const palette = ['#7d9a47', '#91ab57', '#6b8a3e', '#a3b863', '#c1b27e', '#b4a26c', '#8c7556', '#9b8762', '#83a04f'].map(hex)
  const mist = hex('#e6e9e4')
  const vpx = W * 0.52
  let y = hz
  let band = 0
  while (y < H) {
    const t = (y - hz) / (H - hz)
    const bh = 4 + t * t * 110 + r() * (3 + t * 30)
    const y0 = y
    const sx = (xx: number, yy: number) => vpx + (xx - vpx) * ((yy - hz + 3) / (y0 - hz + 3))
    let x = -260 - r() * 200
    while (x < W + 260) {
      const fw = (180 + r() * 420) * (0.35 + t * 1.3)
      const col = mix(palette[Math.floor(r() * palette.length)], mist, Math.max(0, 1 - t * 2.2) * 0.55)
      ctx.fillStyle = rgb(col, 0.96 + r() * 0.08)
      ctx.beginPath()
      ctx.moveTo(sx(x, y0), y0)
      ctx.lineTo(sx(x + fw, y0), y0)
      ctx.lineTo(sx(x + fw, y0 + bh), y0 + bh + 0.5)
      ctx.lineTo(sx(x, y0 + bh), y0 + bh + 0.5)
      ctx.closePath()
      ctx.fill()
      if (t > 0.2 && r() > 0.35) {
        // crop rows
        ctx.strokeStyle = r() > 0.5 ? 'rgba(255,255,235,0.08)' : 'rgba(60,70,40,0.08)'
        ctx.lineWidth = 1
        const n = Math.floor(fw / 14)
        for (let k = 0; k < n; k++) {
          const xx = x + (k / n) * fw
          ctx.beginPath()
          ctx.moveTo(sx(xx, y0), y0)
          ctx.lineTo(sx(xx, y0 + bh), y0 + bh)
          ctx.stroke()
        }
      }
      x += fw
    }
    // tree belts along some field edges
    if (band % 3 === 1 || r() > 0.75) {
      const th = 2 + t * 26
      const x0 = r() * W - 200
      const len = 300 + r() * 900
      for (let tx = x0; tx < x0 + len; tx += 3 + t * 9) {
        const rr = th * (0.5 + r() * 0.7)
        ctx.fillStyle = rgb(mix(hex('#3f5a2c'), mist, Math.max(0, 1 - t * 2.4) * 0.5), 0.85 + r() * 0.3)
        ctx.beginPath()
        ctx.ellipse(tx, y0 - rr * 0.5, rr * 0.8, rr, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    y += bh
    band++
  }
  // villages (white walls, red roofs) in the middle distance
  const village = (cx: number, cy: number, n: number, s: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * s * 22
      const yy = cy + (r() - 0.5) * s * 2.2
      const w = s * (1.6 + r() * 1.8)
      const h = s * (0.9 + r() * 0.6)
      ctx.fillStyle = rgb(hex('#eceae4'), 0.9 + r() * 0.1)
      ctx.fillRect(x, yy - h, w, h)
      ctx.fillStyle = rgb(r() > 0.3 ? hex('#b75a3e') : hex('#8a8f94'), 0.9 + r() * 0.15)
      ctx.beginPath()
      ctx.moveTo(x - s * 0.15, yy - h)
      ctx.lineTo(x + w / 2, yy - h - s * 0.75)
      ctx.lineTo(x + w + s * 0.15, yy - h)
      ctx.fill()
      if (r() > 0.6) {
        ctx.fillStyle = rgb(hex('#4d6a33'), 0.9 + r() * 0.2)
        ctx.beginPath()
        ctx.arc(x + w + s, yy - s * 0.8, s * (0.8 + r() * 0.6), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  village(W * 0.8, hz + 22, 40, 6)
  village(W * 0.16, hz + 12, 22, 4)
  village(W * 0.47, hz + 6, 14, 3)
  // atmospheric haze along the horizon
  const hzG = ctx.createLinearGradient(0, hz - 30, 0, hz + 90)
  hzG.addColorStop(0, 'rgba(238,240,238,0)')
  hzG.addColorStop(0.3, 'rgba(238,240,238,0.55)')
  hzG.addColorStop(1, 'rgba(238,240,238,0)')
  ctx.fillStyle = hzG
  ctx.fillRect(0, hz - 30, W, 120)
  return finish(c, true, false)
}

/**
 * Edge of an aluminium-honeycomb sandwich panel: light top skin, hexagonal
 * aluminium core, grey bottom skin. u: 1 tile = 40 mm along the edge; v: 0…1 across.
 */
export function honeycombTexture() {
  const W = 128
  const H = 128
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = '#6e7174'
  ctx.fillRect(0, 0, W, H)
  // core: hexagon walls seen edge-on (vertical cell walls with slanted facets)
  const y0 = 22
  const y1 = H - 18
  ctx.fillStyle = '#b9bdc1'
  ctx.fillRect(0, y0, W, y1 - y0)
  ctx.strokeStyle = '#7b7f84'
  ctx.lineWidth = 3
  for (const x of [0, 32, 64, 96, 128]) {
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(70,74,78,0.5)'
  ctx.lineWidth = 2
  for (const x of [16, 48, 80, 112]) {
    ctx.beginPath()
    ctx.moveTo(x - 8, y0)
    ctx.lineTo(x + 8, y1)
    ctx.stroke()
  }
  // skins
  ctx.fillStyle = '#e4e0d8'
  ctx.fillRect(0, 0, W, y0 - 4)
  ctx.fillStyle = '#a7a39b'
  ctx.fillRect(0, y0 - 4, W, 4)
  ctx.fillStyle = '#8d9094'
  ctx.fillRect(0, y1, W, H - y1)
  const t = finish(c)
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
